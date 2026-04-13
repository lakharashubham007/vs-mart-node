const mongoose = require('mongoose');

const variantTypeSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Size, Color, etc.
    slug: { type: String, unique: true },
    inputType: {
        type: String,
        enum: ['Dropdown', 'Color Picker', 'Text', 'Radio'],
        default: 'Dropdown'
    },
    required: { type: Boolean, default: false },
    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    tenantId: { type: mongoose.Schema.Types.ObjectId },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, {
    timestamps: true
});

variantTypeSchema.pre('validate', function () {
    if (this.name && !this.slug) {
        this.slug = this.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    }
});



variantTypeSchema.pre('find', function () { this.where({ isDeleted: false }); });
variantTypeSchema.pre('findOne', function () { this.where({ isDeleted: false }); });

module.exports = mongoose.model('VariantType', variantTypeSchema);
