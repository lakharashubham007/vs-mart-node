const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    title: { type: String, required: true },
    code: { type: String, unique: true, sparse: true },
    type: {
        type: String,
        enum: ['OFFER', 'AUTO'],
        required: true
    },
    discountType: {
        type: String,
        enum: ['PERCENTAGE', 'FLAT', 'FREE_PRODUCT', 'FREE_DELIVERY'],
        required: true
    },
    discountValue: { type: Number, default: 0 },
    freeProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    freeProductVariantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },

    applicableType: {
        type: String,
        enum: ['ALL', 'PRODUCT', 'CATEGORY'],
        default: 'ALL'
    },
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    variantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' }],

    minOrderAmount: { type: Number, default: 0 },
    maxDiscount: { type: Number }, // for percentage

    usageLimit: { type: Number, default: 0 }, // 0 means unlimited
    perUserLimit: { type: Number, default: 1 },

    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },

    isFirstOrderOnly: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },

    usedCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, {
    timestamps: true
});

// Soft delete filtering
offerSchema.pre('find', function () { this.where({ isDeleted: false }); });
offerSchema.pre('findOne', function () { this.where({ isDeleted: false }); });

module.exports = mongoose.model('Offer', offerSchema);
