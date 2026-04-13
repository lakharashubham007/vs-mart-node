const mongoose = require('mongoose');

const privacySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    content: {
        type: String,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: false,
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
}, {
    timestamps: true,
});

const Privacy = mongoose.model('Privacy', privacySchema);

module.exports = Privacy;
