const Admin = require('./admin.model');
const bcrypt = require('bcryptjs');

exports.createAdmin = async (adminData, createdBy) => {
    const { name, email, password, roleId } = adminData;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
        throw new Error('Email already exists');
    };

    const hashedPassword = await bcrypt.hash(password, 10);
    return await Admin.create({
        name,
        email,
        password: hashedPassword,
        roleId,
        createdBy
    });
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

exports.updateAdmin = async (id, adminData, updatedBy) => {
    const { name, email, roleId, status } = adminData;
    const admin = await Admin.findByIdAndUpdate(
        id,
        { name, email, roleId, status, updatedBy },
        { new: true }
    );
    if (!admin) throw new Error('Admin not found');
    return admin;
};

exports.deleteAdmin = async (id, currentUserId) => {
    if (id === currentUserId.toString()) {
        throw new Error('You cannot delete your own account');
    }
    const admin = await Admin.findByIdAndUpdate(id, { isDeleted: true });
    if (!admin) throw new Error('Admin not found');
    return admin;
};
