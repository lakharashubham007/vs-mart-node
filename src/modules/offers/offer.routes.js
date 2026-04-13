const express = require('express');
const offerController = require('./offer.controller');
const Authentication = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/upload.middleware');
const fs = require('fs');

const router = express.Router();

// Ensure upload directory exists
const uploadDir = 'uploads/offers';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Public routes
router.get('/active', offerController.getActiveOffers);

// Admin routes (Protected)
router.use(Authentication);

router.post('/create-offer', upload.single('image'), offerController.createOffer);
router.get('/offer-list', offerController.getOffers);
router.get('/get-by-id/:offerId', offerController.getOffer);
router.patch('/offer-edit/:offerId', upload.single('image'), offerController.updateOffer);
router.patch('/update-offer-status/:offerId', offerController.updateOfferStatus);
router.delete('/offer-delete/:offerId', offerController.deleteOffer);

module.exports = router;
