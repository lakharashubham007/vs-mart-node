const express = require('express');
const orderController = require('./order.controller');
const router = express.Router();

router.post('/create', orderController.createOrder);
router.get('/my-orders', orderController.getOrdersByUser);
router.get('/admin/get-all-orders', orderController.getAdminOrders);
router.get('/:id', orderController.getOrderById);
router.patch('/:id/status', orderController.updateOrderStatus);

module.exports = router;
