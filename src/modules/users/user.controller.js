const userService = require('./user.service');

exports.login = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ success: false, message: 'Phone number is required' });
        }
        const result = await userService.loginUser(phone);
        res.status(200).json({ success: true, message: 'Login successful', data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.register = async (req, res) => {
    try {
        const { phone, name, email } = req.body;
        if (!phone) {
            return res.status(400).json({ success: false, message: 'Phone number is required' });
        }
        const result = await userService.registerUser({ phone, name, email });
        res.status(201).json({ success: true, message: 'Registration successful', data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { phone, otp, fcmToken } = req.body;
        if (!phone || !otp) {
            return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
        }
        const result = await userService.verifyOTP(phone, otp, fcmToken);
        res.status(200).json({ success: true, message: 'OTP verified successfully', data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await userService.getUserById(userId);
        res.status(200).json({ success: true, message: 'User profile fetched successfully', data: user });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'Refresh token is required' });
        }
        const result = await userService.refreshAccessToken(refreshToken);
        res.status(200).json({ success: true, message: 'Token refreshed successfully', data: result });
    } catch (error) {
        res.status(401).json({ success: false, message: error.message });
    }
};

exports.addAddress = async (req, res) => {
    try {
        const userId = req.user._id;
        const addressData = req.body;
        const result = await userService.addAddress(userId, addressData);
        res.status(200).json({ success: true, message: 'Address added successfully', data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getAddresses = async (req, res) => {
    try {
        const userId = req.user._id;
        const result = await userService.getAddresses(userId);
        res.status(200).json({ success: true, message: 'Addresses fetched successfully', data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.updateAddress = async (req, res) => {
    try {
        const userId = req.user._id;
        const addressId = req.params.id;
        const addressData = req.body;
        const result = await userService.updateAddress(userId, addressId, addressData);
        res.status(200).json({ success: true, message: 'Address updated successfully', data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.deleteAddress = async (req, res) => {
    try {
        const userId = req.user._id;
        const addressId = req.params.id;
        const result = await userService.deleteAddress(userId, addressId);
        res.status(200).json({ success: true, message: 'Address deleted successfully', data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * PATCH /user/update-profile
 * Update user name, email and/or profile image
 */
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const { name, email } = req.body;
        const updateData = {};

        if (name !== undefined) updateData.name = name.trim();
        if (email !== undefined) updateData.email = email.trim();
        if (req.file) {
            updateData.profileImage = req.file.path;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }

        const User = require('./user.model');
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, select: '-otp -otpExpiry -refreshToken' }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * POST /user/saved-cards
 * Add a new saved card
 */
exports.addSavedCard = async (req, res) => {
    try {
        const userId = req.user._id;
        const { cardNumber, cardHolderName, expiryDate, cardType, isDefault } = req.body;

        if (!cardNumber || !cardHolderName || !expiryDate) {
            return res.status(400).json({ success: false, message: 'Card details are required' });
        }

        const User = require('./user.model');
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if card number already exists
        const exists = user.savedCards.find(c => c.cardNumber === cardNumber);
        if (exists) {
            return res.status(400).json({ success: false, message: 'This card is already saved' });
        }

        const newCard = { 
            cardNumber, 
            cardHolderName, 
            expiryDate, 
            cardType: cardType || 'Other', 
            isDefault: isDefault || false 
        };
        
        user.savedCards.push(newCard);
        await user.save();

        res.status(201).json({ success: true, message: 'Card saved successfully', data: user.savedCards });
    } catch (error) {
        console.error("Save Card Error:", error);
        res.status(400).json({ success: false, message: error.message || 'Failed to save card' });
    }
};

/**
 * DELETE /user/saved-cards/:cardId
 * Delete a saved card
 */
exports.deleteSavedCard = async (req, res) => {
    try {
        const userId = req.user._id;
        const cardId = req.params.cardId;

        const User = require('./user.model');
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.savedCards = user.savedCards.filter(card => card._id.toString() !== cardId);
        await user.save();

        res.status(200).json({ success: true, message: 'Card deleted successfully', data: user.savedCards });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * DELETE /user/delete-account
 * Soft delete user account
 */
exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.user._id;
        const result = await userService.deleteAccount(userId);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * GET /users
 * (Admin only) List all customers with pagination, search and sort
 */
exports.getUsers = async (req, res) => {
    try {
        const result = await userService.getUsers(req.query);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * POST /users/register-by-admin
 * (Admin only) Manually register a customer
 */
exports.registerCustomerByAdmin = async (req, res) => {
    try {
        const { phone, name, email } = req.body;
        if (!phone) {
            return res.status(400).json({ success: false, message: 'Phone number is required' });
        }
        const result = await userService.registerAdminCustomer({ phone, name, email });
        res.status(201).json({ success: true, message: 'Customer registered successfully', data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * POST /user/fcm-token
 * Save/update the FCM push notification token for this device.
 * 
 * Logic:
 * 1. If token is provided (Login/Sync): Unbind from ALL roles first to ensure one-device-one-role.
 * 2. If token is empty (Logout/Clear): Only clear from User role, do NOT unbind others.
 */
exports.saveFcmToken = async (req, res) => {
    try {
        const User = require('./user.model');
        const authService = require('../auth/auth.service');
        
        const userId = req.user._id;
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, message: 'FCM token is required' });
        }

        // -- LOG: Trace start --
        console.log("Saving token:", token, "CUSTOMER");

        // 1. Strict Switch Logic (Unbind others)
        await authService.unbindFcmToken(token);

        // 2. BIND: Save to User profile
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (!user.fcmTokens.includes(token)) {
            user.fcmTokens.push(token);
        }
        await user.save();

        res.status(200).json({ success: true, message: 'FCM token saved successfully' });
    } catch (error) {
        console.error("🚨 [FCM Error: Customer] Failed to save/sync token:", error);
        res.status(400).json({ success: false, message: error.message });
    }
};
