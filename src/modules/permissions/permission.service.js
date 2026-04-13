const Permission = require('./permission.model');

exports.createPermission = async (permissionData) => {
    return await Permission.create(permissionData);
};

exports.getPermissions = async () => {
    return await Permission.find();
};

exports.updatePermission = async (id, permissionData) => {
    const permission = await Permission.findByIdAndUpdate(id, permissionData, { new: true });
    if (!permission) throw new Error('Permission not found');
    return permission;
};

exports.deletePermission = async (id) => {
    const permission = await Permission.findByIdAndDelete(id);
    if (!permission) throw new Error('Permission not found');
    return permission;
};
