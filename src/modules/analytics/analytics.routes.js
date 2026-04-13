const express = require('express');
const router = express.Router();
const analytics = require('./analytics.controller');

// All routes require admin authentication (applied at private.js level)
router.get('/summary',       analytics.getSummaryStats);
router.get('/revenue-trend', analytics.getRevenueTrend);
router.get('/best-sellers',  analytics.getBestSellers);
router.get('/low-stock',     analytics.getLowStockProducts);
router.get('/recent-orders', analytics.getRecentOrders);
router.get('/order-distribution', analytics.getOrderDistribution);

// Specific requested reporting routes (mapped under existing analytics umbrella)
router.get('/sales/weekly',   analytics.getWeeklySales);
router.get('/sales/monthly',  analytics.getMonthlySales);
router.get('/sales/yearly',   analytics.getYearlySales);
router.get('/products/stock', analytics.getStockDynamics);

module.exports = router;
