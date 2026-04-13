const cartService = require('./cart.service');

exports.addToCart = async (req, res) => {
    try {
        const { productId, variantId, quantity = 1 } = req.body;
        const userId = req.user._id;

        await cartService.addToCart(userId, productId, variantId, quantity);
        const result = await cartService.getCartWithSummary(userId);

        console.log(`🛒 [Cart API] Item added/updated for User ${userId}. Returning full summary.`);
        res.status(201).json({
            success: true,
            cartItems: result.items,
            summary: result.summary
        });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const result = await cartService.getCartWithSummary(userId);

        res.json({
            success: true,
            cartItems: result.items,
            summary: result.summary,
            count: result.items.length
        });
        console.log(`🔍 [Cart API] Found ${result.items.length} items for User ${userId} with dynamic GST`);
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateQuantity = async (req, res) => {
    try {
        const { quantity } = req.body;
        const userId = req.user._id;

        await cartService.updateItemQuantity(userId, req.params.id, quantity);
        const result = await cartService.getCartWithSummary(userId);

        res.json({
            success: true,
            cartItems: result.items,
            summary: result.summary
        });
    } catch (error) {
        console.error('Update cart quantity error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.removeFromCart = async (req, res) => {
    try {
        await cartService.removeItem(req.user._id, req.params.id);
        res.json({ success: true, message: 'Item removed from cart' });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.clearCart = async (req, res) => {
    try {
        await cartService.clearCart(req.user._id);
        res.json({ success: true, message: 'Cart cleared' });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
