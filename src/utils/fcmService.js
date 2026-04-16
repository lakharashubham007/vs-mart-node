/**
 * fcmService.js — Backend Firebase Admin SDK
 *
 * Every message ALWAYS sends BOTH:
 *  - notification  → { title, body }  ← makes Firebase show in status bar (background/killed)
 *  - data          → { screen, ...params } ← read by the app to navigate on tap
 *
 * Screen routing contract (must match NavigationService.ts):
 *   screen: 'OrderDetails'  → params: orderId
 *   screen: 'OfferDetails'  → params: offerId
 *   screen: 'ProductDetails'→ params: productId
 *   screen: 'Notification'  → no extra params
 *   screen: 'MyOrders'      → no extra params
 */

const admin = require('firebase-admin');
const path = require('path');

let initialized = false;

const initFirebase = () => {
    if (initialized) return true;
    const keyPath = path.join(__dirname, '../../serviceAccountKey.json');
    try {
        const serviceAccount = require(keyPath);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        initialized = true;
        console.log('✅ [FCMService] Firebase Admin initialized');
        return true;
    } catch (err) {
        console.warn('⚠️  [FCMService] serviceAccountKey.json missing — push disabled');
        return false;
    }
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Sanitize data object: FCM data values must ALL be strings.
 * Strips undefined/null values to prevent FCM rejection.
 */
const sanitizeData = (data = {}) =>
    Object.fromEntries(
        Object.entries(data)
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)])
    );

/**
 * Build the Android-specific config block.
 * Uses fcm_fallback_notification_channel (auto-created by Firebase on all devices).
 */
const androidConfig = (title, body) => ({
    priority: 'high',
    notification: {
        title: title,
        body: body,
        channelId: 'fcm_fallback_notification_channel',
        sound: 'default',
        icon: 'ic_launcher',
        color: '#1A6B3A',
        visibility: 'public',
        notificationPriority: 'priority_max', // Ensured priority is max for heads-up alerts
    },
});

// ── Single Token ──────────────────────────────────────────────────────────────

/**
 * Send to a SINGLE device.
 *
 * @param {string} fcmToken   - Device FCM token
 * @param {string} title      - Notification title
 * @param {string} body       - Notification body
 * @param {object} data       - Custom data payload:
 *   { screen, orderId?, offerId?, productId?, userId?, type?, ... }
 * @returns {{ success, messageId?, error?, invalidToken? }}
 */
const sendToToken = async (fcmToken, title, body, data = {}) => {
    if (!initialized) return { success: false, error: 'Firebase not initialized' };
    if (!fcmToken)    return { success: false, error: 'No FCM token provided' };

    try {
        const messageId = await admin.messaging().send({
            token: fcmToken,
            notification: { title, body },
            data: sanitizeData(data),
            android: androidConfig(title, body),
        });
        return { success: true, messageId };
    } catch (err) {
        const isInvalidToken =
            err.code === 'messaging/registration-token-not-registered' ||
            err.code === 'messaging/invalid-registration-token';
        return { success: false, error: err.message, invalidToken: isInvalidToken };
    }
};

// ── Multicast (multiple tokens) ───────────────────────────────────────────────

/**
 * Send to MULTIPLE devices.
 * Automatically batches in groups of 500 (FCM limit).
 *
 * @param {string[]} fcmTokens
 * @param {string}   title
 * @param {string}   body
 * @param {object}   data  — same contract as sendToToken
 * @returns {{ successCount, failureCount, invalidTokens[] }}
 */
const sendToMultipleTokens = async (fcmTokens, title, body, data = {}) => {
    if (!initialized) return { successCount: 0, failureCount: 0, invalidTokens: [] };
    if (!fcmTokens?.length) return { successCount: 0, failureCount: 0, invalidTokens: [] };

    const batches = [];
    for (let i = 0; i < fcmTokens.length; i += 500) {
        batches.push(fcmTokens.slice(i, i + 500));
    }

    let successCount = 0;
    let failureCount = 0;
    const invalidTokens = [];

    for (const batch of batches) {
        try {
            console.log("Target tokens:", batch); // User trace log
            const response = await admin.messaging().sendEachForMulticast({
                tokens: batch,
                notification: { title, body },
                data: sanitizeData(data),
                android: androidConfig(title, body),
            });
            console.log("FCM response:", JSON.stringify(response)); // User trace log

            successCount += response.successCount;
            failureCount += response.failureCount;

            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const code = resp.error?.code;
                    console.warn(`[FCMService] Individual failure for token ${batch[idx].slice(-6)}:`, resp.error?.message);
                    if (
                        code === 'messaging/registration-token-not-registered' ||
                        code === 'messaging/invalid-registration-token'
                    ) {
                        invalidTokens.push(batch[idx]);
                    }
                }
            });
        } catch (err) {
            console.error('[FCMService] Multicast batch error:', err.message);
            failureCount += batch.length;
        }
    }

    return { successCount, failureCount, invalidTokens };
};

// ── Topic Subscription ────────────────────────────────────────────────────────

const subscribeToTopic = async (fcmTokens, topic) => {
    if (!initialized || !fcmTokens?.length) return;
    try {
        await admin.messaging().subscribeToTopic(fcmTokens, topic);
        console.log(`[FCMService] ${fcmTokens.length} tokens subscribed to topic: ${topic}`);
    } catch (err) {
        console.error('[FCMService] subscribeToTopic error:', err.message);
    }
};

// ── Topic Broadcast ───────────────────────────────────────────────────────────

/**
 * Send to an entire FCM topic (e.g. 'offers', 'all_users').
 *
 * @param {string} topic
 * @param {string} title
 * @param {string} body
 * @param {object} data — same contract as sendToToken
 */
const sendToTopic = async (topic, title, body, data = {}) => {
    if (!initialized) return { success: false, error: 'Firebase not initialized' };
    try {
        const messageId = await admin.messaging().send({
            topic,
            notification: { title, body },
            data: sanitizeData(data),
            android: androidConfig(title, body),
        });
        return { success: true, messageId };
    } catch (err) {
        console.error('[FCMService] sendToTopic error:', err.message);
        return { success: false, error: err.message };
    }
};

// ── Init ──────────────────────────────────────────────────────────────────────
initFirebase();

module.exports = {
    sendToToken,
    sendToMultipleTokens,
    subscribeToTopic,
    sendToTopic,
    isInitialized: () => initialized,
};
