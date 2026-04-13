const mongoose = require('mongoose');

/**
 * Records every push notification sent from the admin panel.
 */
const pushNotificationHistorySchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },

    // 'all' = broadcast, 'selected' = specific users, 'topic' = FCM topic
    targetType: {
        type: String,
        enum: ['all', 'selected', 'topic'],
        required: true,
    },

    // Only populated when targetType = 'selected'
    targetUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Only populated when targetType = 'topic'
    topic: { type: String },

    // Admin user who sent it
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },

    // Tracking the Navigation Target (must match NavigationService.ts)
    screen:    { type: String, default: 'Notification' },
    orderId:   { type: String },
    offerId:   { type: String },
    productId: { type: String },
}, {
    timestamps: true,
});

module.exports = mongoose.model('PushNotificationHistory', pushNotificationHistorySchema);
