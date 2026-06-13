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
        let Model;
        let targetRole = role;

        switch (role) {
            case 'user': case 'customer': Model = User; targetRole = 'user'; break;
            case 'admin': case 'super_admin': Model = Admin; targetRole = 'admin'; break;
            case 'delivery_boy': case 'delivery': Model = DeliveryBoy; targetRole = 'delivery_boy'; break;
            default: throw new Error(`Invalid role: ${role}`);
        }

        // 1. Fetch User (Tokens + Name)
        const user = await Model.findById(userId).select('fcmTokens name').lean();
        if (!user) return;

        // 2. Save to DB History (Source of Truth)
        const notificationEntry = await Notification.create({
            userId, title, message: body,
            type: data.type || 'SYSTEM',
            relatedId: data.orderId || data.relatedId,
            targetRole, senderId, senderName, senderRole
        });

        // 3. SMART SWITCH: Socket vs FCM
        const isOnline = socketService.isUserConnected(userId);

        if (isOnline) {
            // Priority: WebSocket (Low Latency, No Cost)
            socketService.emitToUser(userId, 'new_notification', notificationEntry);
            console.log(`✅ [SmartSwitch] Socket used for ${role} ${userId} (Online)`);
        } else if (user.fcmTokens?.length > 0) {
            // Fallback: FCM (Background/Closed App)
            const result = await fcmService.sendToMultipleTokens(user.fcmTokens, title, body, {
                ...data, notificationId: notificationEntry._id.toString()
            });
            console.log(`📡 [SmartSwitch] FCM used for ${role} ${userId} (Offline)`);

            // Cleanup invalid tokens
            if (result.invalidTokens?.length > 0) {
                await Model.findByIdAndUpdate(userId, { $pull: { fcmTokens: { $in: result.invalidTokens } } });
            }
        }

        return notificationEntry;
    } catch (error) {
        console.error(`🚨 [NotificationHub] Error:`, error.message);
    }
};

exports.notifyAllAdmins = async ({ title, body, data = {}, senderId = null, senderName = 'System', senderRole = 'system' }) => {
    try {
        const Role = require('../modules/roles/role.model');
        const Admin = require('../modules/admins/admin.model');

        // 1. Target Management Roles
        const targetRoles = await Role.find({ name: { $regex: /^(super\s*admin|admin|shop\s*admin)$/i } }).select('_id').lean();
        const admins = await Admin.find({ roleId: { $in: targetRoles.map(r => r._id) }, status: true }).select('_id fcmTokens').lean();

        if (admins.length === 0) return;

        // 2. Broadcast ONCE via Socket (Live UI update for all online admins)
        socketService.broadcastToAdmin('new_notification', { title, message: body, ...data, senderName });

        // 3. Send FCM to admins who are OFFLINE
        const offlineAdmins = admins.filter(admin => !socketService.isUserConnected(admin._id) && admin.fcmTokens?.length > 0);
        
        if (offlineAdmins.length > 0) {
            const pushPromises = offlineAdmins.map(admin => 
                fcmService.sendToMultipleTokens(admin.fcmTokens, title, body, data).catch(() => {})
            );
            await Promise.all(pushPromises);
        }

        // Note: For history, we save ONE entry for the system log or individual if specific tracking needed.
        // For VS Mart, we save to the triggering admin's history or just the "System" notification log.
    } catch (error) {
        console.error(`🚨 [NotificationHub] notifyAllAdmins Error:`, error.message);
    }
};

