const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const UserAuthentication = require('../../middlewares/userAuth.middleware');
const upload = require('../../middlewares/upload.middleware');

// Public routes for mobile/web app users
router.post('/login', userController.login);
router.post('/register', userController.register);
router.post('/verify-otp', userController.verifyOTP);
router.post('/refresh', userController.refreshToken);

// Protected routes for mobile app
router.get('/me', UserAuthentication, userController.getMe);
router.patch('/update-profile', UserAuthentication, upload.single('profileImage'), userController.updateProfile);
router.post('/address', UserAuthentication, userController.addAddress);
router.get('/address', UserAuthentication, userController.getAddresses);
router.put('/address/:id', UserAuthentication, userController.updateAddress);
router.delete('/address/:id', UserAuthentication, userController.deleteAddress);

// Saved Cards
router.post('/saved-cards', UserAuthentication, userController.addSavedCard);
router.delete('/saved-cards/:cardId', UserAuthentication, userController.deleteSavedCard);

// FCM Push Notification Token
router.post('/fcm-token', UserAuthentication, userController.saveFcmToken);

// Account deletion
router.delete('/delete-account', UserAuthentication, userController.deleteAccount);

// Admin routes (handled via private.js mounting with Authentication)
router.get('/', userController.getUsers);
router.post('/register-by-admin', userController.registerCustomerByAdmin);

module.exports = router;
