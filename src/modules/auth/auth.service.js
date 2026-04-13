const Admin = require('../admins/admin.model');
const DeliveryBoy = require('../deliveryBoy/deliveryBoy.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

exports.login = async (email, password, fcmToken) => {
    console.log(`Login attempt for: ${email}. FCM: ${fcmToken ? 'Yes' : 'No'}`);
    if (mongoose.connection.readyState !== 1) {
        throw new Error('Database connection is not ready');
    }

    const admin = await Admin.findOne({ email }).populate({
        path: 'roleId',
        populate: { path: 'permissionIds' }
    });

    if (!admin || admin.isDeleted) {
        throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    // Save FCM Token if provided
    if (fcmToken) {
        admin.fcmToken = fcmToken;
        await admin.save();
    }

    const permissions = admin.roleId?.permissionIds.map(p => p.key) || [];

    const token = jwt.sign(
        { id: admin._id, email: admin.email },
        process.env.JWT_SECRET || 'secret_key',
        { expiresIn: '24h' }
    );

    return {
        token,
        user: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.roleId?.name,
            profileImage: admin.profileImage,
            permissions
        }
    };
};

exports.deliveryBoyLogin = async (email, password, fcmToken) => {
    if (mongoose.connection.readyState !== 1) {
        throw new Error('Database connection is not ready');
    }

    const boy = await DeliveryBoy.findOne({ email }).populate('roleId');

    if (!boy || !boy.status) {
        throw new Error('Invalid credentials or account deactivated');
    }

    const isMatch = await bcrypt.compare(password, boy.password);
    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    // Save FCM Token if provided
    if (fcmToken) {
        boy.fcmToken = fcmToken;
        await boy.save();
    }

    const token = jwt.sign(
        { id: boy._id, email: boy.email, role: 'Delivery Boy' },
        process.env.JWT_SECRET || 'secret_key',
        { expiresIn: '24h' }
    );

    return {
        token,
        user: {
            id: boy._id,
            name: `${boy.firstName} ${boy.lastName || ''}`,
            email: boy.email,
            role: 'Delivery Boy',
            profileImage: boy.profileImage,
            permissions: ['VIEW_ASSIGNMENTS', 'UPDATE_STATUS']
        }
    };
};

exports.staffLogin = async (email, password, fcmToken) => {
    if (mongoose.connection.readyState !== 1) {
        throw new Error('Database connection is not ready');
    }

    // 1. Check Admin Table first
    let user = await Admin.findOne({ email }).populate({
        path: 'roleId',
        populate: { path: 'permissionIds' }
    });

    let role = null;
    let permissions = [];
    let name = '';
    let isDeliveryBoy = false;

    if (user && !user.isDeleted) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) throw new Error('Invalid credentials');
        
        role = user.roleId?.name || 'Admin';
        permissions = user.roleId?.permissionIds.map(p => p.key) || [];
        name = user.name;
    } else {
        // 2. Check Delivery Boy Table
        user = await DeliveryBoy.findOne({ email }).populate('roleId');
        if (!user || !user.status) {
            throw new Error('User not found');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) throw new Error('Invalid credentials');

        role = 'Delivery Boy';
        permissions = ['VIEW_ASSIGNMENTS', 'UPDATE_STATUS'];
        name = `${user.firstName} ${user.lastName || ''}`;
        isDeliveryBoy = true;
    }

    // Save FCM Token if provided
    if (fcmToken) {
        user.fcmToken = fcmToken;
        await user.save();
    }

    const token = jwt.sign(
        { id: user._id, email: user.email, role },
        process.env.JWT_SECRET || 'secret_key',
        { expiresIn: '24h' }
    );

    return {
        token,
        user: {
            id: user._id,
            name,
            email: user.email,
            role,
            profileImage: user.profileImage,
            permissions,
            isDeliveryBoy
        }
    };
};

exports.updateProfile = async (userId, body, file) => {
    const { name, currentPassword, newPassword } = body || {};
    const admin = await Admin.findById(userId);

    if (name) admin.name = name;

    if (file) {
        if (admin.profileImage) {
            const oldPath = path.join(__dirname, '../../../', admin.profileImage);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        admin.profileImage = `uploads/profiles/${file.filename}`;
    }

    if (currentPassword && newPassword) {
        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) {
            throw new Error('Current password does not match');
        }
        admin.password = await bcrypt.hash(newPassword, 10);
    }

    await admin.save();

    return {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        profileImage: admin.profileImage
    };
};

exports.deleteProfileImage = async (userId) => {
    const admin = await Admin.findById(userId);
    if (admin.profileImage) {
        const imagePath = path.join(__dirname, '../../../', admin.profileImage);
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        admin.profileImage = null;
        await admin.save();
    }
};

exports.getPublicProfileImage = async (id) => {
    const admin = await Admin.findById(id);
    if (!admin || !admin.profileImage) {
        throw new Error('Image not found');
    }

    const imagePath = path.join(__dirname, '../../../', admin.profileImage);
    if (fs.existsSync(imagePath)) {
        return imagePath;
    } else {
        throw new Error('Image file not found');
    }
};
