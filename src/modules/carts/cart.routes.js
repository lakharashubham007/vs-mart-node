const express = require('express');
const router = express.Router();
const cartController = require('./cart.controller');
const auth = require('../../middlewares/userAuth.middleware');

router.use(auth); // All cart routes require CUSTOMER authentication

router.post('/add', cartController.addToCart);
router.get('/', cartController.getCart);
router.put('/update/:id', cartController.updateQuantity);
router.delete('/remove/:id', cartController.removeFromCart);
router.delete('/clear', cartController.clearCart);

module.exports = router;
