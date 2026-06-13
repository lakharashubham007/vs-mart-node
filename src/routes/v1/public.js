const express = require('express');
const authController = require('../../modules/auth/auth.controller');
const categoryController = require('../../modules/categories/category.controller');
const userRoutes = require('../../modules/users/user.routes');
const bannerController = require('../../modules/banners/banner.controller');

const productsController = require('../../modules/products/product.controller');
const UserAuthentication = require('../../middlewares/userAuth.middleware');
const orderRoutes = require('../../modules/orders/order.routes');
const authRoutes = require('../../modules/auth/auth.routes');
const cartRoutes = require('../../modules/carts/cart.routes');
const wishlistRoutes = require('../../modules/wishlist/wishlist.routes');
const supportController = require('../../modules/support/support.controller');
const cmsController = require('../../modules/cms/cms.controller');
const termsController = require('../../modules/terms/terms.controller');
const privacyController = require('../../modules/privacy/privacy.controller');
const shareRoutes = require('../../modules/share/share.routes');
const storyController = require('../../modules/stories/story.controller');
const deliveryConfigRoutes = require('../../modules/deliveryConfig/deliveryConfig.routes');

const router = express.Router();

router.use((req, res, next) => {
    console.log(`🛣️ [Public Router] ${req.method} ${req.url}`);
    next();
});

router.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Dexter Digi API is running' });
});

router.use('/delivery', deliveryConfigRoutes);

router.get('/cms/:type', cmsController.getCMSByType);
router.get('/terms/active', termsController.getPublicTerms);
router.get('/privacy/active', privacyController.getPublicPrivacies);

// Beautiful Landing Page Data API
router.get('/product-details/:slug', productsController.getProductDetailsForPublic);
router.get('/barcode/:ean', productsController.getProductByEan);

router.use('/', authRoutes);

router.get('/categories', categoryController.getCategories);
router.get('/categories-tree', categoryController.getCategoriesWithSubcategories);
router.get('/banners/active', bannerController.getActiveBanners);
router.get('/offers/active', (req, res, next) => {
    req.query.type = 'OFFER_BANNER';
    bannerController.getActiveBanners(req, res, next);
});

router.get('/admin-image/:id', authController.getPublicProfileImage);
router.get('/category-image/:id', categoryController.getPublicCategoryImage);
router.get('/support', supportController.getActiveSupport);
router.get('/stories/active', storyController.getAppStories);

// Public Product Routes
router.get('/products/get-products', productsController.getProducts);
router.get('/products/get-all-products', productsController.getAllProducts);
router.get('/products/:id', productsController.getProductById);
router.get('/products/search', productsController.searchProducts);

router.use('/user', userRoutes);
router.use('/orders', UserAuthentication, orderRoutes);
router.use('/cart', UserAuthentication, cartRoutes);
router.use('/wishlist', wishlistRoutes);

const Authentication = require('../../middlewares/auth.middleware');
router.use('/share', Authentication, shareRoutes);

module.exports = router;
