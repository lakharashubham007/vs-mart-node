const User = require('../users/user.model');
const PushNotificationHistory = require('./pushNotificationHistory.model');
const fcmService = require('../../utils/fcmService');

/**
 * POST /private/push-notifications/send
 *
 * Body: { title, message, userIds?, topic? }
 *
 * - If topic provided → send to topic (e.g. "all_users", "offers")
 * - If userIds provided → send to those specific users
 * - If neither → send to ALL users (broadcast)
 */
exports.sendPushNotification = async (req, res) => {
    try {
        const { title, message, userIds, topic, screen, orderId, offerId, productId, userId } = req.body;

        if (!title || !message) {
            return res.status(400).json({ success: false, message: 'Title and message are required' });
        }

        // Build data payload — always include screen for navigation routing
        const data = {
            type: 'PROMOTIONAL',
            screen: screen || 'Notification',  // maps to NavigationService screen names
            ...(orderId   ? { orderId }   : {}),
            ...(offerId   ? { offerId }   : {}),
            ...(productId ? { productId } : {}),
            ...(userId    ? { userId }    : {}),
        };

        let result = {};
        let targetUsers = [];

        // ── Topic send ─────────────────────────────────────────
        if (topic) {
            result = await fcmService.sendToTopic(topic, title, message, data);

            await PushNotificationHistory.create({
                title,
                message,
                targetType: 'topic',
                topic,
                sentBy: req.user?._id,
                successCount: result.success ? 1 : 0,
                failureCount: result.success ? 0 : 1,
                screen:    screen    || 'Notification',
                orderId:   orderId   || null,
                offerId:   offerId   || null,
                productId: productId || null,
            });

            return res.json({
                success: true,
                message: `Notification sent to topic: ${topic}`,
                result,
            });
        }

        // ── User-specific or broadcast ─────────────────────────
        let query = { fcmToken: { $exists: true, $ne: null }, isDeleted: false };

        if (userIds && Array.isArray(userIds) && userIds.length > 0) {
            query._id = { $in: userIds };
        }

        targetUsers = await User.find(query).select('_id fcmToken').lean();
        const allTokens = targetUsers.map(u => u.fcmToken).filter(Boolean);
        const tokens = [...new Set(allTokens)];

        if (tokens.length < allTokens.length) {
            console.log(`[PushController] Deduplicated ${allTokens.length} tokens down to ${tokens.length} unique devices`);
        }

        if (tokens.length === 0) {
            return res.json({
                success: true,
                message: 'No users with FCM tokens found',
                result: { successCount: 0, failureCount: 0 },
            });
        }

        // Single vs multicast
        if (tokens.length === 1) {
            const singleResult = await fcmService.sendToToken(tokens[0], title, message, data);
            result = {
                successCount: singleResult.success ? 1 : 0,
                failureCount: singleResult.success ? 0 : 1,
                invalidTokens: singleResult.invalidToken ? [tokens[0]] : [],
            };
        } else {
            result = await fcmService.sendToMultipleTokens(tokens, title, message, data);
        }

        // Clear invalid tokens from DB to keep data clean
        if (result.invalidTokens?.length > 0) {
            await User.updateMany(
                { fcmToken: { $in: result.invalidTokens } },
                { $set: { fcmToken: null } }
            );
            console.log(`[PushController] Cleared ${result.invalidTokens.length} invalid FCM tokens from DB`);
        }

        // Save history
        await PushNotificationHistory.create({
            title,
            message,
            targetType: userIds?.length > 0 ? 'selected' : 'all',
            targetUsers: targetUsers.map(u => u._id),
            sentBy: req.user?._id,
            successCount: result.successCount,
            failureCount: result.failureCount,
            screen:    screen    || 'Notification',
            orderId:   orderId   || null,
            offerId:   offerId   || null,
            productId: productId || null,
        });

        return res.json({
            success: true,
            message: `Notification sent: ${result.successCount} delivered, ${result.failureCount} failed`,
            result,
        });
    } catch (error) {
        console.error('[PushController] sendPushNotification error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /private/push-notifications/history
 * Returns the last 100 sent push notifications (admin view)
 */
exports.getPushHistory = async (req, res) => {
    try {
        const history = await PushNotificationHistory.find()
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('sentBy', 'name email')
            .lean();

        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /private/push-notifications/history/:id/recipients
 * Returns the list of users who were targeted in this notification.
 */
exports.getHistoryRecipients = async (req, res) => {
    try {
        const history = await PushNotificationHistory.findById(req.params.id)
            .populate('targetUsers', 'name phone')
            .lean();

        if (!history) {
            return res.status(404).json({ success: false, message: 'History record not found' });
        }

        res.json({
            success: true,
            recipients: history.targetUsers || []
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
