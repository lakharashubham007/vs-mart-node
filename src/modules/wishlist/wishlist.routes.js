const express = require('express');
const router = express.Router();
const wishlistController = require('./wishlist.controller');
const auth = require('../../middlewares/userAuth.middleware');

router.use(auth); // All routes require authentication

router.get('/', wishlistController.getWishlist);
router.post('/toggle', wishlistController.toggleWishlist);
router.delete('/clear', wishlistController.clearWishlist);
router.delete('/:id', wishlistController.removeFromWishlist);

module.exports = router;
