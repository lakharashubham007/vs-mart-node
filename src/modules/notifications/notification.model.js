const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['ORDER_STATUS_UPDATE', 'PROMOTIONAL', 'SYSTEM', 'NEW_ASSIGNMENT'],
        default: 'SYSTEM'
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order' // Optional, can point to the specific order
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    targetRole: {
        type: String,
        enum: ['user', 'admin', 'delivery_boy'],
        default: 'user',
        index: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false // Optional for system-generated notifs
    },
    senderName: {
        type: String,
        required: false
    },
    senderRole: {
        type: String,
        required: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
