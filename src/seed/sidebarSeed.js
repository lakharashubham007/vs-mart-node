require('dotenv').config();
const mongoose = require('mongoose');
const SidebarMenu = require('../modules/sidebar/sidebar.model');
const config = require('../config/config');

const sidebarData = [
    { "title": "Dashboard", "iconStyle": "<i className='la la-home' />", "parent_module_id": "1", "module_menu_priority": "1", "to": "dashboard" },
    { "title": "Materials", "to": "materials", "iconStyle": "<i className='la la-gg-circle' />", "parent_module_id": "-1", "module_menu_priority": "" },
    { "title": "Brands", "to": "brands", "iconStyle": "<i className='la la-industry' />", "parent_module_id": "-1", "module_menu_priority": "0" },
    { "title": "Employee Management", "classChange": "menu-title", "module_id": "13", "module_priority": "13" },
    {
        "title": "Employee Role", "to": "employee-role", "iconStyle": "<i className='la la-users' />", "parent_module_id": "13", "module_menu_priority": "1",
        "content": [
            { "title": "Add new", "to": "add-employee-role" },
            { "title": "List", "to": "employee-role" }
        ]
    },
    {
        "title": "Purchase Orders", "classsChange": "mm-collapse", "iconStyle": "<i className='la la-newspaper-o' />", "parent_module_id": "3", "module_menu_priority": "1",
        "content": [
            { "title": "Add New", "to": "addnewpurchaseorder" },
            { "title": "List", "to": "purchaseorderlist" },
            { "title": "Log Activities", "to": "purchaseorderlog" }
        ]
    },
    {
        "title": "Categories", "classsChange": "mm-collapse", "iconStyle": "<i className='la la-th-large' />", "parent_module_id": "-1", "module_menu_priority": "",
        "content": [
            { "title": "Category", "to": "categories" },
            { "title": "Sub Category", "to": "subcategories" },
            { "title": "Sub Sub Category", "to": "subsubcategories" }
        ]
    },
    { "title": "Main Menu", "extraClass": "first", "module_id": "1", "module_priority": "1", "classChange": "menu-title" },
    { "title": "Product Management", "classChange": "menu-title", "module_id": "2", "module_priority": "2" },
    {
        "title": "Products", "classsChange": "mm-collapse", "iconStyle": "<i className='la la-bank' />", "parent_module_id": "2", "module_menu_priority": "1",
        "content": [
            { "title": "Add New", "to": "addnewproduct" },
            { "title": "List", "to": "productlist" },
            { "title": "Bulk Import", "to": "bulkimport" }
        ]
    },
    { "title": "Fitting Size", "to": "fittingsize", "iconStyle": "<i className='la la-arrows' />", "parent_module_id": "-1", "module_menu_priority": "" },
    {
        "title": "Suppliers", "classsChange": "mm-collapse", "iconStyle": "<i className='la la-user-secret' />", "parent_module_id": "3", "module_menu_priority": "3",
        "content": [
            { "title": "Add New", "to": "addnewsupplier" },
            { "title": "List", "to": "supplierlist" }
        ]
    },
    {
        "title": "Employees", "classsChange": "mm-collapse", "iconStyle": "<i className='la la-rebel' />", "parent_module_id": "13", "module_menu_priority": "2",
        "content": [
            { "title": "Add new", "to": "add-new-employee" },
            { "title": "List", "to": "employee/list" }
        ]
    },
    { "title": "Parts", "to": "parts", "iconStyle": "<i className='la la-gears' />", "parent_module_id": "-1", "module_menu_priority": "" },
    { "title": "Threads", "to": "threads", "iconStyle": "<i className='la la-empire' />", "parent_module_id": "-1", "module_menu_priority": "" },
    { "title": "Purchase Order Management", "module_id": "3", "module_priority": "3", "classChange": "menu-title" },
    { "title": "Return Orders", "to": "returnorders", "iconStyle": "<i className='la la-undo' />", "parent_module_id": "3", "module_menu_priority": "2" },
    { "title": "Design", "to": "design", "iconStyle": "<i className='la la-sun-o' />", "parent_module_id": "2", "module_menu_priority": "2" },
    { "title": "Fitting Threads", "to": "fittingthreads", "iconStyle": "<i className='la la-futbol-o' />", "parent_module_id": "2", "module_menu_priority": "3" },
    { "title": "Hose Dash Size", "to": "hosedashsize", "iconStyle": "<i className='la la-eraser' />", "parent_module_id": "2", "module_menu_priority": "4" },
    { "title": "Fitting Dash Size", "to": "fittingdashsize", "iconStyle": "<i className='la la-connectdevelop' />", "parent_module_id": "2", "module_menu_priority": "5" },
    { "title": "Bend Angle", "to": "bendangle", "iconStyle": "<i className='la la-ioxhost' />", "parent_module_id": "2", "module_menu_priority": "6" },
    { "title": "Brand Lay Line", "to": "brandlayline", "iconStyle": "<i className='la la-shekel' />", "parent_module_id": "2", "module_menu_priority": "7" },
    { "title": "Hose Type", "to": "hosetype", "iconStyle": "<i className='la la-skyatlas' />", "parent_module_id": "2", "module_menu_priority": "8" },
    { "title": "Inventory Management", "classChange": "menu-title", "module_id": "5", "module_priority": "5" },
    { "title": "Inventory", "to": "inventory", "iconStyle": "<i className='la la-building-o' />", "parent_module_id": "5", "module_menu_priority": "1" },
    { "title": "Customer Management", "classChange": "menu-title", "module_id": "4", "module_priority": "4" },
    { "title": "Sales Order Management", "classChange": "menu-title", "module_id": "6", "module_priority": "6" },
    {
        "title": "Customer", "classsChange": "mm-collapse", "iconStyle": "<i className='la la-user-plus' />", "parent_module_id": "4", "module_menu_priority": "1",
        "content": [
            { "title": "Add New", "to": "add-customer" },
            { "title": "List", "to": "customer-list" }
        ]
    },
    {
        "title": "Sale Orders", "classsChange": "mm-collapse", "iconStyle": "<i className='la la-cart-plus' />", "parent_module_id": "6", "module_menu_priority": "1",
        "content": [
            { "title": "Add New", "to": "add-sales-order" },
            { "title": "List", "to": "sales-order-list" },
            { "title": "Log Activities", "to": "saleorderlog" }
        ]
    },
    { "title": "Production Sheet Management", "classChange": "menu-title", "module_id": "8", "module_priority": "8" },
    {
        "title": "Production Sheet", "classsChange": "mm-collapse", "iconStyle": "<i className='la la-file-text-o' />", "parent_module_id": "8", "module_menu_priority": "1",
        "content": [
            { "title": "Add New", "to": "production-sheet" },
            { "title": "List", "to": "production-sheet-list" },
            { "title": "Log Activities", "to": "productionsheetlog" }
        ]
    },
    { "title": "Store Management", "classChange": "menu-title", "module_id": "7", "module_priority": "7" },
    { "title": "Store", "to": "store", "iconStyle": "<i className='la la-industry' />", "parent_module_id": "7", "module_menu_priority": "1" },
    { "title": "Production Process Management", "classChange": "menu-title", "module_id": "9", "module_priority": "9" },
    { "title": "Production Process", "to": "production-process", "iconStyle": "<i className='la la-industry' />", "parent_module_id": "9", "module_menu_priority": "1" },
    {
        "title": "Operators", "classsChange": "mm-collapse", "iconStyle": "<i className='la la-user-plus' />", "parent_module_id": "9", "module_menu_priority": "3",
        "content": [
            { "title": "Add New", "to": "add-operator" },
            { "title": "List", "to": "operator-list" }
        ]
    },
    {
        "title": "Production Process List", "classsChange": "mm-collapse", "iconStyle": "<i className='la la-list' />", "parent_module_id": "9", "module_menu_priority": "2",
        "content": [
            { "title": "All Production List", "to": "production-process-list" },
            { "title": "In Progress", "to": "production-process-in-progress", "update": "5" },
            { "title": "Completed", "to": "production-process-completed", "update": "4" },
            { "title": "Pending", "to": "production-process-pending", "update": "9" }
        ]
    },
    { "title": "Stock Journal Management", "classChange": "menu-title", "module_id": "12", "module_priority": "12" },
    { "title": "Packing Management", "classChange": "menu-title", "module_id": "10", "module_priority": "10" },
    { "title": "Packing", "to": "packing", "iconStyle": "<i className='la la-truck' />", "parent_module_id": "10", "module_menu_priority": "1" },
    { "title": "GatePass Management", "classChange": "menu-title", "module_id": "11", "module_priority": "11" },
    { "title": "Gate Pass", "to": "gate-pass", "iconStyle": "<i className='la la-ticket' />", "parent_module_id": "11", "module_menu_priority": "1" },
    {
        "title": "Stock Journal", "classsChange": "mm-collapse", "iconStyle": "<i className='la la-connectdevelop' />", "parent_module_id": "12", "module_menu_priority": "1",
        "content": [
            { "title": "Stock Transfer", "to": "stock-journal" },
            { "title": "List", "to": "stock-transfer-list" }
        ]
    }
];

const seedSidebar = async () => {
    try {
        await mongoose.connect(config.mongoose.url);
        console.log('Connected to MongoDB for seeding');

        await SidebarMenu.deleteMany({});
        console.log('Cleared existing sidebar menus');

        await SidebarMenu.insertMany(sidebarData);
        console.log('Full Sidebar menus seeded successfully');

        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedSidebar();
