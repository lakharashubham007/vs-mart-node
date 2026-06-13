const express = require('express');
const router = express.Router();
const cartController = require('./cart.controller');
// Admin authentication is already applied in private.js

// Admin views specific user cart
router.get('/', cartController.getCart);
// Admin views specific user cart history
router.get('/history', cartController.getCartHistory);

module.exports = router;
