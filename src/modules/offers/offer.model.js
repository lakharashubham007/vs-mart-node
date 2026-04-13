const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    image: { type: String, required: true },

    discountType: {
        type: String,
        enum: ['Percentage', 'Fixed'],
        default: 'Percentage'
    },
    discountValue: { type: Number, default: 0 },

    linkType: {
        type: String,
        enum: ['Product', 'Category', 'External', 'None'],
        default: 'None'
    },
    linkId: { type: String }, // MongoDB ID or URL

    startDate: { type: Date, default: Date.now },
    expiryDate: { type: Date },

    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },

    isDeleted: { type: Boolean, default: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, {
    timestamps: true
});

// Soft delete filtering
offerSchema.pre('find', function () { this.where({ isDeleted: false }); });
offerSchema.pre('findOne', function () { this.where({ isDeleted: false }); });

module.exports = mongoose.model('Offer', offerSchema);
