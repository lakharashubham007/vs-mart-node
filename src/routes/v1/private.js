const express = require('express');
const Authentication = require('../../middlewares/auth.middleware');
const Authorization = require('../../middlewares/authorization.middleware');
const authController = require('../../modules/auth/auth.controller');
const roleRoutes = require('../../modules/roles/role.routes');
const adminRoutes = require('../../modules/admins/admin.routes');
const permissionController = require('../../modules/permissions/permission.controller');
const sidebarController = require('../../modules/sidebar/sidebar.controller');
const upload = require('../../middlewares/upload.middleware');
const router = express.Router();

const categoryRoutes = require('../../modules/categories/category.routes');
const subcategoryRoutes = require('../../modules/subcategories/subcategory.routes');
const brandRoutes = require('../../modules/brands/brand.routes');

const attributeRoutes = require('../../modules/attributes/attribute.routes');
const variantTypeRoutes = require('../../modules/variantTypes/variantType.routes');
const unitRoutes = require('../../modules/units/unit.routes');
const addonRoutes = require('../../modules/addons/addon.routes');
const productRoutes = require('../../modules/products/product.routes');
const taxRoutes = require('../../modules/taxes/tax.routes');
const bannerRoutes = require('../../modules/banners/banner.routes');
const offerRoutes = require('../../modules/offers/offer.routes');
const orderRoutes = require('../../modules/orders/order.routes');
const notificationRoutes = require('../../modules/notifications/notification.routes');
const pushNotificationRoutes = require('../../modules/notifications/pushNotification.routes');
const supportRoutes = require('../../modules/support/support.routes');
const stockRoutes = require('../../modules/stock/stock.routes');
const cmsRoutes = require('../../modules/cms/cms.routes');
const termsRoutes = require('../../modules/terms/terms.routes');
const privacyRoutes = require('../../modules/privacy/privacy.routes');
const analyticsRoutes = require('../../modules/analytics/analytics.routes');
const userRoutes = require('../../modules/users/user.routes');
const paymentRoutes = require('../../modules/payment/payment.routes');


router.get('/me', Authentication, authController.getMe);
router.put('/update-profile', Authentication, upload.single('profileImage'), authController.updateProfile);
router.delete('/delete-profile-image', Authentication, authController.deleteProfileImage);
router.get('/debug-routes', (req, res) => {
    const routes = router.stack.map(s => s.route ? s.route.path : s.name);
    res.json(routes);
});
// Admins (Staff)
router.use('/admins', adminRoutes);
// Roles
router.use('/roles', roleRoutes);

// Product Management Masters
router.use('/categories', categoryRoutes);
router.use('/subcategories', subcategoryRoutes);
router.use('/brands', brandRoutes);

router.use('/attributes', attributeRoutes);
router.use('/variant-types', variantTypeRoutes);
router.use('/units', unitRoutes);
router.use('/addons', addonRoutes);
router.use('/products', productRoutes);
router.use('/taxes', taxRoutes);
router.use('/banners', bannerRoutes);
router.use('/offers', offerRoutes);
router.use('/orders', Authentication, orderRoutes);
router.use('/notifications', Authentication, notificationRoutes);
router.use('/push-notifications', Authentication, pushNotificationRoutes);
router.use('/support', supportRoutes);
router.use('/stock', Authentication, stockRoutes);
router.use('/cms', cmsRoutes);
router.use('/terms', termsRoutes);
router.use('/privacy', privacyRoutes);
router.use('/analytics', Authentication, analyticsRoutes);
router.use('/users', Authentication, userRoutes);
router.use('/payment', Authentication, paymentRoutes);




//testing
// Permissions
router.post('/permissions/create-permission', Authentication, permissionController.createPermission);
router.get('/permissions/get-permissions', Authentication, permissionController.getPermissions);
router.put('/permissions/update-permission/:id', Authentication, permissionController.updatePermission);
router.delete('/permissions/delete-permission/:id', Authentication, permissionController.deletePermission);

// Sidebar Menus
router.post('/sidebar/create-menu', Authentication, sidebarController.createSidebarMenu);
router.get('/sidebar/get-menus', Authentication, sidebarController.getSidebarMenus);
router.get('/sidebar/get-all-menus', Authentication, sidebarController.getAllSidebarMenus);
router.put('/sidebar/update-menu/:id', Authentication, sidebarController.updateSidebarMenu);
router.delete('/sidebar/delete-menu/:id', Authentication, sidebarController.deleteSidebarMenu);


module.exports = router;
