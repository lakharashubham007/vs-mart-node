const express = require('express');
const router = express.Router();
const cartController = require('./cart.controller');
const auth = require('../../middlewares/userAuth.middleware');

router.use(auth); // All cart routes require CUSTOMER authentication

router.post('/add', cartController.addToCart);
router.patch('/update-item', cartController.updateItemLight);
router.post('/bulk-update', cartController.bulkUpdateItems);
router.get('/summary', cartController.getCartSummary);
router.get('/', cartController.getCart);
router.get('/history', cartController.getCartHistory);
router.put('/update/:id', cartController.updateQuantity);
router.delete('/remove/:id', cartController.removeFromCart);
router.delete('/clear', cartController.clearCart);

module.exports = router;
