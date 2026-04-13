const StockIn = require('./stockIn.model');
const StockOut = require('./stockOut.model');
const Product = require('../products/product.model');
const ProductVariant = require('../products/productVariant.model');
const mongoose = require('mongoose');

class StockService {
    /**
     * Generates a unique batch number like SUGAR-B1 or SUGAR-1KG-B2
     */
    async generateBatchNumber(productId, variantId) {
        if (!productId) throw new Error('Product ID is required to generate batch number');
        
        const pId = typeof productId === 'string' ? productId : productId._id || productId;
        
        const product = await Product.findById(pId);
        if (!product) throw new Error(`Product not found with ID: ${pId}`);

        let prefix = product.slug.toUpperCase();

        if (variantId) {
            const variant = await ProductVariant.findById(variantId).populate('attributes.valueId');
            if (variant && variant.attributes && variant.attributes.length > 0) {
                const variantParts = variant.attributes.map(attr => {
                    const val = attr.valueId.name || attr.valueId.value || '';
                    return val.toUpperCase().replace(/[^A-Z0-9]+/g, '-');
                });
                if (variantParts.length > 0) {
                    prefix += `-${variantParts.join('-')}`;
                }
            }
        }

        const count = await StockIn.countDocuments({ productId: pId, variantId: variantId || null });
        return `${prefix}-B${count + 1}`;
    }

    /**
     * Adds a new stock batch
     */
    async addStockIn(data, user) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            if (!data.batchNo) {
                data.batchNo = await this.generateBatchNumber(data.productId, data.variantId);
            }

            const stockIn = new StockIn({
                ...data,
                currentQuantity: data.quantity,
                tenantId: user?.tenantId,
                createdBy: user?._id
            });

            await stockIn.save({ session });

            // Sync product/variant read-only fields
            await this.syncProductInventory(data.productId, data.variantId, session);

            await session.commitTransaction();
            return stockIn;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Reduces stock using FIFO logic
     */
    async reduceStock(productId, variantId, quantity, type, orderId, user, session = null) {
        let localSession = false;
        if (!session) {
            session = await mongoose.startSession();
            session.startTransaction();
            localSession = true;
        }

        try {
            let remainingToReduce = quantity;
            const usedBatches = [];

            const batches = await StockIn.find({
                productId,
                variantId: variantId || null,
                currentQuantity: { $gt: 0 },
                status: true
            }).sort({ createdAt: 1 }).session(session);

            if (!batches || batches.length === 0) {
                throw new Error('No stock available for this product');
            }

            const totalAvailable = batches.reduce((sum, b) => sum + b.currentQuantity, 0);
            if (totalAvailable < quantity) {
                throw new Error(`Insufficient stock. Available: ${totalAvailable}, Requested: ${quantity}`);
            }

            for (const batch of batches) {
                if (remainingToReduce <= 0) break;

                const reduceFromThisBatch = Math.min(batch.currentQuantity, remainingToReduce);

                batch.currentQuantity -= reduceFromThisBatch;
                await batch.save({ session });

                await StockOut.create([{
                    stockInId: batch._id,
                    productId,
                    variantId: variantId || null,
                    orderId,
                    type,
                    quantity: reduceFromThisBatch,
                    price: batch.pricing.sellingPrice,
                    tenantId: user?.tenantId,
                    createdBy: user?._id
                }], { session });

                usedBatches.push({
                    stockInId: batch._id,
                    batchNo: batch.batchNo,
                    quantity: reduceFromThisBatch
                });

                remainingToReduce -= reduceFromThisBatch;
            }

            await this.syncProductInventory(productId, variantId, session);

            if (localSession) await session.commitTransaction();

            return usedBatches;
        } catch (error) {
            if (localSession) await session.abortTransaction();
            throw error;
        } finally {
            if (localSession) session.endSession();
        }
    }

    /**
     * Restores stock for a cancelled order
     */
    async restoreStock(orderId, session = null) {
        let localSession = false;
        if (!session) {
            session = await mongoose.startSession();
            session.startTransaction();
            localSession = true;
        }

        try {
            const stockOutRecords = await StockOut.find({ orderId }).session(session);

            if (!stockOutRecords || stockOutRecords.length === 0) {
                if (localSession) await session.commitTransaction();
                return;
            }

            for (const record of stockOutRecords) {
                await StockIn.findByIdAndUpdate(
                    record.stockInId,
                    { $inc: { currentQuantity: record.quantity } },
                    { session }
                );

                await StockOut.findByIdAndDelete(record._id).session(session);
                await this.syncProductInventory(record.productId, record.variantId, session);
            }

            if (localSession) await session.commitTransaction();
        } catch (error) {
            if (localSession) await session.abortTransaction();
            throw error;
        } finally {
            if (localSession) session.endSession();
        }
    }

