const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.post('/login', authController.login);
router.post('/delivery-login', authController.deliveryBoyLogin);
router.post('/staff-login', authController.staffLogin);
router.get('/me', authMiddleware, authController.getMe);
router.patch('/update-fcm', authMiddleware, authController.updateFcmToken);
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
