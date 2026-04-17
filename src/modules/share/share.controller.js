const { generateShortLink } = require('../../utils/dynamicLinkService');

/**
 * Generate a short dynamic link for a product.
 * 
 * POST /api/share/generate-link
 */
exports.generateLink = async (req, res) => {
    try {
        const { productId, title, image } = req.body;

        if (!productId) {
            return res.status(400).json({ success: false, message: 'productId is required' });
        }

        const shortLink = await generateShortLink({
            productId,
            title: title || 'Check this out!',
            image: image || '',
            description: 'Shop amazing products on VS Mart!'
        });

        res.json({
            success: true,
            shortLink
        });
    } catch (error) {
        console.error('[ShareController] generateLink error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
