const mongoose = require('mongoose');

const stockInSchema = new mongoose.Schema({
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
    batchNo: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },

    // Inventory tracking
    quantity: {
        type: Number,
        required: true,
        default: 0
    },
    currentQuantity: {
        type: Number,
        required: true,
        default: 0
    },

    // Pricing for THIS batch
    pricing: {
        mrp: { type: Number, required: true },
        sellingPrice: { type: Number, required: true },
        finalSellingPrice: { type: Number }, // sellingPrice - discounts or calculated
        costPrice: { type: Number, required: true },
        taxId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tax' },
        discountType: { type: String, enum: ['Fixed', 'Percentage'], default: 'Fixed' },
        discountValue: { type: Number, default: 0 }
    },
    mfgDate: {
        type: Date
    },
    expDate: {
        type: Date
    },


    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier'
    },

    status: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    tenantId: {
        type: mongoose.Schema.Types.ObjectId
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, {
    timestamps: true
});

// Soft delete middleware
stockInSchema.pre(['find', 'findOne'], function () {
    this.where({ isDeleted: { $ne: true } });
});

module.exports = mongoose.model('StockIn', stockInSchema);
