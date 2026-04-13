const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
    stockInId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockIn' }, // Added for FIFO tracking
    quantity: { type: Number, required: true, default: 1 },
}, {
    timestamps: true
});

// Ensure a user can only have one entry for a specific product/variant combination
cartSchema.index({ userId: 1, productId: 1, variantId: 1 }, { unique: true });

module.exports = mongoose.model('Cart', cartSchema);
