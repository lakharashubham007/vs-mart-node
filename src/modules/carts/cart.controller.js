const cartService = require('./cart.service');
const cartHistoryService = require('./cartHistory.service');


exports.addToCart = async (req, res) => {
    try {
        const { productId, variantId, quantity = 1 } = req.body;
        const userId = req.user._id;

        // Still using the heavy one for initial "Add" if needed, 
        // but for performance we should shift to updateItemLight soon.
        await cartService.addToCart(userId, productId, variantId, quantity);
        
        // Return lightweight success
        res.status(201).json({
            success: true,
            message: 'Item added'
        });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * PATCH /cart/update-item
 * Lightweight update — NO SUMMARY
 */
exports.updateItemLight = async (req, res) => {
    try {
        const { productId, variantId, quantity } = req.body;
        const userId = req.user._id;

        const item = await cartService.updateItemLight(userId, productId, variantId, quantity);

        res.json({
            success: true,
            item: {
                productId,
                variantId,
                quantity
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * POST /cart/bulk-update
 * Batched update — NO SUMMARY
 */
exports.bulkUpdateItems = async (req, res) => {
    try {
        const { updates } = req.body;
        const userId = req.user._id;

        await cartService.bulkUpdateItems(userId, updates);

        res.json({ success: true, message: 'Cart synced' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * GET /cart/summary
 * Heavy calculation — Only call when needed
 */
exports.getCartSummary = async (req, res) => {
    try {
        const userId = req.user._id;
        const result = await cartService.getCartWithSummary(userId);

        res.json({
            success: true,
            cartItems: result.items,
            summary: result.summary
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getCart = async (req, res) => {
    try {
        const userId = req.query.userId || req.user._id;
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

exports.getCartHistory = async (req, res) => {
    try {
        const { actionType, search, page, limit } = req.query;
        // Allows fetching history for a specific user, especially useful for admin view
        const targetUserId = req.query.userId || req.user._id;

        const result = await cartHistoryService.getCartHistoryByUser(targetUserId, { actionType, search }, { page, limit });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Get cart history error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
