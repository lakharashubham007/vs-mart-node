const jwt = require('jsonwebtoken');
const Admin = require('../modules/admins/admin.model');
const DeliveryBoy = require('../modules/deliveryBoy/deliveryBoy.model');
const User = require('../modules/users/user.model');
const Role = require('../modules/roles/role.model');

const Authentication = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        
        let user;
        let permissions = [];

        if (decoded.role === 'Delivery Boy') {
            user = await DeliveryBoy.findById(decoded.id).populate('roleId');
            if (user) {
                user.name = `${user.firstName} ${user.lastName || ''}`.trim();
                permissions = ['VIEW_ASSIGNMENTS', 'UPDATE_STATUS'];
                req.userType = 'delivery';
            }
        } else {
            // Try Admin first
            user = await Admin.findById(decoded.id).populate({
                path: 'roleId',
                populate: { path: 'permissionIds' }
            });

            if (user) {
                permissions = user.roleId?.permissionIds.map(p => p.key) || [];
                req.userType = 'staff';
            } else {
                // Try Regular User (Customer)
                user = await User.findById(decoded.id);
                if (user) {
                    req.userType = 'customer';
                    // Customers don't have specified permissions in the same way, 
                    // but we can add default ones if needed
                    permissions = ['CUSTOMER_ACCESS']; 
                }
            }
        }

        if (!user || !user.status) {
            let msg = 'Authentication failed';
            if (decoded.role === 'Delivery Boy') msg = 'Partner account not found or deactivated';
            else if (req.userType === 'staff') msg = 'Admin not found or inactive';
            else msg = 'User account not found or inactive';
            
            return res.status(401).json({ message: msg });
        }

        req.user = user;
        req.permissions = permissions;

        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = Authentication;
