const mongoose = require('mongoose');

const variantValueSchema = new mongoose.Schema({
    name: { type: String, required: true }, // XL, Red, 500ml
    variantTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'VariantType', required: true },
    sortOrder: { type: Number, default: 0 },
    colorCode: { type: String }, // Used if inputType is Color Picker
    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    tenantId: { type: mongoose.Schema.Types.ObjectId },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, {
    timestamps: true
});

variantValueSchema.pre('find', function () { this.where({ isDeleted: false }); });
variantValueSchema.pre('findOne', function () { this.where({ isDeleted: false }); });

module.exports = mongoose.model('VariantValue', variantValueSchema);
