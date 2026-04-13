const express = require('express');
const bannerController = require('./banner.controller');
const Authentication = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/upload.middleware');
const fs = require('fs');

const router = express.Router();

// Ensure upload directory exists
const uploadDir = 'uploads/banners';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Public routes
router.get('/active', bannerController.getActiveBanners);

// Admin routes (Protected)
router.use(Authentication);

router.post('/create-banner', upload.single('image'), bannerController.createBanner);
router.get('/banner-list', bannerController.getBanners);
router.get('/get-by-id/:bannerId', bannerController.getBanner);
router.patch('/banner-edit/:bannerId', upload.single('image'), bannerController.updateBanner);
router.patch('/update-banner-status/:bannerId', bannerController.updateBannerStatus);
router.delete('/banner-delete/:bannerId', bannerController.deleteBanner);

module.exports = router;
