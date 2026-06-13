const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const Order = require('../modules/orders/order.model');
const notificationService = require('../services/notification.service');
const socketService = require('../utils/socketService');
const cartHistoryService = require('../modules/carts/cartHistory.service');

const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379
};

const worker = new Worker('order-processing', async (job) => {
    const { orderId } = job.data;
    console.log(`👷 [Worker] Processing Order: ${orderId}`);

    const order = await Order.findById(orderId).populate('userId', 'name email phone');
    if (!order) return;

    try {
        // 1. Log History
        for (const item of order.items) {
            await cartHistoryService.logAction({
                userId: order.userId._id,
                productId: item.productId,
                variantId: item.variantId,
                actionType: 'ORDER_PLACED',
                quantity: item.quantity,
                price: item.finalSellingPrice
            });
        }

        // 2. Admin Notifications
        const shortId = order._id.toString().slice(-6).toUpperCase();
        await notificationService.notifyAllAdmins({
            title: '🛒 New Order Received',
            body: `A new order #VS${shortId} has been placed by ${order.userId.name}.`,
            data: {
                type: 'NEW_ORDER',
                screen: 'AdminOrders',
                orderId: order._id.toString(),
            },
            senderId: order.userId._id,
            senderRole: 'customer'
        });

        // 3. Socket Broadcast
        socketService.broadcastNewOrder(order);

        console.log(`✅ [Worker] Order ${orderId} processed successfully.`);
    } catch (error) {
        console.error(`❌ [Worker] Failed to process order ${orderId}:`, error);
        throw error; // Let BullMQ handle retries
    }
}, { connection });

worker.on('failed', (job, err) => {
    console.error(`🚨 [Worker] Job ${job.id} failed:`, err);
});

module.exports = worker;
