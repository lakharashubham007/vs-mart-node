const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, unique: true, required: true },
    logo: String,

    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },

    tenantId: { type: mongoose.Schema.Types.ObjectId }, // SaaS Ready

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, {
    timestamps: true
});

// Slugify name before validation
brandSchema.pre('validate', function () {
    if (this.name && !this.slug) {
        this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
});

// Soft delete filtering
brandSchema.pre('find', function () { this.where({ isDeleted: false }); });
brandSchema.pre('findOne', function () { this.where({ isDeleted: false }); });

module.exports = mongoose.model('Brand', brandSchema);
