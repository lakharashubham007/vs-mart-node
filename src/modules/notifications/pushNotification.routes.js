const express = require('express');
const router = express.Router();
const pushController = require('./pushNotification.controller');

// POST /private/push-notifications/send
router.post('/send', pushController.sendPushNotification);

// GET /private/push-notifications/history
router.get('/history', pushController.getPushHistory);

// GET /private/push-notifications/history/:id/recipients
router.get('/history/:id/recipients', pushController.getHistoryRecipients);

module.exports = router;
