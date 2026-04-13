const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    variantId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,  // null = base product (no variant)
    },
}, { timestamps: true });

// Compound unique index: one entry per user + product + variant combination
wishlistSchema.index({ userId: 1, productId: 1, variantId: 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);
