const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URL = process.env.MONGODB_URL;

const updateSidebar = async () => {
    try {
        await mongoose.connect(MONGODB_URL);
        console.log('Connected to MongoDB');

        const SidebarMenu = mongoose.connection.collection('sidebarmenus');

        // Check if already exists
        const existing = await SidebarMenu.findOne({ module_id: "delivery_management" });
        if (existing) {
            console.log('Delivery Management menu already exists');
            process.exit();
        }

        // Find the 'Main' header or similar
        const mainHeader = await SidebarMenu.findOne({ title: 'Main', classChange: 'menu-title' });
        const parentId = mainHeader ? mainHeader.module_id : "1";

        const deliveryMenu = {
            title: "Delivery Management",
            iconStyle: "<i className='la la-truck' />",
            to: "delivery-boy/list",
            parent_module_id: parentId,
            module_id: "delivery_management",
            module_priority: "10",
            module_menu_priority: "10",
            hasMenu: true,
            content: [
                { title: "Delivery Boys", to: "delivery-boy/list", update: "delivery-boy/list" },
                { title: "Add Delivery Boy", to: "delivery-boy/add", update: "delivery-boy/add" }
            ],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await SidebarMenu.insertOne(deliveryMenu);
        console.log('Delivery Management menu added to sidebar');
        
        process.exit();
    } catch (error) {
        console.error('Error updating sidebar:', error);
        process.exit(1);
    }
};

updateSidebar();
