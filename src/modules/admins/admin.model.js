const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },

    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },

    lastLogin: Date,
    profileImage: String,

    tenantId: { type: mongoose.Schema.Types.ObjectId }, // For future SaaS scalability
    fcmToken: { type: String, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, {
    timestamps: true
});

// Middleware for soft delete filtering
adminSchema.pre(['find', 'findOne'], function () {
    this.where({ isDeleted: false });
});

module.exports = mongoose.model('Admin', adminSchema);
