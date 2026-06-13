const express = require('express');
const Authentication = require('../../middlewares/auth.middleware');
const offerController = require('./offer.controller');

const router = express.Router();

router.use(Authentication);

router
    .route('/')
    .post(offerController.createOffer)
    .get(offerController.getOffers);

router
    .route('/:offerId')
    .get(offerController.getOffer)
    .put(offerController.updateOffer)
    .delete(offerController.deleteOffer);

router.patch('/:offerId/toggle-status', offerController.toggleStatus);
router.get('/:offerId/usage', offerController.getUsageAnalytics);

// Customer endpoints
router.get('/customer/available', offerController.getAvailableOffers);
router.post('/customer/apply', offerController.applyOffer);

module.exports = router;
