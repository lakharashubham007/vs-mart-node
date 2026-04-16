const User = require('./user.model');
const jwt = require('jsonwebtoken');
const authService = require('../auth/auth.service');

exports.loginUser = async (phone) => {
    // Check if user exists
    console.log(phone);

    const user = await User.findOne({ phone });

    if (!user) {
        throw new Error('User not found. Please register.');
    }

    if (!user.status) {
        throw new Error('User account is disabled. Contact support.');
    }

    // Generate 4 digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    await user.save();

    return { message: 'OTP sent successfully', otp, phone: user.phone };
};

exports.registerUser = async (userData) => {
    const { phone, name, email } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
        throw new Error('User already exists with this phone number. Please login.');
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const newUser = await User.create({
        phone,
        name,
        email,
        otp,
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
        status: true
    });

    return { message: 'Registration successful. OTP sent.', otp, phone: newUser.phone };
};

exports.verifyOTP = async (phone, otp, fcmToken = null) => {
    const user = await User.findOne({ phone });

    if (!user) {
        throw new Error('User not found.');
    }

    if (user.otp !== otp) {
        throw new Error('Invalid OTP.');
    }

    if (user.otpExpiry < new Date()) {
        throw new Error('OTP expired. Please request a new one.');
    }

    // Clear OTP fields
    user.otp = undefined;
    user.otpExpiry = undefined;

    const accessToken = jwt.sign(
        { id: user._id, phone: user.phone },
        process.env.JWT_SECRET || 'secret_key',
        { expiresIn: '2d' }
    );

    // Generate new Refresh Token (15 Days Expiry)
    const refreshToken = jwt.sign(
        { id: user._id, type: 'refresh' },
        process.env.JWT_SECRET || 'secret_key',
        { expiresIn: '15d' }
    );

    user.refreshToken = refreshToken;

    // Save FCM Token if provided (Strict Multi-Token Binding)
    if (fcmToken) {
        await authService.unbindFcmToken(fcmToken);
        if (!user.fcmTokens.includes(fcmToken)) {
            user.fcmTokens.push(fcmToken);
        }
        console.log("Saved token:", fcmToken, "Customer (via OTP Verify)");
    }

    await user.save();

    console.log('Backend verifyOTP returning:', { accessToken, refreshToken, userPhone: user.phone });
    return { accessToken, refreshToken, user };
};

exports.refreshAccessToken = async (token) => {
    if (!token) {
        throw new Error('Refresh token is required');
    }

    // Verify raw token integrity first
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    } catch (err) {
        throw new Error('Invalid or expired refresh token');
    }

    // Find the actual user matching THIS exact active refresh token in their DB record
    const user = await User.findOne({ _id: decoded.id, refreshToken: token });

    if (!user) {
        throw new Error('Refresh token is invalid or has been revoked');
    }

    if (!user.status) {
        throw new Error('User account is disabled');
    }

    const accessToken = jwt.sign(
        { id: user._id, phone: user.phone },
        process.env.JWT_SECRET || 'secret_key',
        { expiresIn: '2d' }
    );

    const newRefreshToken = jwt.sign(
        { id: user._id, type: 'refresh' },
        process.env.JWT_SECRET || 'secret_key',
        { expiresIn: '15d' }
    );

    // Save and rotate the token inside DB
    user.refreshToken = newRefreshToken;
    await user.save();

    return { accessToken, refreshToken: newRefreshToken, user };
};

exports.getUserById = async (id) => {
    const user = await User.findById(id).select('-otp -otpExpiry');
    if (!user) {
        throw new Error('User not found.');
    }
    return user;
};

exports.addAddress = async (userId, addressData) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found.');
    }

    console.log('📝 Adding Address for user:', userId, 'Data:', JSON.stringify(addressData, null, 2));
    console.log('🔍 Active Schema Paths:', Object.keys(User.schema.paths).filter(p => p.startsWith('addresses.')));

    // If this is the first address or marked as default, handle isDefault logic
    if (addressData.isDefault || user.addresses.length === 0) {
        user.addresses.forEach(addr => addr.isDefault = false);
        addressData.isDefault = true;
    }

    user.addresses.push(addressData);
    console.log('📦 User addresses before save:', JSON.stringify(user.addresses, null, 2));
    await user.save();
    console.log('✅ User saved successfully. Current addresses:', JSON.stringify(user.addresses, null, 2));
    return user.addresses;
};

exports.getAddresses = async (userId) => {
    const user = await User.findById(userId).select('addresses');
    if (!user) {
        throw new Error('User not found.');
    }
    return user.addresses;
};

exports.updateAddress = async (userId, addressId, addressData) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found.');
    }

    console.log('📝 Updating Address:', addressId, 'for user:', userId, 'Data:', JSON.stringify(addressData, null, 2));

    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
    if (addressIndex === -1) {
        throw new Error('Address not found.');
    }
    const existingAddress = user.addresses[addressIndex];

    console.log('📦 Address to update (ID:', addressId, '):', JSON.stringify(existingAddress, null, 2));
    console.log('📥 Incoming update data:', JSON.stringify(addressData, null, 2));

    // Merge new data into existing subdocument
    Object.assign(existingAddress, addressData);

    console.log('📦 Address after merge:', JSON.stringify(existingAddress, null, 2));

    await user.save();
    console.log('✅ User saved successfully. Current addresses in DB:', JSON.stringify(user.addresses, null, 2));
    return user.addresses;
};

exports.deleteAddress = async (userId, addressId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found.');
    }

    user.addresses = user.addresses.filter(addr => addr._id.toString() !== addressId);
    await user.save();
    return user.addresses;
};

exports.deleteAccount = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found.');
    }

    const timestamp = Date.now();
    // Rename phone and email to free them up for re-registration
    // format: deleted_{timestamp}_{originalValue}
    const originalPhone = user.phone;
    const originalEmail = user.email;

    user.phone = `deleted_${timestamp}_${originalPhone}`;
    if (originalEmail) {
        user.email = `deleted_${timestamp}_${originalEmail}`;
    }

    user.status = false;
    user.isDeleted = true;
    user.refreshToken = undefined; // Revoke access

    await user.save();
    return { message: 'Account deleted successfully' };
};

exports.getUsers = async (query = {}) => {
    const { search, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const filter = { isDeleted: { $ne: true } };

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
        ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-otp -otpExpiry -refreshToken');

    return {
        users,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        }
    };
};

exports.registerAdminCustomer = async (userData) => {
    const { phone, name, email } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ phone, isDeleted: { $ne: true } });
    if (existingUser) {
        throw new Error('User already exists with this phone number.');
    }

    const newUser = await User.create({
        phone,
        name,
        email,
        status: true,
        isVerified: true // Admins bypass OTP
    });

    return newUser;
};
