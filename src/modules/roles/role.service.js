const Role = require('./role.model');
const Admin = require('../admins/admin.model');

exports.createRole = async (roleData, userId) => {
    return await Role.create({ ...roleData, createdBy: userId });
};

exports.getRoles = async () => {
    return await Role.find()
        .populate('permissionIds')
        .populate('sidebarMenuIds');
};

exports.getRoleById = async (id) => {
    const role = await Role.findById(id)
        .populate('permissionIds')
        .populate('sidebarMenuIds');
    if (!role) throw new Error('Role not found');
    return role;
};

exports.updateRole = async (id, roleData) => {
    const role = await Role.findByIdAndUpdate(id, roleData, { new: true });
    if (!role) throw new Error('Role not found');
    return role;
};

exports.deleteRole = async (id) => {
    const role = await Role.findById(id);
    if (!role) throw new Error('Role not found');

    if (role.isDefault) {
        throw new Error('Cannot delete default system roles');
    }

    const assignedAdmins = await Admin.countDocuments({ roleId: role._id, isDeleted: false });
    if (assignedAdmins > 0) {
        throw new Error(`Cannot delete role. It is assigned to ${assignedAdmins} active user(s).`);
    }

    await Role.findByIdAndDelete(id);
    return role;
};
