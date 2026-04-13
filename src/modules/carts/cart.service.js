const Cart = require('./cart.model');
const Product = require('../products/product.model');
const ProductVariant = require('../products/productVariant.model');
const stockService = require('../stock/stock.service');
const mongoose = require('mongoose');

/**
 * Cart Service for handling business logic related to shopping carts.
 */
class CartService {
    /**
     * Add or update an item in the cart.
     */
    async addToCart(userId, productId, variantId, quantity = 1) {
        // Fetch product to determine type
        const product = await Product.findById(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        let query = { userId, productId };

        if (product.productType === 'Variant') {
            if (!variantId) {
                throw new Error('variantId is required for products with variants');
            }
            query.variantId = variantId;
        } else {
            query.variantId = null;
        }

        // --- Check available stock & get oldest batch (FIFO) ---
        const stockMap = await stockService.getAggregatedStockForSingleProduct(productId);
        const vId = variantId ? variantId.toString() : 'base';
        const stockInfo = stockMap[vId];
        // [FIFO] Restrict available stock to the first active batch only
        const availableStock = (stockInfo && stockInfo.batches?.length > 0) 
            ? stockInfo.batches[0].quantity 
            : (stockInfo ? stockInfo.quantity : 0);

        if (availableStock <= 0) {
            throw new Error('This product is currently out of stock.');
        }

        // Get the oldest batch ID from the aggregates
        const oldestEntry = stockInfo?.batches?.[0]; // Batches are sorted old -> new
        const stockInId = oldestEntry ? oldestEntry.stockInId : null;

        const existingItem = await Cart.findOne(query);
        const currentCartQty = existingItem ? existingItem.quantity : 0;
        const totalRequestedQty = currentCartQty + quantity;

        if (totalRequestedQty > availableStock) {
            throw new Error(`Cannot add to cart. Only ${availableStock} units available in stock.`);
        }

        // Use update with upsert, and set stockInId if it's a new item or needs sync
        const cartItem = await Cart.findOneAndUpdate(
            query,
            { 
                $inc: { quantity: quantity },
                $setOnInsert: { stockInId: stockInId } // Persist the batch ID on initial add
            },
            { new: true, upsert: true }
        );

        // If existing item didn't have stockInId, update it (migration/sync)
        if (cartItem && !cartItem.stockInId && stockInId) {
            cartItem.stockInId = stockInId;
            await cartItem.save();
        }

        return cartItem;
    }

    /**
     * Get user's cart with a comprehensive bill summary.
     */
    async getCartWithSummary(userId) {
        const cartItems = await Cart.find({ userId })
            .populate({
                path: 'productId'
            })
            .populate({
                path: 'variantId'
            })
            .lean();

        let summary = {
            mrpTotal: 0,
            sellingPriceTotal: 0,
            finalSellingPriceTotal: 0,
            totalSavings: 0,
            gstTotal: 0,
            deliveryCharge: 0,
            orderTotal: 0
        };

        const productIds = [...new Set(cartItems.filter(i => i.productId).map(item => item.productId._id.toString()))];
        const bulkStockMap = await stockService.getAggregatedStockForProducts(productIds);

        const processedItems = cartItems.map(item => {
            const product = item.productId;
            const variant = item.variantId;
            const qty = item.quantity;

            const pIdStr = product?._id.toString();
            const vIdStr = variant ? variant._id.toString() : 'base';
            
            let stockQuantity = 0;
            let batchNo = null;
            let stockInId = item.stockInId;
            let pricing = null;

            // Find valid stock info from aggregated map
            if (pIdStr && bulkStockMap[pIdStr] && bulkStockMap[pIdStr][vIdStr]) {
                const s = bulkStockMap[pIdStr][vIdStr];
                // [FIFO] Restrict available stock to the first active batch only
                stockQuantity = (s.batches && s.batches.length > 0) ? s.batches[0].quantity : (s.quantity || 0);
                
                // If we have a persisted stockInId, try to find that specific batch's data
                if (stockInId) {
                    const specificBatch = s.batches.find(b => b.stockInId.toString() === stockInId.toString());
                    if (specificBatch) {
                        batchNo = specificBatch.batchNo;
                        pricing = specificBatch.pricing;
                    }
                }

                // If no specific batch found (or no stockInId persisted), fall back to oldest available batch (FIFO)
                if (!pricing) {
                    const oldestBatch = s.batches[0];
                    if (oldestBatch) {
                        batchNo = oldestBatch.batchNo;
                        pricing = oldestBatch.pricing;
                        // For display consistency, use the oldest batch ID if none was persisted
                        if (!stockInId) stockInId = oldestBatch.stockInId;
                    }
                }
            }

            // Fallback to legacy structure if stock pricing is missing
            if (!pricing) {
                pricing = (variant && variant.pricing) ? variant.pricing : (product ? product.pricing : null);
            }

            if (!pricing) return { ...item, itemSummary: null, stockQuantity, batchNo, stockInId };

            const mrp = (Number(pricing.mrp) || 0) * qty;
            const sellingPrice = (Number(pricing.sellingPrice) || 0) * qty;
            const finalSellingPrice = (Number(pricing.finalSellingPrice) || Number(pricing.sellingPrice) || 0) * qty;

            // GST Calculation
            let gstAmount = 0;
            // The taxId is stored in the batch pricing. We need its rate.
            // In getCartWithSummary, the pricing comes from stock records which might not have taxId fully populated.
            const tax = pricing.taxId; 

            if (tax && typeof tax === 'object' && tax.rate) {
                // GST is calculated on the final selling price (which is now exclusive of tax)
                gstAmount = (finalSellingPrice * Number(tax.rate)) / 100;
            } else if (tax && (typeof tax === 'string' || mongoose.Types.ObjectId.isValid(tax))) {
                // If it's just an ID, we might need to fetch the rate.
                // However, the best place is to ensure it's populated in the stock query or product query.
                // For now, let's assume the frontend provides it or we have a fallback if possible.
                // In this system, tax is typically part of the variant/product pricing which we populated.
            }

            const itemSummary = {
                mrp,
                sellingPrice,
                finalSellingPrice,
                gstAmount,
                savings: mrp - finalSellingPrice
            };

            // Accumulate totals
            summary.mrpTotal += itemSummary.mrp;
            summary.sellingPriceTotal += itemSummary.sellingPrice;
            summary.finalSellingPriceTotal += itemSummary.finalSellingPrice;
            summary.gstTotal += itemSummary.gstAmount;
            summary.totalSavings += itemSummary.savings;

            return {
                ...item,
                itemSummary,
                pricing, // <--- Add unit pricing for frontend mapping
                stockQuantity,
                batchNo,
                stockInId
            };
        });

        // Final Order Total Calculation - Rounded up to nearest whole number
        summary.orderTotal = Math.ceil(summary.finalSellingPriceTotal + summary.gstTotal + summary.deliveryCharge);

        return {
            items: processedItems,
            summary
        };
    }

    /**
     * Update quantity of a specific cart item.
     */
    async updateItemQuantity(userId, cartItemId, quantity) {
        if (quantity < 1) {
            return await this.removeItem(userId, cartItemId);
        }

        const cartItemRecord = await Cart.findOne({ _id: cartItemId, userId });
        if (!cartItemRecord) {
            throw new Error('Cart item not found');
        }

        // --- Check available stock ---
        const stockMap = await stockService.getAggregatedStockForSingleProduct(cartItemRecord.productId);
        const vId = cartItemRecord.variantId ? cartItemRecord.variantId.toString() : 'base';
        const stockInfo = stockMap[vId];
        // [FIFO] Restrict available stock to the first active batch only
        const availableStock = (stockInfo && stockInfo.batches?.length > 0) 
            ? stockInfo.batches[0].quantity 
            : (stockInfo ? stockInfo.quantity : 0);

        if (quantity > availableStock) {
            throw new Error(`Cannot update quantity. Only ${availableStock} units available in stock.`);
        }

        const cartItem = await Cart.findOneAndUpdate(
            { _id: cartItemId, userId },
            { quantity },
            { new: true }
        );

        return cartItem;
    }

    /**
     * Remove an item from the cart.
     */
    async removeItem(userId, cartItemId) {
        const cartItem = await Cart.findOneAndDelete({ _id: cartItemId, userId });
        if (!cartItem) {
            throw new Error('Cart item not found');
        }
        return cartItem;
    }

    /**
     * Clear all items from a user's cart.
     */
    async clearCart(userId) {
        await Cart.deleteMany({ userId });
        return true;
    }
}

module.exports = new CartService();
