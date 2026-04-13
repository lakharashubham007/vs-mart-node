const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    title: { type: String, required: true },
    image: { type: String, required: true },
    link: { type: String, default: '' }, // Deep link or external URL

    publishDate: { type: Date, default: Date.now },
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
bannerSchema.pre('find', function () { this.where({ isDeleted: false }); });
bannerSchema.pre('findOne', function () { this.where({ isDeleted: false }); });

module.exports = mongoose.model('Banner', bannerSchema);
