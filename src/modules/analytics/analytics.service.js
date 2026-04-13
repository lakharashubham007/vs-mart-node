const Product = require('../products/product.model');
const ProductVariant = require('../products/productVariant.model');
const StockIn = require('../stock/stockIn.model');
const Order = require('../orders/order.model');
const User = require('../users/user.model');

// Helper to get dates
const startOf = (n, unit) => {
    const d = new Date();
    if (unit === 'day') d.setHours(0, 0, 0, 0);
    if (unit === 'month') { d.setDate(1); d.setHours(0, 0, 0, 0); }
    if (unit === 'days') { d.setDate(d.getDate() - n); d.setHours(0, 0, 0, 0); }
    return d;
};

/**
 * analytics.service.js
 * Centralized business logic for dashboard reporting.
 */
const analyticsService = {

    getSummaryStats: async () => {
        const todayStart = startOf(0, 'day');
        const monthStart = startOf(0, 'month');

        const [
            orderStats, todayRevenue, monthRevenue, totalUsers, todayUsers,
            totalProducts, totalVariants, monthOrders, totalItemsSold
        ] = await Promise.all([
            Order.aggregate([
                {
                    $facet: {
                        total: [{ $count: 'n' }],
                        placed: [{ $match: { orderStatus: 'Placed' } }, { $count: 'n' }],
                        confirmed: [{ $match: { orderStatus: 'Confirmed' } }, { $count: 'n' }],
                        processing: [{ $match: { orderStatus: 'Processing' } }, { $count: 'n' }],
                        outForDelivery: [{ $match: { orderStatus: 'OutForDelivery' } }, { $count: 'n' }],
                        delivered: [{ $match: { orderStatus: 'Delivered' } }, { $count: 'n' }],
                        cancelled: [{ $match: { orderStatus: 'Cancelled' } }, { $count: 'n' }],
                        totalRevenue: [{ $match: { orderStatus: 'Delivered' } }, { $group: { _id: null, sum: { $sum: '$finalAmount' } } }],
                        todayOrders: [{ $match: { createdAt: { $gte: todayStart } } }, { $count: 'n' }],
                        pendingOrders: [{ $match: { orderStatus: { $in: ['Placed', 'Confirmed', 'Processing', 'OutForDelivery'] } } }, { $count: 'n' }],
                    }
                }
            ]),
            Order.aggregate([
                { $match: { orderStatus: 'Delivered', createdAt: { $gte: todayStart } } },
                { $group: { _id: null, sum: { $sum: '$finalAmount' } } }
            ]),
            Order.aggregate([
                { $match: { orderStatus: 'Delivered', createdAt: { $gte: monthStart } } },
                { $group: { _id: null, sum: { $sum: '$finalAmount' } } }
            ]),
            User.countDocuments({}),
            User.countDocuments({ createdAt: { $gte: todayStart } }),
            Product.countDocuments({ isDeleted: { $ne: true } }),
            ProductVariant.countDocuments({ isDeleted: { $ne: true } }),
            Order.countDocuments({ createdAt: { $gte: monthStart } }),
            Order.aggregate([
                { $match: { orderStatus: { $in: ['Confirmed', 'Processing', 'OutForDelivery', 'Delivered'] } } },
                { $unwind: '$items' },
                { $group: { _id: null, total: { $sum: '$items.quantity' } } }
            ])
        ]);

        const s = orderStats[0];
        const pick = (facet) => facet?.[0]?.n || 0;
        const pickSum = (facet) => facet?.[0]?.sum || 0;

        return {
            orders: {
                total: pick(s.total),
                placed: pick(s.placed),
                confirmed: pick(s.confirmed),
                processing: pick(s.processing),
                outForDelivery: pick(s.outForDelivery),
                delivered: pick(s.delivered),
                cancelled: pick(s.cancelled),
                pending: pick(s.pendingOrders),
                today: pick(s.todayOrders),
                thisMonth: monthOrders,
            },
            revenue: {
                total: pickSum(s.totalRevenue),
                today: todayRevenue[0]?.sum || 0,
                thisMonth: monthRevenue[0]?.sum || 0,
            },
            users: {
                total: totalUsers,
                newToday: todayUsers,
            },
            catalog: {
                totalProducts,
                totalVariants,
                totalSkus: totalProducts + totalVariants,
                totalItemsSold: totalItemsSold[0]?.total || 0,
            }
        };
    },

    getRevenueTrend: async (days = 7) => {
        const since = startOf(days, 'days');
        const data = await Order.aggregate([
            { $match: { orderStatus: 'Delivered', createdAt: { $gte: since } } },
            {
                $group: {
                    _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } },
                    revenue: { $sum: '$finalAmount' },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]);

        const result = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const key = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
            const found = data.find(x => x._id.year === key.year && x._id.month === key.month && x._id.day === key.day);
            result.push({
                date: d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
                revenue: found?.revenue || 0,
                orders: found?.orders || 0,
            });
        }
        return result;
    },

    getBestSellers: async (limit = 5) => {
        return await Order.aggregate([
            { $match: { orderStatus: { $in: ['Confirmed', 'Processing', 'OutForDelivery', 'Delivered'] } } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    name: { $first: '$items.name' },
                    image: { $first: '$items.image' },
                    totalQty: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { totalQty: -1 } },
            { $limit: limit }
        ]);
    },

    getLowStockProducts: async (threshold = 20, limit = 5) => {
        return await Product.aggregate([
            { $match: { isDeleted: { $ne: true } } },
            // 1. Expand Variants
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'productId',
                    pipeline: [{ $match: { isDeleted: false } }],
                    as: 'variantDocs'
                }
            },
            // 2. Identify all possible SKUs (Single Product OR its Variants)
            {
                $project: {
                    _id: 1,
                    name: 1,
                    productType: 1,
                    images: 1,
                    skus: {
                        $cond: {
                            if: { $eq: ['$productType', 'Single'] },
                            then: [{ _id: '$_id', variantId: null, baseName: '$name', attributes: [] }],
                            else: {
                                $map: {
                                    input: '$variantDocs',
                                    as: 'v',
                                    in: { 
                                        _id: '$_id', 
                                        variantId: '$$v._id', 
                                        baseName: '$name',
                                        attributes: '$$v.attributes' 
                                    }
                                }
                            }
                        }
                    }
                }
            },
            { $unwind: '$skus' },
            // 3. Resolve Attribute Names for Display (e.g., "500g", "XL")
            {
                $lookup: {
                    from: 'variantvalues',
                    localField: 'skus.attributes.valueId',
                    foreignField: '_id',
                    as: 'attrValues'
                }
            },
            {
                $addFields: {
                    variantLabel: {
                        $reduce: {
                            input: '$attrValues',
                            initialValue: '',
                            in: { 
                                $concat: [
                                    '$$value', 
                                    { $cond: [{ $eq: ['$$value', ''] }, '', ', '] }, 
                                    '$$this.name'
                                ]
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    displayName: {
                        $cond: {
                            if: { $eq: ['$variantLabel', ''] },
                            then: '$skus.baseName',
                            else: { $concat: ['$skus.baseName', ' (', '$variantLabel', ')'] }
                        }
                    }
                }
            },
            // 4. Lookup Stock and Calculate
            {
                $lookup: {
                    from: 'stockins',
                    let: { pId: '$skus._id', vId: '$skus.variantId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$isDeleted', false] },
                                        { $eq: ['$productId', '$$pId'] },
                                        { $eq: ['$variantId', '$$vId'] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'batches'
                }
            },
            {
                $addFields: {
                    currentStock: { $sum: '$batches.currentQuantity' },
                    initialStock: { $sum: '$batches.quantity' },
                    batchCount: { $size: '$batches' }
                }
            },
            // 5. Ranking Logic
            {
                $addFields: {
                    statusWeight: { $cond: { if: { $lte: ['$currentStock', 0] }, then: 0, else: 1 } }
                }
            },
            { $sort: { statusWeight: 1, currentStock: 1 } },
            { $limit: limit },
            {
                $project: {
                    _id: { $ifNull: ['$skus.variantId', '$skus._id'] }, // Fallback to productId if no variant
                    productId: '$skus._id',
                    variantId: '$skus.variantId',
                    name: '$displayName',
                    currentStock: 1,
                    initialStock: 1,
                    batchCount: 1,
                    image: '$images.thumbnail'
                }
            }
        ]);
    },

    getStockDynamics: async () => {
        const result = await Product.aggregate([
            { $match: { isDeleted: { $ne: true } } },
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'productId',
                    pipeline: [{ $match: { isDeleted: { $ne: true } } }],
                    as: 'variants'
                }
            },
            {
                $project: {
                    _id: 1,
                    productType: 1,
                    skus: {
                        $cond: {
                            if: { $eq: ['$productType', 'Single'] },
                            then: [{ _id: '$_id', isVariant: false }],
                            else: {
                                $map: {
                                    input: '$variants',
                                    as: 'v',
                                    in: { _id: '$$v._id', isVariant: true }
                                }
                            }
                        }
                    }
                }
            },
            { $unwind: { path: '$skus', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'stockins',
                    let: { skuId: '$skus._id', isV: '$skus.isVariant' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $ne: ['$isDeleted', true] },
                                        {
                                            $cond: {
                                                if: '$$isV',
                                                then: { $eq: ['$variantId', '$$skuId'] },
                                                else: { $eq: ['$productId', '$$skuId'] }
                                            }
                                        }
                                    ]
                                }
                            }
                        },
                        { $group: { _id: null, total: { $sum: '$currentQuantity' } } }
                    ],
                    as: 'stockData'
                }
            },
            {
                $addFields: {
                    totalQty: { $ifNull: [{ $arrayElemAt: ['$stockData.total', 0] }, 0] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    inStock:    { $sum: { $cond: [{ $gt: ['$totalQty', 20] }, 1, 0] } },
                    lowStock:   { $sum: { $cond: [{ $and: [{ $gt: ['$totalQty', 0] }, { $lte: ['$totalQty', 20] }] }, 1, 0] } },
                    outOfStock: { $sum: { $cond: [{ $lte: ['$totalQty', 0] }, 1, 0] } }
                }
            }
        ]);
        return result[0] || { totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0 };
    },

    getWeeklySales: async () => {
        const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0,0,0,0);
        const data = await Order.aggregate([
            { $match: { orderStatus: 'Delivered', createdAt: { $gte: d } } },
            { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } }, total: { $sum: '$finalAmount' } } }
        ]);
        const result = [];
        for(let i=6; i>=0; i--) {
            const dt = new Date(); dt.setDate(dt.getDate() - i);
            const found = data.find(x => x._id.year === dt.getFullYear() && x._id.month === (dt.getMonth()+1) && x._id.day === dt.getDate());
            result.push({ label: dt.toLocaleDateString('en-IN', { weekday: 'short' }), total: found ? found.total : 0 });
        }
        return result;
    },

    getMonthlySales: async () => {
        const d = new Date(); d.setMonth(d.getMonth() - 11); d.setDate(1); d.setHours(0,0,0,0);
        const data = await Order.aggregate([
            { $match: { orderStatus: 'Delivered', createdAt: { $gte: d } } },
            { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, total: { $sum: '$finalAmount' } } }
        ]);
        const result = [];
        for(let i=11; i>=0; i--) {
            const dt = new Date(); dt.setMonth(dt.getMonth() - i);
            const found = data.find(x => x._id.year === dt.getFullYear() && x._id.month === (dt.getMonth()+1));
            result.push({ label: dt.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }), total: found ? found.total : 0 });
        }
        return result;
    },

    getYearlySales: async () => {
        const d = new Date(); d.setFullYear(d.getFullYear() - 4); d.setMonth(0, 1); d.setHours(0,0,0,0);
        const data = await Order.aggregate([
            { $match: { orderStatus: 'Delivered', createdAt: { $gte: d } } },
            { $group: { _id: { year: { $year: '$createdAt' } }, total: { $sum: '$finalAmount' } } }
        ]);
        const result = [];
        for(let i=4; i>=0; i--) {
            const y = new Date().getFullYear() - i;
            const found = data.find(x => x._id.year === y);
            result.push({ label: y.toString(), total: found ? found.total : 0 });
        }
        return result;
    }
};

module.exports = analyticsService;
