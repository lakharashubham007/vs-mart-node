const SidebarMenu = require('./sidebar.model');

exports.createSidebarMenu = async (menuData) => {
    return await SidebarMenu.create(menuData);
};

exports.getSidebarMenus = async (user) => {
    const admin = await user.populate('roleId');
    if (!admin.roleId) {
        return [];
    }

    return await SidebarMenu.find({
        _id: { $in: admin.roleId.sidebarMenuIds }
    }).sort({ module_priority: 1, module_menu_priority: 1 });
};

exports.getAllSidebarMenus = async () => {
    return await SidebarMenu.find().sort({ module_priority: 1, module_menu_priority: 1 });
};

exports.updateSidebarMenu = async (id, menuData) => {
    return await SidebarMenu.findByIdAndUpdate(id, menuData, { new: true });
};

exports.deleteSidebarMenu = async (id) => {
    return await SidebarMenu.findByIdAndDelete(id);
};
