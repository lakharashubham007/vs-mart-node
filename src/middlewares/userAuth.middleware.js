const jwt = require('jsonwebtoken');
const User = require('../modules/users/user.model');

const UserAuthentication = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        const user = await User.findById(decoded.id);

        if (!user || !user.status) {
            return res.status(401).json({ success: false, message: 'User not found or inactive' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

module.exports = UserAuthentication;
