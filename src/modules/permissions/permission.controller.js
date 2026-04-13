const permissionService = require('./permission.service');

exports.createPermission = async (req, res) => {
    try {
        const permission = await permissionService.createPermission(req.body);
        res.status(201).json(permission);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getPermissions = async (req, res) => {
    try {
        const permissions = await permissionService.getPermissions();
        res.json(permissions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updatePermission = async (req, res) => {
    try {
        const permission = await permissionService.updatePermission(req.params.id, req.body);
        res.json(permission);
    } catch (error) {
        const status = error.message === 'Permission not found' ? 404 : 400;
        res.status(status).json({ message: error.message });
    }
};

exports.deletePermission = async (req, res) => {
    try {
        await permissionService.deletePermission(req.params.id);
        res.json({ message: 'Permission deleted successfully' });
    } catch (error) {
        const status = error.message === 'Permission not found' ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
};
