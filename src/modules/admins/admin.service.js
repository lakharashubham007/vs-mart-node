const Admin = require('./admin.model');
const bcrypt = require('bcryptjs');
const { deleteFromCloudinary } = require('../../utils/image.util');

exports.createAdmin = async (adminData, file, createdBy) => {
    const { name, email, password, roleId } = adminData;
    let profileImage;
    if (file) profileImage = file.path;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
        if (profileImage) await deleteFromCloudinary(profileImage);
        throw new Error('Email already exists');
    };

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        return await Admin.create({
            name,
            email,
            password: hashedPassword,
            roleId,
            profileImage,
            createdBy
        });
    } catch (error) {
        if (profileImage) await deleteFromCloudinary(profileImage);
        throw error;
    }
};

exports.getAdmins = async (search, page = 1, limit = 10) => {
    const query = { isDeleted: false };

    if (search) {
        query.$or = [
            { name: new RegExp(search, 'i') },
            { email: new RegExp(search, 'i') }
        ];
    }

    const skip = (page - 1) * limit;

    const admins = await Admin.find(query)
        .populate('roleId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Admin.countDocuments(query);

    return {
        admins,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        }
    };
};

exports.getAdminById = async (id) => {
    const admin = await Admin.findById(id).populate('roleId', 'name');
    if (!admin) throw new Error('Admin not found');
    return admin;
};

exports.updateAdmin = async (id, adminData, file, updatedBy) => {
    const { name, email, roleId, status } = adminData;
    const existingAdmin = await Admin.findById(id);
    if (!existingAdmin) {
        if (file) await deleteFromCloudinary(file.path);
        throw new Error('Admin not found');
    }

    const updateData = { name, email, roleId, status, updatedBy };
    
    if (file) {
        updateData.profileImage = file.path;
        if (existingAdmin.profileImage) {
            await deleteFromCloudinary(existingAdmin.profileImage);
        }
    }

    const admin = await Admin.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
    );
    return admin;
};

exports.deleteAdmin = async (id, currentUserId) => {
    if (id === currentUserId.toString()) {
        throw new Error('You cannot delete your own account');
    }
    const admin = await Admin.findById(id);
    if (!admin) throw new Error('Admin not found');

    if (admin.profileImage) {
        await deleteFromCloudinary(admin.profileImage);
    }

    admin.isDeleted = true;
    await admin.save();
    return admin;
};
