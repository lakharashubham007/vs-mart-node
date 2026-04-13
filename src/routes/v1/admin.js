const express = require('express');
const router = express.Router();
const analyticsController = require('../../modules/analytics/analytics.controller');
const orderController = require('../../modules/orders/order.controller');
const productsController = require('../../modules/products/product.controller');
const Authentication = require('../../middlewares/auth.middleware');
const Authorization = require('../../middlewares/authorization.middleware');
const stockRoutes = require('../../modules/stock/stock.routes');
const deliveryBoyRoutes = require('../../modules/deliveryBoy/deliveryBoy.routes');

// Summaries & Analytics
router.get('/dashboard-stats', Authentication, analyticsController.getSummaryStats);
router.get('/recent-orders', Authentication, analyticsController.getRecentOrders);
router.get('/low-stock-products', Authentication, analyticsController.getLowStockProducts);
router.get('/top-products', Authentication, analyticsController.getBestSellers);
router.get('/products', Authentication, Authorization, productsController.getAdminProducts);

// Order Management
router.get('/orders', Authentication, orderController.getAdminOrders);
router.get('/orders/:id', Authentication, orderController.getOrderById);
router.patch('/orders/:id/status', Authentication, orderController.updateOrderStatus);

// Stock Management
router.use('/stock', stockRoutes);

// Delivery Boy Management
router.use('/delivery-boy', deliveryBoyRoutes);

module.exports = router;
