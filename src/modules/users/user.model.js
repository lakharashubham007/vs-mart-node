const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, trim: true },
    phone: { type: String, required: true, unique: true, index: true },
    email: { type: String, sparse: true, trim: true },
    profileImage: { type: String },
    otp: { type: String },
    otpExpiry: { type: Date },
    refreshToken: { type: String },
    addresses: [
        {
            type: { type: String, enum: ['Home', 'Work', 'Other', 'Custom'], default: 'Home' },
            receiverDetails: { type: String }, // e.g., "Harsh Lakhar - 73xxxxxxxx"
            addressDetails: { type: String }, // Consolidated address string (user typed)
            pinAddress: { type: String },     // Google reverse-geocoded address from pin
            latitude: { type: Number },
            longitude: { type: Number },
            isDefault: { type: Boolean, default: false }
        }
    ],
    lastUsedAddressId: { type: mongoose.Schema.Types.ObjectId, ref: 'User.addresses' },
    savedCards: [
        {
            cardNumber: { type: String, required: true },
            cardHolderName: { type: String, required: true },
            expiryDate: { type: String, required: true },
            cardType: { type: String, enum: ['Visa', 'MasterCard', 'RuPay', 'Discover', 'Other'], default: 'Other' },
            isDefault: { type: Boolean, default: false }
        }
    ],
    status: { type: Boolean, default: true },
    fcmToken: { type: String, default: null },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

userSchema.pre('find', function () { this.where({ isDeleted: false }); });
userSchema.pre('findOne', function () { this.where({ isDeleted: false }); });
userSchema.pre('findOneAndUpdate', function () { this.where({ isDeleted: false }); });
userSchema.pre('count', function () { this.where({ isDeleted: false }); });
userSchema.pre('countDocuments', function () { this.where({ isDeleted: false }); });

module.exports = mongoose.model('User', userSchema);
