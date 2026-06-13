const mongoose = require('mongoose');

const orderDraftSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
        name: String,
        quantity: Number,
        price: Number,
        mrp: Number,
        finalSellingPrice: Number,
        image: String,
        unit: String
    }],
    totalAmount: Number,
    deliveryCharge: Number,
    tax: Number,
    discountAmount: Number,
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
    finalAmount: Number,
    shippingAddress: Object,
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 60 * 1000) } // 30 mins
}, { timestamps: true });

// Auto-delete expired drafts
orderDraftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OrderDraft', orderDraftSchema);
