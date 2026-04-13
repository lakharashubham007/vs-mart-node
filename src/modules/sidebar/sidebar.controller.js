const sidebarService = require('./sidebar.service');

exports.createSidebarMenu = async (req, res) => {
    try {
        const menu = await sidebarService.createSidebarMenu(req.body);
        res.status(201).json(menu);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getSidebarMenus = async (req, res) => {
    try {
        const menus = await sidebarService.getSidebarMenus(req.user);
        res.json(menus);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAllSidebarMenus = async (req, res) => {
    try {
        const menus = await sidebarService.getAllSidebarMenus();
        res.json(menus);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateSidebarMenu = async (req, res) => {
    try {
        const menu = await sidebarService.updateSidebarMenu(req.params.id, req.body);
        res.json(menu);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteSidebarMenu = async (req, res) => {
    try {
        await sidebarService.deleteSidebarMenu(req.params.id);
        res.json({ message: 'Menu item deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
