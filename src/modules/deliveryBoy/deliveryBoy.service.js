const DeliveryBoy = require('./deliveryBoy.model');
const fs = require('fs');
const path = require('path');

/**
 * Create Delivery Boy
 */
exports.createDeliveryBoy = async (data, file) => {
    if (file) {
        data.profileImage = file.path.replace(/\\/g, '/');
    }
    const deliveryBoy = await DeliveryBoy.create(data);
    return deliveryBoy;
};

/**
 * List Delivery Boys
 */
exports.getDeliveryBoys = async ({ search, status, page = 1, limit = 10 }) => {
    const query = {};
    if (status !== undefined && status !== '') {
        query.status = status === 'true';
    }
    if (search) {
        query.$or = [
            { firstName: new RegExp(search, 'i') },
            { lastName: new RegExp(search, 'i') },
            { mobile: new RegExp(search, 'i') },
            { email: new RegExp(search, 'i') }
        ];
    }

    const total = await DeliveryBoy.countDocuments(query);
    const deliveryBoys = await DeliveryBoy.find(query)
        .populate('roleId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    return {
        data: deliveryBoys,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get by ID
 */
exports.getDeliveryBoyById = async (id) => {
    return await DeliveryBoy.findById(id).populate('roleId', 'name');
};

/**
 * Update Delivery Boy
 */
exports.updateDeliveryBoy = async (id, data, file) => {
    const deliveryBoy = await DeliveryBoy.findById(id);
    if (!deliveryBoy) throw new Error('Delivery Boy not found');

    if (file) {
        // Delete old image if exists
        if (deliveryBoy.profileImage && fs.existsSync(deliveryBoy.profileImage)) {
            try { fs.unlinkSync(deliveryBoy.profileImage); } catch (e) { console.error('Image delete error:', e); }
        }
        data.profileImage = file.path.replace(/\\/g, '/');
    }

    // Use Object.assign and save() to trigger pre-save hooks (like password hashing)
    Object.assign(deliveryBoy, data);
    return await deliveryBoy.save();
};

/**
 * Delete Delivery Boy
 */
exports.deleteDeliveryBoy = async (id) => {
    const deliveryBoy = await DeliveryBoy.findById(id);
    if (!deliveryBoy) throw new Error('Delivery Boy not found');

    // Delete image if exists
    if (deliveryBoy.profileImage && fs.existsSync(deliveryBoy.profileImage)) {
        try { fs.unlinkSync(deliveryBoy.profileImage); } catch (e) { console.error('Image delete error:', e); }
    }

    return await DeliveryBoy.findByIdAndDelete(id);
};

/**
 * Toggle Status
 */
exports.toggleStatus = async (id, status) => {
    return await DeliveryBoy.findByIdAndUpdate(id, { status }, { new: true });
};

/**
 * Update FCM Token
 */
exports.updateFcmToken = async (id, fcmToken) => {
    return await DeliveryBoy.findByIdAndUpdate(id, { fcmToken }, { new: true });
};
