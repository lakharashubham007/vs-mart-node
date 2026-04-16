const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const deliveryBoySchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String },
    mobile: { type: String, required: true, unique: true },
    alternateMobile: { type: String },
    email: { type: String, unique: true, required: true }, // Login Email
    personalEmail: { type: String }, // Personal Email
    password: { type: String, required: true },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    profileImage: { type: String },
    address: {
        fullAddress: { type: String, required: true },
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
    },
    status: {
        type: Boolean,
        default: true
    },
    fcmTokens: [{ type: String, trim: true }]
}, { timestamps: true });

// Hash password before saving
deliveryBoySchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
        throw error;
    }
});

// Indexing for search performance
deliveryBoySchema.index({ firstName: 'text', lastName: 'text', mobile: 'text', email: 'text', personalEmail: 'text' });

module.exports = mongoose.model('DeliveryBoy', deliveryBoySchema);
