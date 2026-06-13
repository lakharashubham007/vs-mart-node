const express = require('express');
const deliveryConfigController = require('./deliveryConfig.controller');

const router = express.Router();
router.use((req, res, next) => {
    console.log(`🚚 [DeliveryConfig Router] ${req.method} ${req.url}`);
    next();
});

router
    .route('/')
    .post(deliveryConfigController.createDeliveryConfig)
    .get(deliveryConfigController.getAllDeliveryConfigs);

router
    .route('/calculate')
    .post(deliveryConfigController.calculateDeliveryCharge);

router
    .route('/check')
    .post(deliveryConfigController.calculateDeliveryCharge);

router
    .route('/serviceability-check')
    .post(deliveryConfigController.checkServiceability)
    .get((req, res) => res.json({ message: 'Serviceability Check Endpoint is reachable' }));

router
    .route('/:id')
    .get(deliveryConfigController.getDeliveryConfigById)
    .put(deliveryConfigController.updateDeliveryConfig)
    .delete(deliveryConfigController.deleteDeliveryConfig);

router
    .route('/:id/status')
    .patch(deliveryConfigController.toggleStatus);

module.exports = router;
