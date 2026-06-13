const CartHistory = require('./cartHistory.model');
const Product = require('../products/product.model');

class CartHistoryService {
    /**
     * Log a cart action
     * @param {Object} data 
     * @param {String} data.userId
     * @param {String} data.productId
     * @param {String} data.variantId (optional)
     * @param {String} data.actionType - 'ADD', 'REMOVE', 'UPDATE', 'ORDER_PLACED'
     * @param {Number} data.quantity - Change in quantity or total new quantity (contextual)
     * @param {Number} data.previousQuantity - (optional)
     * @param {Number} data.price - (optional) snapshot price
     */
    async logAction(data) {
        try {
            const historyEntry = new CartHistory(data);
            await historyEntry.save();
            return historyEntry;
        } catch (error) {
            // Non-blocking log, so we don't throw to disrupt cart operations
            console.error('Failed to log cart history:', error);
        }
    }

    /**
     * Get cart history for a specific user
     */
    async getCartHistoryByUser(userId, filter = {}, options = {}) {
        const { actionType } = filter;
        const { limit = 20, page = 1 } = options;
        const skip = (page - 1) * limit;

        const query = { userId };
        if (actionType && actionType !== 'ALL') {
            query.actionType = actionType;
        }

        if (filter.search) {
            const matchingProducts = await Product.find({ 
                name: { $regex: filter.search, $options: 'i' } 
            }).select('_id');
            query.productId = { $in: matchingProducts.map(p => p._id) };
        }

        const [results, total] = await Promise.all([
            CartHistory.find(query)
                .populate('productId', 'name images')
                .populate('variantId', 'attributes')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            CartHistory.countDocuments(query)
        ]);

        return {
            results,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit),
            totalResults: total
        };
    }
}

module.exports = new CartHistoryService();
