const adminService = require('./admin.service');

exports.createAdmin = async (req, res) => {
    try {
        const admin = await adminService.createAdmin(req.body, req.file, req.user._id);
        res.status(201).json({ message: 'Admin created successfully', admin });
    } catch (error) {
        const status = error.message === 'Email already exists' ? 400 : 500;
        res.status(status).json({ message: error.message });
    }
};

exports.getAdmins = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const result = await adminService.getAdmins(search, parseInt(page), parseInt(limit));
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAdminById = async (req, res) => {
    try {
        const admin = await adminService.getAdminById(req.params.id);
        res.json(admin);
    } catch (error) {
        const status = error.message === 'Admin not found' ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
};

exports.updateAdmin = async (req, res) => {
    try {
        const admin = await adminService.updateAdmin(req.params.id, req.body, req.file, req.user._id);
        res.json(admin);
    } catch (error) {
        const status = error.message === 'Admin not found' ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
};

exports.deleteAdmin = async (req, res) => {
    try {
        await adminService.deleteAdmin(req.params.id, req.user._id);
        res.json({ message: 'Admin deleted successfully' });
    } catch (error) {
        const status = error.message === 'You cannot delete your own account' ? 400 :
            error.message === 'Admin not found' ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
};
