const authService = require('./auth.service');

exports.login = async (req, res) => {
    try {
        const { email, password, fcmToken } = req.body;
        const result = await authService.login(email, password, fcmToken);
        res.json(result);
    } catch (error) {
        const status = error.message === 'Database connection is not ready' ? 503 :
            error.message === 'Invalid credentials' ? 401 : 500;
        res.status(status).json({ message: error.message });
    }
};

exports.deliveryBoyLogin = async (req, res) => {
    try {
        const { email, password, fcmToken } = req.body;
        const result = await authService.deliveryBoyLogin(email, password, fcmToken);
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        const status = error.message === 'Database connection is not ready' ? 503 :
            error.message === 'Invalid credentials' || error.message === 'Invalid credentials or account deactivated' ? 401 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.staffLogin = async (req, res) => {
    try {
        const { email, password, fcmToken } = req.body;
        const result = await authService.staffLogin(email, password, fcmToken);
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        const status = error.message === 'Database connection is not ready' ? 503 :
            error.message === 'Invalid credentials' || error.message === 'User not found' ? 401 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = req.user;
        res.json({
            id: user._id,
            name: user.name || (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : ''),
            email: user.email,
            role: user.roleId?.name || (req.userType === 'delivery' ? 'Delivery Boy' : null),
            profileImage: user.profileImage,
            permissions: req.permissions
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const user = await authService.updateProfile(req.user._id, req.body, req.file);
        res.json({
            message: 'Profile updated successfully',
            user
        });
    } catch (error) {
        const status = error.message === 'Current password does not match' ? 400 : 500;
        res.status(status).json({ message: error.message });
    }
};

exports.deleteProfileImage = async (req, res) => {
    try {
        await authService.deleteProfileImage(req.user._id);
        res.json({ message: 'Profile image deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getPublicProfileImage = async (req, res) => {
    try {
        const imagePath = await authService.getPublicProfileImage(req.params.id);
        res.sendFile(imagePath);
    } catch (error) {
        const status = error.message === 'Image not found' || error.message === 'Image file not found' ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
};
