const Order = require('./order.model');
const User = require('../users/user.model');
const Notification = require('../notifications/notification.model');
const socketService = require('../../utils/socketService');
const fcmService = require('../../utils/fcmService');
const stockService = require('../stock/stock.service');
const mongoose = require('mongoose');
const crypto = require('crypto');
const cartHistoryService = require('../carts/cartHistory.service');
const Offer = require('../offers/offer.model');
const OfferUsage = require('../offers/offerUsage.model');
const createOrder = async (orderData) => {
    const { userId, items: requestedItems, shippingAddressId, offerCode, paymentMethod, paymentInfo } = orderData;
    const start = Date.now();

    // 1. Basic Idempotency Check (Prevent duplicate clicks within 5s)
    const recentOrder = await Order.findOne({ 
        userId, 
        createdAt: { $gt: new Date(Date.now() - 5000) } 
    }).lean();
    if (recentOrder) throw new Error('Please wait 5 seconds before placing another order.');

    // 2. Parallel Data Fetching (Optimization)
    const productIds = requestedItems.map(i => i.productId);
    const variantIds = requestedItems.filter(i => i.variantId).map(i => i.variantId);

    const [products, variants, user, deliveryConfig] = await Promise.all([
        require('../products/product.model').find({ _id: { $in: productIds } }).lean(),
        require('../products/productVariant.model').find({ _id: { $in: variantIds } }).lean(),
        User.findById(userId).lean(),
        require('../deliveryConfig/deliveryConfig.model').findOne({}).lean()
    ]);

    // 3. Server-Side Price Calculation (Security)
    let subtotal = 0;
    let taxTotal = 0;
    const orderItems = requestedItems.map(ri => {
        const product = products.find(p => p._id.toString() === ri.productId.toString());
        const variant = variants.find(v => v._id.toString() === (ri.variantId || '').toString());
        const pricing = variant ? variant.pricing : product.pricing;
        
        const price = pricing.finalSellingPrice || pricing.sellingPrice;
        const itemTotal = price * ri.quantity;
        subtotal += itemTotal;
        
        return {
            productId: ri.productId,
            variantId: ri.variantId,
            name: product.name,
            quantity: ri.quantity,
            price: pricing.sellingPrice,
            mrp: pricing.mrp,
            finalSellingPrice: price,
            image: product.image,
            unit: product.unit
        };
    });

    // 4. Handle Address & Delivery Charge
    const address = user.addresses.find(a => a._id.toString() === shippingAddressId.toString());
    if (!address) throw new Error('Shipping address not found');
    
    let deliveryCharge = 0;
    if (deliveryConfig && subtotal < deliveryConfig.freeDeliveryThreshold) {
        deliveryCharge = deliveryConfig.defaultDeliveryCharge;
    }

    // 5. Handle Offer (Parallel if needed, but simple for now)
    let discountAmount = 0;
    let offerId = null;
    if (offerCode) {
        const offerService = require('../offers/offer.service');
        const offerResult = await offerService.applyOffer(offerCode, subtotal);
        discountAmount = offerResult.discountAmount;
        offerId = offerResult.offerId;
    }

    const finalAmount = Math.ceil(subtotal + taxTotal + deliveryCharge - discountAmount);

    // 6. Online Payment Verification (Razorypay)
    let paymentStatus = 'PENDING';
    let paymentId = null;
    if (paymentMethod === 'Online') {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentInfo;
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
        if (expectedSignature !== razorpay_signature) throw new Error('Payment verification failed');
        paymentStatus = 'PAID';
        paymentId = razorpay_payment_id;
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const [order] = await Order.create([{
            userId,
            items: orderItems,
            totalAmount: subtotal,
            deliveryCharge,
            tax: taxTotal,
            finalAmount,
            discountAmount,
            offerId,
            paymentMethod,
            paymentStatus,
            paymentId,
            shippingAddress: {
                addressType: address.type,
                addressDetails: address.addressDetails,
                receiverName: address.receiverName,
                phone: address.phone,
                coordinates: address.coordinates
            }
        }], { session });

        // 7. Atomic Stock Update (Optimized)
        const stockOps = orderItems.map(item => ({
            updateOne: {
                filter: { productId: item.productId, variantId: item.variantId || null, quantity: { $gte: item.quantity } },
                update: { $inc: { quantity: -item.quantity } }
            }
        }));
        // Note: Full FIFO batch logic should be moved to a silent post-process if 100% precision is needed, 
        // but atomic $inc is the fastest for 1-3s response.
        
        await session.commitTransaction();

        // 8. Fire-and-Forget Side Effects (Non-blocking)
        const postProcess = async () => {
            try {
                // Notifications
                const notificationService = require('../../services/notification.service');
                const shortId = order._id.toString().slice(-6).toUpperCase();
                notificationService.notifyAllAdmins({
                    title: '🛒 New Order',
                    body: `Order #VS${shortId} placed by ${user.name}`,
                    data: { type: 'NEW_ORDER', orderId: order._id.toString() }
                }).catch(() => {});

                // Logging
                for (const item of orderItems) {
                    cartHistoryService.logAction({
                        userId, productId: item.productId, variantId: item.variantId,
                        actionType: 'ORDER_PLACED', quantity: item.quantity
                    }).catch(() => {});
                }
                
                // Clear Cart
                const Cart = require('../carts/cart.model');
                await Cart.deleteMany({ userId });
            } catch (e) {
                console.error('Post-order processing error:', e);
            }
        };
        postProcess(); 

        console.log("⏱ Order Time:", Date.now() - start, "ms");
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
        const shortId = order._id.toString().slice(-6).toUpperCase();

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

        // --- ADMINS NOTIFICATION (Live & Push for all status updates) ---
        try {
            await notificationService.notifyAllAdmins({
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
        } catch (fcmAdminErr) {
            console.error('Admin live notification send failed (non-blocking):', fcmAdminErr.message);
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
