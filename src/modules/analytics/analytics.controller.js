/**
 * analytics.controller.js
 * High-performance analytics API for the admin dashboard.
 */
const analyticsService = require('./analytics.service');

// ─── 1. Summary Stats ─────────────────────────────────────────────────────────
exports.getSummaryStats = async (req, res) => {
    try {
        const stats = await analyticsService.getSummaryStats();
        res.json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 2. Revenue Trend ─────────────────────────────────────────────────────────
exports.getRevenueTrend = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const trend = await analyticsService.getRevenueTrend(days);
        res.json({ success: true, data: trend });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 3. Best Selling Products ─────────────────────────────────────────────────
exports.getBestSellers = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const sellers = await analyticsService.getBestSellers(limit);
        res.json({ success: true, data: sellers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 4. Low Stock Products ────────────────────────────────────────────────────
exports.getLowStockProducts = async (req, res) => {
    try {
        const threshold = parseInt(req.query.threshold) || 10;
        const limit = parseInt(req.query.limit) || 8;
        const data = await analyticsService.getLowStockProducts(threshold, limit);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 5. Recent Orders ─────────────────────────────────────────────────────────
const Order = require('../orders/order.model'); // Still needed for Direct Find if not in service
exports.getRecentOrders = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const orders = await Order.find({})
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('userId', 'name email')
            .select('orderId orderStatus finalAmount paymentMethod createdAt userId items');
        res.json({ success: true, data: orders });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 6. Order Status Distribution ─────────────────────────────────────────────
exports.getOrderDistribution = async (req, res) => {
    try {
        const data = await Order.aggregate([
            { $group: { _id: '$orderStatus', count: { $sum: 1 }, revenue: { $sum: '$finalAmount' } } },
            { $sort: { count: -1 } }
        ]);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 7-9. Sales Reports ───────────────────────────────────────────────────────
exports.getWeeklySales = async (req, res) => {
    try { res.json(await analyticsService.getWeeklySales()); }
    catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getMonthlySales = async (req, res) => {
    try { res.json(await analyticsService.getMonthlySales()); }
    catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getYearlySales = async (req, res) => {
    try { res.json(await analyticsService.getYearlySales()); }
    catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── 10. Dynamic Stock Overview ───────────────────────────────────────────────
exports.getStockDynamics = async (req, res) => {
    try {
        const data = await analyticsService.getStockDynamics();
        console.log('DEBUG: getStockDynamics result:', data);
        res.json(data);
    } catch (err) {
        console.error('getStockDynamics error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
