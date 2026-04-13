const mongoose = require('mongoose');

const supportSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    value: {
        type: String,
        required: true,
        trim: true
    },
    url: {
        type: String,
        trim: true
    },
    icon: {
        type: String,
        required: true,
        default: 'HelpCircle'
    },
    color: {
        type: String,
        default: '#1A6B3A'
    },
    bgColor: {
        type: String,
        default: 'rgba(26, 107, 58, 0.1)'
    },
    displayOrder: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Support', supportSchema);
