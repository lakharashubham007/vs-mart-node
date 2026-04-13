const mongoose = require('mongoose');

const deliveryAssignmentSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNumber: { type: String, required: true },

    deliveryBoyId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryBoy', required: true },
    deliveryBoyName: { type: String, required: true },

    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerName: { type: String, required: true },

    deliveryAddress: {
        fullAddress: { type: String, required: true },
        latitude: { type: Number },
        longitude: { type: Number }
    },

    status: {
        type: String,
        enum: ["ASSIGNED", "PICKED", "DELIVERED", "CANCELLED"],
        default: "ASSIGNED"
    },

    assignedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexing for performance
deliveryAssignmentSchema.index({ orderId: 1, deliveryBoyId: 1 });
deliveryAssignmentSchema.index({ status: 1 });

module.exports = mongoose.model('DeliveryAssignment', deliveryAssignmentSchema);
