const admin = require('firebase-admin');
const Admin = require('../admins/admin.model');
const DeliveryBoy = require('../deliveryBoy/deliveryBoy.model');
const User = require('../users/user.model');
const mongoose = require('mongoose');

/**
 * Robust FCM Token Management Service
 */

/**
 * Adds a token to a specific user's fcmTokens array.
 * Ensures the token is removed from any other profile (Role Switch Safety).
 */
exports.addToken = async (userId, role, token) => {
    if (!token || token === '') return;
    
    console.log(`📡 [FCM Service] Adding token for ${role} ${userId}: ${token.slice(-6)}`);

    try {
        // 1. ROLE SWITCH SAFETY: Remove this token from ALL collections first
        await exports.removeTokenGlobally(token);

        // 2. Determine Model based on role
        let Model;
        switch (role.toLowerCase()) {
            case 'admin': Model = Admin; break;
            case 'delivery boy':
            case 'deliveryboy': Model = DeliveryBoy; break;
            default: Model = User;
        }

        // 3. Add to set (ensures no duplicates)
        await Model.updateOne(
            { _id: userId },
            { 
                $addToSet: { fcmTokens: token },
                $set: { fcmToken: token } // Keep singular for backward compatibility
            }
        );
        
        console.log(`✅ [FCM Service] Token bound to ${role}`);
    } catch (error) {
        console.error('🚨 [FCM Service] Failed to add token:', error);
    }
};

/**
 * Removes a specific token from a specific user's profile.
 */
exports.removeToken = async (userId, role, token) => {
    if (!token || token === '') return;
    
    console.log(`🗑️ [FCM Service] Removing token for ${role} ${userId}: ${token.slice(-6)}`);

    try {
        let Model;
        switch (role.toLowerCase()) {
            case 'admin': Model = Admin; break;
            case 'delivery boy':
            case 'deliveryboy': Model = DeliveryBoy; break;
            default: Model = User;
        }

        await Model.updateOne(
            { _id: userId },
            { 
                $pull: { fcmTokens: token },
                $set: { fcmToken: null } // Clear singular if it was this one
            }
        );
    } catch (error) {
        console.error('🚨 [FCM Service] Failed to remove token:', error);
    }
};

/**
 * Global Scrub: Removes a token from ALL tables.
 * Used for total logouts and role switching.
 */
exports.removeTokenGlobally = async (token) => {
    if (!token || token === '') return;
    
    try {
        const query = { fcmTokens: token };
        const pull = { $pull: { fcmTokens: token } };
        const clearSingular = { $set: { fcmToken: null } };

        await Promise.all([
            Admin.updateMany(query, pull),
            Admin.updateMany({ fcmToken: token }, clearSingular),
            
            DeliveryBoy.updateMany(query, pull),
            DeliveryBoy.updateMany({ fcmToken: token }, clearSingular),
            
            User.updateMany(query, pull),
            User.updateMany({ fcmToken: token }, clearSingular)
        ]);
        
        console.log(`🧼 [FCM Service] Token ${token.slice(-6)} scrubbed from system.`);
    } catch (error) {
        console.error('🚨 [FCM Service] Global scrub failed:', error);
    }
};

/**
 * Send Notification to a user (to all their devices)
 */
exports.sendToUser = async (userId, role, payload) => {
    try {
        let Model;
        switch (role.toLowerCase()) {
            case 'admin': Model = Admin; break;
            case 'delivery boy':
            case 'deliveryboy': Model = DeliveryBoy; break;
            default: Model = User;
        }

        const user = await Model.findById(userId).select('fcmTokens');
        if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
            console.log(`⚠️ [FCM Service] No active tokens for ${role} ${userId}`);
            return;
        }

        const response = await admin.messaging().sendMulticast({
            tokens: user.fcmTokens,
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: payload.data || {},
        });

        console.log(`📤 [FCM Service] Sent to ${response.successCount} devices for ${role} ${userId}`);

        // Cleanup invalid tokens if any
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errorCode = resp.error?.code;
                    if (errorCode === 'messaging/registration-token-not-registered' || 
                        errorCode === 'messaging/invalid-registration-token') {
                        failedTokens.push(user.fcmTokens[idx]);
                    }
                }
            });

            if (failedTokens.length > 0) {
                console.log(`🧹 [FCM Service] Cleaning up ${failedTokens.length} dead tokens...`);
                await Model.updateOne(
                    { _id: userId },
                    { $pull: { fcmTokens: { $in: failedTokens } } }
                );
            }
        }
        
        return response;
    } catch (error) {
        console.error('🚨 [FCM Service] Push failed:', error);
    }
};
