const Order = require('./order.model');
const User = require('../users/user.model');
const Notification = require('../notifications/notification.model');
const socketService = require('../../utils/socketService');
const fcmService = require('../../utils/fcmService');
const stockService = require('../stock/stock.service');
const mongoose = require('mongoose');
const crypto = require('crypto');

const createOrder = async (orderData) => {
    // Handle Online Payment Verification if needed
    if (orderData.paymentMethod === 'Online') {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = orderData;
        
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            throw new Error('Payment details missing for online order');
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            throw new Error('Invalid payment signature. Fraud detected.');
        }

        // Verification successful
        orderData.paymentStatus = 'PAID';
        orderData.paymentId = razorpay_payment_id;
        orderData.razorpayOrderId = razorpay_order_id;
    }

    // Enforce whole number rounding for the final payable amount
    if (orderData.finalAmount) {
        orderData.finalAmount = Math.ceil(orderData.finalAmount);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // 1. Create order
        const [order] = await Order.create([orderData], { session });

        // 2. Fetch populated order for real-time broadcast
        const populatedOrder = await Order.findById(order._id)
            .populate('userId', 'name email phone')
            .session(session);

        // 3. Update last used address ID on user if provided
        if (orderData.shippingAddressId) {
            await User.findByIdAndUpdate(
                orderData.userId,
                { lastUsedAddressId: orderData.shippingAddressId },
                { session }
            );
        }

        await session.commitTransaction();

        // 4. Send Targeted Notifications
        try {
            const notificationService = require('../../services/notification.service');
            const Role = require('../roles/role.model');
            const Admin = require('../admins/admin.model');
            const shortId = order._id.toString().slice(-6).toUpperCase();

            // --- ADMIN NOTIFICATION (Fetch all active Super Admins/Admins) ---
            const targetRoles = await Role.find({ name: { $regex: /admin/i } }).select('_id').lean();
            const adminRoleIds = targetRoles.map(r => r._id);

            const admins = await Admin.find({ 
                roleId: { $in: adminRoleIds },
                status: true 
            }).select('_id').lean();
            
            for (const admin of admins) {
                await notificationService.sendNotification({
                    userId: admin._id,
                    role: 'admin',
                    title: '🛒 New Order Received',
                    body: `A new order #VS${shortId} has been placed. Tap to view.`,
                    data: {
                        type: 'NEW_ORDER',
                        screen: 'AdminOrders',
                        orderId: order._id.toString(),
                    },
                    senderId: orderData.userId,
                    senderRole: 'customer'
                });
            }
        } catch (e) {
            console.error('Failed to send admin new-order notification:', e);
        }

        return order;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

const getOrdersAdmin = async (filter = {}, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const orders = await Order.find(filter)
        .populate('userId', 'name email phone')
        .populate('deliveryBoyId', 'firstName lastName mobile profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Order.countDocuments(filter);

    return {
        orders,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
};

const getOrdersByUser = async (userId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const orders = await Order.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Order.countDocuments({ userId });

    return {
        orders,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
};

const getOrderById = async (orderId) => {
    const order = await Order.findOne({ _id: orderId })
        .populate('userId', 'name email phone')
        .populate('deliveryBoyId', 'firstName lastName mobile profileImage');
    if (!order) {
        throw new Error('Order not found');
    }
    return order;
};

// Defines the valid linear order of statuses (Cancelled is a special exit)
const ORDER_PIPELINE = ['Placed', 'Confirmed', 'Processing', 'OutForDelivery', 'Delivered'];

const updateOrderStatus = async (orderId, status, sender = null) => {
    const order = await Order.findById(orderId);
    if (!order) {
        throw new Error('Order not found');
    }

    const currentStatus = order.orderStatus;

    // Terminal states — cannot be changed
    if (currentStatus === 'Delivered') {
        throw new Error('This order has already been delivered and cannot be updated.');
    }
    if (currentStatus === 'Cancelled') {
        throw new Error('This order has been cancelled and cannot be updated.');
    }

    // Cancellation or Out Of Stock is always allowed (from any non-terminal state)
    if (status !== 'Cancelled' && status !== 'OutOfStock') {
        const currentIndex = ORDER_PIPELINE.indexOf(currentStatus);
        const newIndex = ORDER_PIPELINE.indexOf(status);

        if (newIndex === -1) {
            throw new Error(`Invalid status: ${status}`);
        }

        const diff = Math.abs(newIndex - currentIndex);
        if (diff !== 1 || newIndex < currentIndex) {
            // Only allow moving exactly one step FORWARD
            if (newIndex <= currentIndex) {
                throw new Error(
                    `Invalid status transition: Order cannot go backward from "${currentStatus}" to "${status}". ` +
                    `Once an order has been advanced, it cannot be rolled back.`
                );
            }
            if (diff !== 1) {
                throw new Error(
                    `Invalid status transition: cannot jump from "${currentStatus}" to "${status}". ` +
                    `Order status can only advance one step at a time.`
                );
            }
        }
    }

    const updateData = { orderStatus: status };

    const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        updateData,
        { new: true }
    );

    try {
        // --- Deferred Stock Deduction ---
        // Deduct stock only when the order is explicitly accepted/confirmed
        if (status === 'Confirmed' && currentStatus === 'Placed') {
            for (let i = 0; i < updatedOrder.items.length; i++) {
                const item = updatedOrder.items[i];
                const usedBatches = await stockService.reduceStock(
                    item.productId,
                    item.variantId,
                    item.quantity,
                    'Sale',
                    updatedOrder._id,
                    { _id: updatedOrder.userId } // Minimal user object for tracking
                );
                item.stockBatches = usedBatches;
            }
            await updatedOrder.save();
        }

        // --- Stock Restoration on Cancellation / Out of Stock ---
        // If order is cancelled/out-of-stock and it was already confirmed/processing/etc (stock was reduced)
        if ((status === 'Cancelled' || status === 'OutOfStock') && currentStatus !== 'Placed') {
            await stockService.restoreStock(orderId);
        }

        // Status label map for friendly messages
        const STATUS_LABELS = {
            Placed: 'Placed',
            Confirmed: 'Confirmed',
            Processing: 'Processing',
            OutForDelivery: 'Out for Delivery',
            Delivered: 'Delivered',
            Cancelled: 'Cancelled',
            OutOfStock: 'Out of Stock',
        };
        // Target labels and logic
        const notificationService = require('../../services/notification.service');
        const statusLabel = STATUS_LABELS[status] || status;

        // --- CUSTOMER NOTIFICATION ---
        await notificationService.sendNotification({
            userId: order.userId,
            role: 'customer',
            title: `Order ${statusLabel}`,
            body: `Your order #VS${shortId} is now ${statusLabel}.`,
            data: {
                type: 'ORDER_STATUS_UPDATE',
                screen: 'OrderDetails',
                orderId: order._id.toString(),
            },
            senderId: sender?._id,
            senderName: sender?.name || 'System',
            senderRole: sender?.role || 'system'
        });

        // --- ADMINS NOTIFICATION (Restricted to Super Admin for updates) ---
        try {
            const Role = require('../roles/role.model');
            const Admin = require('../admins/admin.model');
            const superAdminRole = await Role.findOne({ name: { $regex: /^super\s*admin$/i } }).lean();
            
            if (superAdminRole) {
                const admins = await Admin.find({ roleId: superAdminRole._id, status: true }).select('_id').lean();
                for (const admin of admins) {
                    await notificationService.sendNotification({
                        userId: admin._id,
                        role: 'admin',
                        title: `Order ${statusLabel}`,
                        body: `Order #VS${shortId} has been updated to "${statusLabel}".`,
                        data: {
                            type: 'ORDER_STATUS_UPDATE',
                            screen: 'AdminOrders',
                            orderId: order._id.toString(),
                        },
                        senderId: sender?._id,
                        senderName: sender?.name || 'System',
                        senderRole: sender?.role || 'system'
                    });
                }
            }
        } catch (fcmAdminErr) {
            console.error('Admin FCM push send failed (non-blocking):', fcmAdminErr.message);
        }
    } catch (err) {
        console.error('Failed to update stock or create/emit notification:', err);
        // We don't throw error here to not block the order status update itself
        // But for stock restoration it might be critical. 
        // For now logging it as requested "quantity also manage"
    }

    return updatedOrder;
};

module.exports = {
    createOrder,
    getOrdersByUser,
    getOrderById,
    updateOrderStatus,
    getOrdersAdmin
};
