const mongoose = require('mongoose');
const SidebarMenu = require('../src/modules/sidebar/sidebar.model');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/vs-mart';

const updateSidebar = async () => {
    try {
        await mongoose.connect(MONGODB_URL);
        console.log('Connected to MongoDB');

        // 1. Create or Find CMS Parent Menu
        let cmsParent = await SidebarMenu.findOne({ title: 'CMS' });
        if (!cmsParent) {
            console.log('Creating CMS Parent Menu...');
            cmsParent = await SidebarMenu.create({
                title: 'CMS',
                iconStyle: '<i className="la la-file-text-o"></i>',
                to: '#',
                parent_module_id: 'CMS_MODULE',
                module_id: 'CMS_PARENT',
                module_priority: '90', // High priority, near bottom
                hasMenu: true,
                content: []
            });
        }

        // 2. Define CMS sub-menus
        const cmsSubmenus = [
            { title: 'Terms & Conditions', to: 'cms/terms' },
            { title: 'Privacy Policy', to: 'cms/privacy' },
            { title: 'Contact Us', to: 'cms/contact-us' }
        ];

        // 3. Update CMS parent with sub-menus
        cmsParent.content = cmsSubmenus;
        await cmsParent.save();
        console.log('CMS group updated with sub-menus');

        // 4. Rename standalone Support menu and hide it if needed
        // We find the existing Support menu by title or known to: 'support'
        const supportMenu = await SidebarMenu.findOne({ to: 'support' });
        if (supportMenu) {
            console.log('Found existing Support menu, moving it to Contact Us...');
            // Optional: Hide or delete if we want it strictly under CMS
            await SidebarMenu.deleteOne({ _id: supportMenu._id });
            console.log('Old standalone Support menu removed.');
        }

        console.log('Sidebar restructuring completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error updating sidebar:', error);
        process.exit(1);
    }
};

updateSidebar();
