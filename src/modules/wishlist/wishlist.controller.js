const Wishlist = require('./wishlist.model');
const ProductVariant = require('../products/productVariant.model');

const getEnrichedWishlist = async (userId) => {
    const items = await Wishlist.find({ userId })
        .populate('productId', 'name images unitName brandName categoryName productType')
        .lean();

    return await Promise.all(
        items.map(async (item) => {
            if (item.variantId) {
                const variant = await ProductVariant.findById(item.variantId)
                    .populate('attributes.valueId', 'name')
                    .populate('attributes.variantTypeId', 'name')
                    .lean();
                return { ...item, variantData: variant || null };
            }
            return { ...item, variantData: null };
        })
    );
};

/**
 * GET /wishlist
 * Returns all wishlist items with populated product + variant data.
 */
exports.getWishlist = async (req, res) => {
    try {
        const data = await getEnrichedWishlist(req.user.id);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /wishlist/toggle
 * Body: { productId, variantId? }
 * Adds the item if it doesn't exist, removes it if it does (toggle).
 * Returns { added: true/false, data }
 */
exports.toggleWishlist = async (req, res) => {
    try {
        const { productId, variantId = null } = req.body;
        const userId = req.user.id;

        if (!productId) {
            return res.status(400).json({ success: false, message: 'productId is required' });
        }

        const filter = { userId, productId, variantId: variantId || null };
        const existing = await Wishlist.findOne(filter);

        if (existing) {
            await Wishlist.deleteOne({ _id: existing._id });
        } else {
            await Wishlist.create(filter);
        }

        const data = await getEnrichedWishlist(userId);
        return res.json({ success: true, added: !existing, data, message: existing ? 'Removed' : 'Added' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * DELETE /wishlist/:id
 * Remove a specific wishlist entry by its _id
 */
exports.removeFromWishlist = async (req, res) => {
    try {
        await Wishlist.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        const data = await getEnrichedWishlist(req.user.id);
        res.json({ success: true, data, message: 'Removed from wishlist' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * DELETE /wishlist/clear
 * Clear the entire wishlist for the authenticated user.
 */
exports.clearWishlist = async (req, res) => {
    try {
        await Wishlist.deleteMany({ userId: req.user.id });
        res.json({ success: true, message: 'Wishlist cleared' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
