require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../modules/admins/admin.model');
const Role = require('../modules/roles/role.model');
const Permission = require('../modules/permissions/permission.model');
const SidebarMenu = require('../modules/sidebar/sidebar.model');
const config = require('../config/config');

const permissionsData = [
    { name: 'View Dashboard', key: 'VIEW_DASHBOARD', module: 'CORE', route: 'dashboard' },
    { name: 'View Employees', key: 'VIEW_ADMINS', module: 'EMPLOYEECONTROL', route: 'get-admins' },
    { name: 'Create Employee', key: 'CREATE_ADMIN', module: 'EMPLOYEECONTROL', route: 'create-admin' },
    { name: 'Update Employee', key: 'UPDATE_ADMIN', module: 'EMPLOYEECONTROL', route: 'update-admin' },
    { name: 'Delete Employee', key: 'DELETE_ADMIN', module: 'EMPLOYEECONTROL', route: 'delete-admin' },
    { name: 'View Roles', key: 'VIEW_ROLES', module: 'PERMISSIONCONTROL', route: 'get-roles' },
    { name: 'Create Role', key: 'CREATE_ROLE', module: 'PERMISSIONCONTROL', route: 'create-role' },
    { name: 'Update Role', key: 'UPDATE_ROLE', module: 'PERMISSIONCONTROL', route: 'update-role' },
    { name: 'Delete Role', key: 'DELETE_ROLE', module: 'PERMISSIONCONTROL', route: 'delete-role' },
    { name: 'View Permissions', key: 'VIEW_PERMISSIONS', module: 'PERMISSIONCONTROL', route: 'get-permissions' },
    { name: 'Create Permission', key: 'CREATE_PERMISSION', module: 'PERMISSIONCONTROL', route: 'create-permission' },
    { name: 'Update Permission', key: 'UPDATE_PERMISSION', module: 'PERMISSIONCONTROL', route: 'update-permission' },
    { name: 'Delete Permission', key: 'DELETE_PERMISSION', module: 'PERMISSIONCONTROL', route: 'delete-permission' },
    { name: 'Manage Sidebar', key: 'MANAGE_SIDEBAR', module: 'SIDEBARCONTROL', route: 'create-menu' },
    { name: 'View Sidebar Menus', key: 'VIEW_SIDEBAR', module: 'SIDEBARCONTROL', route: 'get-menus' }
];

const sidebarData = [
    { "title": "Dashboard", "iconStyle": "<i className='la la-home' />", "parent_module_id": "1", "module_menu_priority": "1", "to": "dashboard" },

    { "title": "Main Menu", "module_id": "1", "module_priority": "1", "classChange": "menu-title" },

    { "title": "Employee Management", "classChange": "menu-title", "module_id": "13", "module_priority": "2" },
    {
        "title": "Employees", "classsChange": "mm-collapse", "iconStyle": "<i className='la la-users' />", "parent_module_id": "13", "module_menu_priority": "1",
        "content": [
            { "title": "Add New Employee", "to": "admins/create-admin" },
            { "title": "Employee List", "to": "admins/get-admins" }
        ]
    },

    { "title": "Access Control", "classChange": "menu-title", "module_id": "14", "module_priority": "3" },
    {
        "title": "Role Management", "classsChange": "mm-collapse", "iconStyle": "<i className='la la-shield' />", "parent_module_id": "14", "module_menu_priority": "1",
        "content": [
            { "title": "Create Role", "to": "roles/create-role" },
            { "title": "Role List", "to": "roles/get-roles" }
        ]
    },

    { "title": "Product Management", "classChange": "menu-title", "module_id": "15", "module_priority": "4" },
    {
        "title": "Products", "classsChange": "mm-collapse", "iconStyle": "<i className='la la-box' />", "parent_module_id": "15", "module_menu_priority": "1",
        "content": [
            { "title": "Add New Product", "to": "products/add-product" },
            { "title": "Product List", "to": "products/list-products" },
            { "title": "Master Management", "to": "products/master-management" }
        ]
    },
    {
        "title": "Categories", "classsChange": "mm-collapse", "iconStyle": "<i className='la la-th-large' />", "parent_module_id": "15", "module_menu_priority": "2",
        "content": [
            { "title": "Categories", "to": "categories" },
            { "title": "Subcategories", "to": "subcategories" }
        ]
    }
];

const masterSeed = async () => {
    try {
        await mongoose.connect(config.mongoose.url);
        console.log('Connected to MongoDB for master seeding (Trimming)');

        // 1. Seed Permissions
        await Permission.deleteMany({});
        const permissions = await Permission.insertMany(permissionsData);
        console.log('Permissions seeded.');

        // 2. Seed Sidebar Menus
        await SidebarMenu.deleteMany({});
        const sidebarMenus = await SidebarMenu.insertMany(sidebarData);
        console.log('Sidebar menus seeded.');

        // 3. Create Super Admin Role
        const role = await Role.findOneAndUpdate(
            { name: 'Super Admin' },
            {
                permissionIds: permissions.map(p => p._id),
                sidebarMenuIds: sidebarMenus.map(m => m._id),
                status: true
            },
            { new: true, upsert: true }
        );
        console.log('Super Admin role created/updated.');

        // 4. Create Super Admin User
        const passwordHash = await bcrypt.hash('admin123', 10);
        await Admin.findOneAndUpdate(
            { email: 'admin@dexterdigi.com' },
            {
                name: 'Super Admin',
                password: passwordHash,
                roleId: role._id,
                status: true,
                isDeleted: false
            },
            { new: true, upsert: true }
        );
        console.log('Super Admin user created/updated.');

        process.exit(0);
    } catch (error) {
        console.error('Master seeding failed:', error);
        process.exit(1);
    }
};

masterSeed();
