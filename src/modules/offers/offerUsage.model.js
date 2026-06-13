const mongoose = require('mongoose');

const offerUsageSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    discountAmount: { type: Number, required: true },
    usedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

module.exports = mongoose.model('OfferUsage', offerUsageSchema);
