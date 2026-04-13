const mongoose = require('mongoose');
const SidebarMenu = require('../modules/sidebar/sidebar.model');
require('dotenv').config();

const seedCustomersMenu = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/vsmart');
        console.log('Connected to MongoDB');

        // Check if "Customers" menu already exists
        const existing = await SidebarMenu.findOne({ title: 'Customers' });
        if (existing) {
            console.log('Customers menu already exists');
            process.exit(0);
        }

        // Find "User Management" or "Dashboard" group if exists, or add to standalone
        // I'll add it under a "User Management" title header if not exists, or just as a standalone item.
        
        // Let's find if there's a menu-title for "User Management"
        let userMgmtHeader = await SidebarMenu.findOne({ title: 'USER MANAGEMENT', classChange: 'menu-title' });
        
        if (!userMgmtHeader) {
            userMgmtHeader = await SidebarMenu.create({
                title: 'USER MANAGEMENT',
                classChange: 'menu-title',
                module_id: 'user_mgmt',
                module_priority: '70'
            });
            console.log('Created USER MANAGEMENT header');
        }

        const customerMenu = await SidebarMenu.create({
            title: 'Customers',
            iconStyle: '<i className=\'la la-users\' />',
            to: 'customers',
            parent_module_id: userMgmtHeader.module_id,
            module_id: 'customers',
            module_priority: '71',
            hasMenu: false
        });

        console.log('Created Customers menu item');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding customers menu:', error);
        process.exit(1);
    }
};

seedCustomersMenu();
