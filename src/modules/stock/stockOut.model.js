const mongoose = require('mongoose');

const stockOutSchema = new mongoose.Schema({
    stockInId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StockIn',
        required: true,
        index: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    variantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductVariant',
        index: true
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        index: true
    },

    type: {
        type: String,
        enum: ['Sale', 'Damage', 'Return', 'Expired', 'Manual'],
        required: true,
        index: true
    },

    quantity: {
        type: Number,
        required: true
    },

    // Price at which the item was removed (sale price or cost basis)
    price: {
        type: Number
    },

    reason: {
        type: String,
        trim: true
    },

    tenantId: {
        type: mongoose.Schema.Types.ObjectId
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('StockOut', stockOutSchema);
