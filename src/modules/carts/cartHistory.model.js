const mongoose = require('mongoose');

const cartHistorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
    actionType: { 
        type: String, 
        enum: ['ADD', 'REMOVE', 'UPDATE', 'ORDER_PLACED'], 
        required: true,
        index: true
    },
    quantity: { type: Number, required: true },
    previousQuantity: { type: Number },
    price: { type: Number }, // Snapshot of price at the time
}, {
    timestamps: true
});

// Compound index for filtering history by user and action type efficiently
cartHistorySchema.index({ userId: 1, actionType: 1, createdAt: -1 });
cartHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('CartHistory', cartHistorySchema);
