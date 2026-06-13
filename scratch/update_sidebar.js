const mongoose = require('mongoose');
const SidebarMenu = require('../src/modules/sidebar/sidebar.model');
require('dotenv').config();

const updateSidebar = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB');

        // Find the "Coupons" menu
        const couponMenu = await SidebarMenu.findOne({ title: 'Coupons' });
        
        if (couponMenu) {
            console.log('Found Coupons menu, updating...');
            couponMenu.title = 'Offers';
            couponMenu.to = 'offers-list'; // Matching routes/index.jsx
            
            // Update submenus
            if (couponMenu.content && couponMenu.content.length > 0) {
                couponMenu.content.forEach(sub => {
                    if (sub.title === 'Add New') {
                        sub.to = 'offers/create';
                    } else if (sub.title === 'List') {
                        sub.to = 'offers-list';
                    }
                    sub.title = sub.title.replace('Coupon', 'Offer');
                });
            }
            
            await couponMenu.save();
            console.log('Sidebar menu updated successfully');
        } else {
            console.log('Coupons menu not found in database');
            // Try searching for "Offers" to see if it's already updated but needs route fixes
            const offerMenu = await SidebarMenu.findOne({ title: 'Offers' });
            if (offerMenu) {
                console.log('Found Offers menu, fixing routes...');
                offerMenu.to = 'offers-list';
                if (offerMenu.content) {
                    offerMenu.content.forEach(sub => {
                        if (sub.title === 'Add New') sub.to = 'offers/create';
                        if (sub.title === 'List') sub.to = 'offers-list';
                    });
                }
                await offerMenu.save();
                console.log('Offers menu routes updated');
            }
        }

        mongoose.disconnect();
    } catch (error) {
        console.error('Error updating sidebar:', error);
        process.exit(1);
    }
};

updateSidebar();
