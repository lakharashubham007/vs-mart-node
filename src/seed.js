const mongoose = require('mongoose');
require('dotenv').config();

const SidebarMenu = require('./modules/sidebar/sidebar.model');
const Permission = require('./modules/permissions/permission.model');

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL || 'mongodb+srv://dexterdigi:dexterdigi26@ecommerce.cxuy4sz.mongodb.net/ecommerce?retryWrites=true&w=majority');
        console.log('Connected to MongoDB');

        // Delete all existing entries
        await SidebarMenu.deleteMany({});
        await Permission.deleteMany({});
        console.log('Cleared existing Sidebar Menus and Permissions.');

        // 1. Create Sidebar Menus with correct MgiBasket Schema
        const menus = [
            // --- MAIN MENU ---
            { title: 'Main Menu', classChange: 'menu-title', module_id: 'main_menu', parent_module_id: '-1', hasMenu: false },
            {
                title: 'Dashboard',
                iconStyle: "<i className='la la-home'></i>",
                to: 'dashboard',
                parent_module_id: 'main_menu',
                hasMenu: false
            },

            // --- EMPLOYEE MANAGEMENT ---
            { title: 'Employee Management', classChange: 'menu-title', module_id: 'emp_mgmt', parent_module_id: '-1', hasMenu: false },
            {
                title: 'Employees',
                iconStyle: "<i className='la la-users'></i>",
                parent_module_id: 'emp_mgmt',
                hasMenu: true,
                content: [
                    { title: 'Add New', to: 'admins/create-admin' },
                    { title: 'List', to: 'admins/get-admins' }
                ]
            },

            // --- ACCESS CONTROL ---
            { title: 'Access Control', classChange: 'menu-title', module_id: 'access_ctrl', parent_module_id: '-1', hasMenu: false },
            {
                title: 'Role Management',
                iconStyle: "<i className='la la-shield'></i>",
                parent_module_id: 'access_ctrl',
                hasMenu: true,
                content: [
                    { title: 'Add New', to: 'roles/create-role' },
                    { title: 'List', to: 'roles/get-roles' }
                ]
            }
        ];

        await SidebarMenu.insertMany(menus);
        console.log('Inserted new Sidebar Menus successfully with correct schema.');

        // 2. Create Permissions (Only for Roles Module)
        const rolePermissions = [
            { name: 'Create Role', key: 'CREATE_ROLE', module: 'ROLE', route: 'create-role', description: 'Allows creating a new role' },
            { name: 'View Roles', key: 'VIEW_ROLES', module: 'ROLE', route: 'get-roles', description: 'Allows viewing roles list' },
            { name: 'View Single Role', key: 'VIEW_ROLE', module: 'ROLE', route: 'get-role', description: 'Allows viewing a single role' },
            { name: 'Update Role', key: 'UPDATE_ROLE', module: 'ROLE', route: 'update-role', description: 'Allows updating an existing role' },
            { name: 'Delete Role', key: 'DELETE_ROLE', module: 'ROLE', route: 'delete-role', description: 'Allows deleting a role' },
            { name: 'View Permissions', key: 'VIEW_PERMISSIONS', module: 'ROLE', route: 'get-permissions', description: 'Allows viewing permissions list during role creation' }
        ];

        await Permission.insertMany(rolePermissions);
        console.log('Inserted new Permissions for Roles module successfully.');

        // 3. Create Super Admin Role with all menus and permissions
        const Role = require('./modules/roles/role.model');
        const Admin = require('./modules/admins/admin.model');

        await Role.deleteMany({});
        console.log('Cleared existing Roles.');

        const allMenus = await SidebarMenu.find({}, '_id');
        const allPermissions = await Permission.find({}, '_id');

        const superAdminRole = await Role.create({
            name: 'Super Admin',
            isDefault: true,
            status: true,
            sidebarMenuIds: allMenus.map(m => m._id),
            permissionIds: allPermissions.map(p => p._id)
        });
        console.log('Created Super Admin role with all menus and permissions.');

        // 4. Update all existing Admins to have this new Super Admin role
        const updateResult = await Admin.updateMany({}, { $set: { roleId: superAdminRole._id } });
        console.log(`Updated ${updateResult.modifiedCount} admin(s) to use the new Super Admin role.`);

        console.log('Seeding completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedDB();
