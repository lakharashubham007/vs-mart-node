const mongoose = require('mongoose');

const cmsSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('CMS', cmsSchema);
