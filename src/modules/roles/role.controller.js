const roleService = require('./role.service');

exports.createRole = async (req, res) => {
    try {
        const role = await roleService.createRole(req.body, req.user?._id);
        res.status(201).json(role);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getRoles = async (req, res) => {
    try {
        const roles = await roleService.getRoles();
        res.json(roles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getRoleById = async (req, res) => {
    try {
        const role = await roleService.getRoleById(req.params.id);
        res.json(role);
    } catch (error) {
        const status = error.message === 'Role not found' ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
};

exports.updateRole = async (req, res) => {
    try {
        const role = await roleService.updateRole(req.params.id, req.body);
        res.json(role);
    } catch (error) {
        const status = error.message === 'Role not found' ? 404 : 400;
        res.status(status).json({ message: error.message });
    }
};

exports.deleteRole = async (req, res) => {
    try {
        await roleService.deleteRole(req.params.id);
        res.json({ message: 'Role deleted successfully' });
    } catch (error) {
        const status = error.message.includes('not found') ? 404 :
            error.message.includes('Cannot delete') ? 400 : 500;
        res.status(status).json({ message: error.message });
    }
};
