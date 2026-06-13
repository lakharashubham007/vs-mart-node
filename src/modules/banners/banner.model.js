const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    title: { type: String, required: true },
    image: { type: String, required: true },
    type: { 
        type: String, 
        enum: ["HOME_BANNER", "OFFER_BANNER"],
        required: true
    },

    publishDate: { type: Date, default: Date.now },
    expiryDate: { type: Date },

    redirectLink: { type: String, default: '' }, // For HOME_BANNER external links or OFFER_BANNER fallback
    linkType: {
        type: String,
        enum: ['Product', 'Category', 'External', 'None'],
        default: 'None'
    },
    linkId: { type: String }, // MongoDB ID for Product/Category

    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },

    isDeleted: { type: Boolean, default: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, {
    timestamps: true
});

// Soft delete filtering
bannerSchema.pre('find', function () { this.where({ isDeleted: false }); });
bannerSchema.pre('findOne', function () { this.where({ isDeleted: false }); });

module.exports = mongoose.model('Banner', bannerSchema);
