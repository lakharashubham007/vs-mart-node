const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, unique: true, required: true },
    description: String,
    image: String,

    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },

    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    order: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, {
    timestamps: true
});

// Slugify name before validation
subcategorySchema.pre('validate', function () {
    if (this.name && !this.slug) {
        this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
});

const Subcategory = mongoose.model('Subcategory', subcategorySchema);

module.exports = Subcategory;