    /**
     * Synchronizes total quantity and current selling price back to Product/Variant models
     */
    async syncProductInventory(productId, variantId, session = null) {
        console.log(`Inventory changed for Product: ${productId}, Variant: ${variantId}`);
    }

    /**
     * Fetches aggregated stock records
     */
    async getAllStockIn(query, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const { aggregate, search, ...restQuery } = query;

        // NEW: Aggregated View (Group by Product & Variant)
        if (aggregate) {
            const matchQuery = { isDeleted: false };
            if (restQuery.productId) matchQuery.productId = new mongoose.Types.ObjectId(restQuery.productId);
            if (restQuery.variantId) matchQuery.variantId = new mongoose.Types.ObjectId(restQuery.variantId);
            
            const searchRegex = search ? new RegExp(search, 'i') : null;

            const pipeline = [
                { $match: matchQuery },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'productId',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                { $unwind: '$product' },
                {
                    $lookup: {
                        from: 'productvariants',
                        localField: 'variantId',
                        foreignField: '_id',
                        as: 'variant'
                    }
                },
                { $addFields: { variantItem: { $arrayElemAt: ['$variant', 0] } } }
            ];

            if (searchRegex) {
                pipeline.push({
                    $match: {
                        $or: [
                            { 'batchNo': searchRegex },
                            { 'product.name': searchRegex }
                        ]
                    }
                });
            }

            pipeline.push({
                $group: {
                    _id: { productId: '$productId', variantId: '$variantId' },
                    totalQuantity: { $sum: '$quantity' },
                    totalCurrentQuantity: { $sum: '$currentQuantity' },
                    product: { $first: '$product' },
                    variant: { $first: '$variantItem' },
                    batchNo: { $first: '$batchNo' },
                    pricing: { $first: '$pricing' },
                    createdAt: { $max: '$createdAt' },
                    sampleId: { $first: '$_id' }
                }
            });

            pipeline.push({ $sort: { createdAt: -1 } });

            const finalPipeline = [
                ...pipeline,
                {
                    $facet: {
                        metadata: [{ $count: 'total' }],
                        data: [
                            { $skip: skip },
                            { $limit: parseInt(limit) }
                        ]
                    }
                }
            ];

            const result = await StockIn.aggregate(finalPipeline);
            const data = result[0].data;
            const total = result[0].metadata[0]?.total || 0;

            const formattedData = data.map(item => ({
                ...item,
                _id: item.sampleId,
                quantity: item.totalQuantity,
                currentQuantity: item.totalCurrentQuantity,
                productId: item.product,
                variantId: item.variant || null
            }));

            return {
                stockInRecords: formattedData,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit)
                }
            };
        }

        // Standard logic for individual batches
        const dbQuery = { isDeleted: false, ...restQuery };
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            const pipeline = [
                { $match: dbQuery },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'productId',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                { $unwind: '$product' },
                {
                    $match: {
                        $or: [
                            { 'batchNo': searchRegex },
                            { 'product.name': searchRegex }
                        ]
                    }
                },
                { $sort: { createdAt: -1 } },
                {
                    $facet: {
                        metadata: [{ $count: 'total' }],
                        data: [
                            { $skip: skip },
                            { $limit: parseInt(limit) }
                        ]
                    }
                }
            ];

            const result = await StockIn.aggregate(pipeline);
            const data = result[0].data;
            const total = result[0].metadata[0]?.total || 0;

            return {
                stockInRecords: data.map(d => ({ ...d, productId: d.product, variantId: null })),
                pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
            };
        }

        const stockInRecords = await StockIn.find(dbQuery)
            .populate('productId', 'name images')
            .populate('variantId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await StockIn.countDocuments(dbQuery);

        return {
            stockInRecords,
            pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
        };
    }

    async getStockInById(id) {
        const stockIn = await StockIn.findById(id)
            .populate('productId', 'name images')
            .populate('variantId')
            .lean();
        if (!stockIn) throw new Error('Stock record not found');
        return stockIn;
    }

    async updateStockIn(id, data, user, session = null) {
        let localSession = false;
        if (!session) {
            session = await mongoose.startSession();
            session.startTransaction();
            localSession = true;
        }
        try {
            const stockIn = await StockIn.findById(id).session(session);
            if (!stockIn) throw new Error('Stock record not found');

            if (data.quantity !== undefined) {
                const totalReducedResult = await StockOut.aggregate([
                    { $match: { stockInId: stockIn._id } },
                    { $group: { _id: null, total: { $sum: '$quantity' } } }
                ]).session(session);

                const reducedAmount = totalReducedResult[0]?.total || 0;
                if (data.quantity < reducedAmount) {
                    throw new Error(`Cannot set quantity below already reduced amount: ${reducedAmount}`);
                }
                stockIn.currentQuantity = data.quantity - reducedAmount;
                stockIn.quantity = data.quantity;
            }

            if (data.batchNo) stockIn.batchNo = data.batchNo;

            if (data.pricing) {
                stockIn.pricing = {
                    ...stockIn.pricing.toObject(),
                    ...data.pricing
                };
            }

            if (data.status !== undefined) stockIn.status = data.status;

            stockIn.updatedBy = user?._id;
            await stockIn.save({ session });

            await this.syncProductInventory(stockIn.productId, stockIn.variantId, session);

            if (localSession) await session.commitTransaction();
            return stockIn;
        } catch (error) {
            if (localSession) await session.abortTransaction();
            throw error;
        } finally {
            if (localSession) session.endSession();
        }
    }

    async getLastBatchCode() {
        const lastBatch = await StockIn.findOne({
            batchNo: /^B\d+$/
        }).sort({ createdAt: -1 });

        if (!lastBatch) return 'B0';
        return lastBatch.batchNo;
    }

    async getStockHistory(productId, variantId) {
        const query = { productId, isDeleted: false };
        if (variantId) {
            query.variantId = variantId;
        }

        const populateOptions = {
            path: 'variantId',
            populate: {
                path: 'attributes.valueId',
                select: 'name value'
            }
        };

        const stockIn = await StockIn.find(query)
            .populate(populateOptions)
            .sort({ createdAt: -1 })
            .lean();

        const stockOut = await StockOut.find(query)
            .populate(populateOptions)
            .sort({ createdAt: -1 })
            .lean();

        return { stockIn, stockOut };
    }

    async createMultipleStockIn(data, user) {
        const { productId, variantId: topVariantId, batches } = data;
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const results = [];
            
            for (const batchData of batches) {
                const vId = batchData.variantId || topVariantId || null;
                const batchNoToUse = batchData.batchCode || await this.generateBatchNumber(productId, vId);

                const stockIn = new StockIn({
                    productId,
                    variantId: vId,
                    batchNo: batchNoToUse,
                    quantity: Number(batchData.quantity),
                    currentQuantity: Number(batchData.quantity),
                    pricing: {
                        mrp: Number(batchData.mrp),
                        sellingPrice: Number(batchData.sellingPrice || batchData.price || 0),
                        finalSellingPrice: Number(batchData.finalSellingPrice || batchData.finalPrice || 0),
                        costPrice: Number(batchData.costPrice),
                        taxId: batchData.taxId || null,
                        discountType: batchData.discountType,
                        discountValue: Number(batchData.discountValue || 0)
                    },
                    mfgDate: batchData.mfgDate,
                    expDate: batchData.expDate,
                    tenantId: user?.tenantId,
                    createdBy: user?._id
                });

                await stockIn.save({ session });
                results.push(stockIn);

                await this.syncProductInventory(productId, vId, session);
            }

            await session.commitTransaction();
            return results;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Aggregates stock for multiple products, returning a map of [productId][variantId or 'base']
     */
    async getAggregatedStockForProducts(productIds) {
        if (!productIds || productIds.length === 0) return {};

        const objProductIds = productIds.map(id => new mongoose.Types.ObjectId(id));

        const batches = await StockIn.find({
            productId: { $in: objProductIds },
            currentQuantity: { $gt: 0 },
            status: true,
            isDeleted: false
        })
        .populate({
            path: 'pricing.taxId',
            select: 'name rate'
        })
        .sort({ createdAt: 1 }) // FIFO
        .lean();

        const map = {};

        // Initialize map for all requested productIds to ensure they exist in result
        productIds.forEach(id => {
            map[id.toString()] = {};
        });

        for (const batch of batches) {
            const pId = batch.productId.toString();
            const vId = batch.variantId ? batch.variantId.toString() : 'base';

            if (!map[pId][vId]) {
                map[pId][vId] = {
                    quantity: 0,
                    batches: []
                };
            }

            map[pId][vId].quantity += batch.currentQuantity;
            map[pId][vId].batches.push({
                stockInId: batch._id,
                batchNo: batch.batchNo,
                quantity: batch.currentQuantity,
                pricing: batch.pricing,
                mfgDate: batch.mfgDate,
                expDate: batch.expDate
            });
        }

        return map;
    }

    /**
     * Convenience method for a single product
     */
    async getAggregatedStockForSingleProduct(productId) {
        const result = await this.getAggregatedStockForProducts([productId.toString()]);
        return result[productId.toString()] || {};
    }
}

module.exports = new StockService();
