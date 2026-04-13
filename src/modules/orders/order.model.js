const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
            name: { type: String, required: true },
            sellingPrice: { type: Number }, // Base Price (e.g., 110)
            finalSellingPrice: { type: Number, required: true }, // Final Price (e.g., 118)
            price: { type: Number, required: true }, // Legacy backup
            mrp: { type: Number },
            quantity: { type: Number, required: true },
            image: { type: String },
            unit: { type: String },
            stockBatches: [{
                stockInId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockIn' },
                batchNo: { type: String },
                quantity: { type: Number }
            }]
        }
    ],
    totalAmount: { type: Number, required: true },
    deliveryCharge: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },
    shippingAddress: {
        receiverName: { type: String },
        phone: { type: String },
        receiverDetails: { type: String, required: true },
        addressDetails: { type: String, required: true },
        flatNo: { type: String },
        area: { type: String },
        landmark: { type: String },
        city: { type: String },
        state: { type: String },
        pincode: { type: String },
        addressType: { type: String, enum: ['Home', 'Work', 'Other', 'Custom', 'Current Location'], default: 'Home' },
        coordinates: {
            latitude: { type: Number },
            longitude: { type: Number }
        }
    },
    paymentMethod: { type: String, enum: ['COD', 'Online'], required: true },
    paymentStatus: { type: String, enum: ['Pending', 'Completed', 'Failed', 'PAID'], default: 'Pending' },
    paymentId: { type: String },
    razorpayOrderId: { type: String },
    orderStatus: {
        type: String,
        enum: ['Placed', 'Confirmed', 'Processing', 'OutForDelivery', 'Delivered', 'Cancelled', 'OutOfStock'],
        default: 'Placed'
    },
    orderId: { type: String, unique: true, index: true }, // For user visibility
    deliveryBoyId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryBoy' },
    deliveryStatus: {
        type: String,
        enum: ['ASSIGNED', 'PICKED', 'DELIVERED', 'CANCELLED'],
        default: 'ASSIGNED'
    },
    placedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Generate friendly Order ID and round values before saving
orderSchema.pre('save', async function () {
    if (!this.orderId) {
        this.orderId = 'VS' + Math.floor(100000 + Math.random() * 900000);
    }

    // [DB-LEVEL SYNC]: Automatically mark COD orders as PAID when status changes to Delivered
    if (this.isModified('orderStatus') && this.orderStatus === 'Delivered' && this.paymentMethod === 'COD') {
        this.paymentStatus = 'PAID';
    }

    // Ensure accurate integer rounding for all financial amounts
    if (this.totalAmount != null) this.totalAmount = Math.round(this.totalAmount);
    if (this.deliveryCharge != null) this.deliveryCharge = Math.round(this.deliveryCharge);
    if (this.tax != null) this.tax = Math.round(this.tax);
    if (this.finalAmount != null) this.finalAmount = Math.round(this.finalAmount);
});

// Intercept reads to gracefully output rounded historical unrounded data
orderSchema.set('toJSON', {
    transform: (doc, ret) => {
        if (ret.totalAmount != null) ret.totalAmount = Math.round(ret.totalAmount);
        if (ret.deliveryCharge != null) ret.deliveryCharge = Math.round(ret.deliveryCharge);
        if (ret.tax != null) ret.tax = Math.round(ret.tax);
        if (ret.finalAmount != null) ret.finalAmount = Math.round(ret.finalAmount);
        return ret;
    }
});

module.exports = mongoose.model('Order', orderSchema);
