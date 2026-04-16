/**
 * NotificationService.js
 * 
 * Centralized service for role-based push notifications and socket events.
 * Handles automatic cleanup of stale/invalid FCM tokens.
 */

const User = require('../modules/users/user.model');
const Admin = require('../modules/admins/admin.model');
const DeliveryBoy = require('../modules/deliveryBoy/deliveryBoy.model');
const Notification = require('../modules/notifications/notification.model');
const fcmService = require('../utils/fcmService');
const socketService = require('../utils/socketService');

/**
 * Send a notification to a specific user by ID and role.
 * 
 * @param {Object} params
 * @param {string} params.userId     - Target User ID
 * @param {string} params.role       - user | admin | delivery_boy
 * @param {string} params.title      - Notification title
 * @param {string} params.body       - Notification text
 * @param {Object} params.data       - Custom data payload (screen, orderId, etc.)
 * @param {string} params.senderId   - (Optional) ID of who triggered the notification
 * @param {string} params.senderRole - (Optional) Role of the sender
 */
exports.sendNotification = async ({
    userId,
    role,
    title,
    body,
    data = {},
    senderId = null,
    senderName = 'System',
    senderRole = 'system'
}) => {
    try {
        // 1. Determine Model based on Role
        let Model;
        let targetRole = role; // Default for Notification entry

        switch (role) {
            case 'user':
            case 'customer':
                Model = User;
                targetRole = 'user';
                break;
            case 'admin':
            case 'super_admin':
                Model = Admin;
                targetRole = 'admin';
                break;
            case 'delivery_boy':
            case 'delivery':
                Model = DeliveryBoy;
                targetRole = 'delivery_boy';
                break;
            default:
                throw new Error(`Invalid role: ${role}`);
        }

        // 2. Fetch User and Tokens
        const user = await Model.findById(userId).select('fcmTokens name').lean();
        if (!user) {
            console.warn(`[NotificationService] Target ${role} not found: ${userId}`);
            return;
        }

        // 3. Save to In-App Notification History
        const notificationEntry = await Notification.create({
            userId,
            title,
            message: body,
            type: data.type || 'SYSTEM',
            relatedId: data.orderId || data.relatedId,
            targetRole,
            senderId,
            senderName,
            senderRole
        });

        // 4. Emit via Socket (Real-time in-app update)
        if (targetRole === 'admin') {
            socketService.broadcastToAdmin('new_notification', notificationEntry);
        } else {
            socketService.emitToUser(userId, 'new_notification', notificationEntry);
        }

        // 5. Send via FCM if tokens exist
        const tokens = user.fcmTokens || [];
        if (tokens.length > 0) {
            console.log(`📡 [NotificationService] Sending to ${role} (${userId}) | Tokens: ${tokens.length}`);
            
            const result = await fcmService.sendToMultipleTokens(tokens, title, body, {
                ...data,
                notificationId: notificationEntry._id.toString()
            });

            // 6. AUTO-CLEANUP: Remove invalid tokens reported by FCM
            if (result.invalidTokens && result.invalidTokens.length > 0) {
                console.warn(`🧹 [NotificationService] Removing ${result.invalidTokens.length} stale tokens for ${role} ${userId}`);
                await Model.findByIdAndUpdate(userId, {
                    $pull: { fcmTokens: { $in: result.invalidTokens } }
                });
            }

            return result;
        } else {
            console.log(`ℹ️ [NotificationService] No FCM tokens for ${role} ${userId}. Skip push.`);
            return { successCount: 0, failureCount: 0 };
        }

    } catch (error) {
        console.error(`🚨 [NotificationService] Error sending to ${role} ${userId}:`, error.message);
        throw error;
    }
};
