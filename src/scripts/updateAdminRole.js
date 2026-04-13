const mongoose = require('mongoose');
const Admin = require('../modules/admins/admin.model');
const Role = require('../modules/roles/role.model');
const SidebarMenu = require('../modules/sidebar/sidebar.model');
require('dotenv').config();

const updateAdminRole = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/vsmart');
        console.log('Connected to MongoDB');

        const admin = await Admin.findOne({ email: 'admin@vs.com' });
        if (!admin) {
            console.log('Admin user not found');
            process.exit(1);
        }
        console.log('Admin user found, role ID:', admin.roleId);

        const newMenus = await SidebarMenu.find({ module_id: { $in: ['user_mgmt', 'customers'] } });
        const newMenuIds = newMenus.map(m => m._id);
        console.log('Found new menu IDs:', newMenuIds);

        const role = await Role.findById(admin.roleId);
        if (!role) {
            console.log('Role not found');
            process.exit(1);
        }

        // Add new menu IDs if not already present
        let updated = false;
        const currentMenuIds = role.sidebarMenuIds.map(id => id.toString());
        
        newMenuIds.forEach(id => {
            if (!currentMenuIds.includes(id.toString())) {
                role.sidebarMenuIds.push(id);
                updated = true;
            }
        });

        if (updated) {
            await role.save();
            console.log('Updated role with new sidebar menus');
        } else {
            console.log('Role already has the menu IDs');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error updating admin role:', error);
        process.exit(1);
    }
};

updateAdminRole();
