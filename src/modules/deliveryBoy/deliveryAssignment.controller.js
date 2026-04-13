const DeliveryAssignment = require('./deliveryAssignment.model');
const Order = require('../orders/order.model');
const DeliveryBoy = require('./deliveryBoy.model');
const User = require('../users/user.model');
const Admin = require('../admins/admin.model');
const Notification = require('../notifications/notification.model');
const socketService = require('../../utils/socketService');
const fcmService = require('../../utils/fcmService');

/**
 * Assign an order to a delivery boy
 */
exports.assignDelivery = async (req, res) => {
    try {
        const { orderId, deliveryBoyId } = req.body;

        if (!orderId || !deliveryBoyId) {
            return res.status(400).json({ success: false, message: 'Order ID and Delivery Boy ID are required' });
        }

        // 1. Fetch order and delivery boy
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
        if (!deliveryBoy) {
            return res.status(404).json({ success: false, message: 'Delivery Boy not found' });
        }

        if (!deliveryBoy.status) {
            return res.status(400).json({ success: false, message: 'Selected delivery boy is inactive' });
        }

        // 2. Check if already assigned (Optional but good)
        const existingAssignment = await DeliveryAssignment.findOne({ orderId, status: 'ASSIGNED' });
        if (existingAssignment) {
            // Cancel existing one or logic for reassignment
            existingAssignment.status = 'CANCELLED';
            await existingAssignment.save();
        }

        // 3. Create Assignment record
        const assignment = new DeliveryAssignment({
            orderId: order._id,
            orderNumber: order.orderId,
            deliveryBoyId: deliveryBoy._id,
            deliveryBoyName: `${deliveryBoy.firstName} ${deliveryBoy.lastName || ''}`.trim(),
            customerId: order.userId,
            customerName: order.shippingAddress?.receiverName || 'Unknown Customer',
            deliveryAddress: {
                fullAddress: order.shippingAddress?.addressDetails || order.shippingAddress?.receiverDetails,
                latitude: order.shippingAddress?.coordinates?.latitude,
                longitude: order.shippingAddress?.coordinates?.longitude
            },
            status: 'ASSIGNED'
        });

        await assignment.save();

        // 4. Update Order
        order.orderStatus = 'OutForDelivery';
        order.deliveryBoyId = deliveryBoy._id;
        order.deliveryStatus = 'ASSIGNED';
        await order.save();
        
        // 5. Trigger Notifications to Delivery Boy
        try {
            const shortOrderId = orderId.toString().slice(-6).toUpperCase();
            
            // --- DELIVERY BOY NOTIFICATION ---
            const dbNotification = await Notification.create({
                userId: deliveryBoyId,
                title: '🚚 New Delivery Assigned',
                message: `You have been assigned a new order #VS${shortOrderId}. Tap to view details and start pickup.`,
                type: 'NEW_ASSIGNMENT',
                relatedId: order._id,
                targetRole: 'delivery_boy',
                senderId: req.user?._id,
                senderName: req.user?.name || 'Admin',
                senderRole: 'admin'
            });

            socketService.emitToUser(deliveryBoyId, 'new_assignment', {
                assignment: assignment,
                notification: dbNotification
            });

            if (deliveryBoy.fcmToken) {
                await fcmService.sendToToken(
                    deliveryBoy.fcmToken,
                    '🚚 New Delivery Assigned',
                    `Order #VS${shortOrderId} has been assigned to you.`,
                    {
                        type: 'NEW_ASSIGNMENT',
                        screen: 'DeliveryOrderDetails',
                        assignmentId: assignment._id.toString()
                    }
                );
            }

            // --- CUSTOMER NOTIFICATION (Out for Delivery) ---
            const userNotification = await Notification.create({
                userId: order.userId,
                title: '🚚 Order Out for Delivery',
                message: `Your order #VS${shortOrderId} is now out for delivery with ${deliveryBoy.firstName}.`,
                type: 'ORDER_STATUS_UPDATE',
                relatedId: order._id,
                targetRole: 'user',
                senderId: req.user?._id,
                senderName: req.user?.name || 'Admin',
                senderRole: 'admin'
            });

            socketService.emitToUser(order.userId, 'new_notification', userNotification);

            // Push to Customer
            try {
                // Restricted whitelist as per user request: Only OutForDelivery and Delivered
                const pushStatuses = ['OutForDelivery', 'Delivered', 'DELIVERED'];
                const currentStatus = 'OutForDelivery';
                
                console.log(`📡 [FCM Debug: Assignment] Checking status: "${currentStatus}" against whitelist...`);
                
                const isMatch = pushStatuses.some(s => s.toLowerCase() === currentStatus.toLowerCase());

                if (isMatch) {
                    const user = await User.findById(order.userId).select('fcmToken').lean();
                    if (!user) {
                        console.warn(`❌ [FCM Debug: Assignment] User ${order.userId} not found for push.`);
                    } else if (!user.fcmToken) {
                        console.warn(`❌ [FCM Debug: Assignment] Customer ${order.userId} has NO fcmToken in DB.`);
                    } else {
                        console.log(`✅ [FCM Debug: Assignment] Sending push to CUSTOMER: ${order.userId} | Token length: ${user.fcmToken.length}`);
                        const pushResult = await fcmService.sendToToken(
                            user.fcmToken,
                            '🚚 Order Out for Delivery',
                            `Your order #VS${shortOrderId} is now out for delivery with ${deliveryBoy.firstName}.`,
                            {
                                type: 'ORDER_STATUS_UPDATE',
                                screen: 'OrderDetails',
                                orderId: order._id.toString()
                            }
                        );
                        console.log(`🚀 [FCM Debug: Assignment] Send result:`, JSON.stringify(pushResult));
                    }
                } else {
                    console.log(`ℹ️ [FCM Debug: Assignment] Silencing push for status: "${currentStatus}" (Socket only).`);
                }
            } catch (fcmErr) {
                console.error('🚨 [FCM Debug: Assignment] Push pipeline failure:', fcmErr.message);
            }

        } catch (notifErr) {
            console.error('Failed to send assignment notifications:', notifErr);
        }

        res.status(200).json({
            success: true,
            message: 'Order assigned to delivery boy successfully',
            data: assignment
        });

    } catch (error) {
        console.error('Assign delivery error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get all assignments with role-based filtering
 */
exports.getAssignments = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const query = {};
        
        if (status) query.status = status;

        // Role-based filtering
        const roleName = req.user.roleId?.name;
        const isAdmin = ['Super Admin', 'Admin', 'Shop Admin'].includes(roleName);

        if (!isAdmin) {
            // Find the delivery boy linked to this admin user by email or mobile
            const deliveryBoy = await DeliveryBoy.findOne({ 
                $or: [{ email: req.user.email }, { mobile: req.user.phone }] 
            });
            
            if (!deliveryBoy) {
                return res.json({ 
                    success: true, 
                    data: [], 
                    pagination: { total: 0, page: Number(page), limit: Number(limit), totalPages: 0 } 
                });
            }
            query.deliveryBoyId = deliveryBoy._id;
        }

        const total = await DeliveryAssignment.countDocuments(query);
        const assignments = await DeliveryAssignment.find(query)
            .populate('orderId')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.json({
            success: true,
            data: assignments,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get single assignment by ID
 */
exports.getAssignmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const assignment = await DeliveryAssignment.findById(id).populate('orderId').populate('customerId');
        
        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        res.json({
            success: true,
            data: assignment
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update assignment status (sync with Order)
 */
exports.updateAssignmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // PICKED, DELIVERED, CANCELLED

        const assignment = await DeliveryAssignment.findById(id);
        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        // 1. Update Assignment
        assignment.status = status;
        await assignment.save();

        // 2. Sync with Order
        const order = await Order.findById(assignment.orderId);
        if (order) {
            order.deliveryStatus = status;
            if (status === 'DELIVERED') {
                order.orderStatus = 'Delivered';
            }
            await order.save();
        }

        // 3. Trigger Targeted Notifications
        try {
            const shortId = assignment.orderId.toString().slice(-6).toUpperCase();
            const orderNum = assignment.orderNumber || shortId;
            const customerId = assignment.customerId;

            // --- ADMIN NOTIFICATION (For PICKED and DELIVERED) ---
            if (status === 'PICKED' || status === 'DELIVERED') {
                const adminTitle = status === 'PICKED' ? '📦 Order Picked Up' : '✅ Order Delivered';
                const adminBody = status === 'PICKED' 
                    ? `Order #VS${orderNum} has been picked up by ${assignment.deliveryBoyName}.`
                    : `Order #VS${orderNum} has been delivered successfully by ${assignment.deliveryBoyName}.`;

                const adminNotif = await Notification.create({
                    userId: customerId,
                    title: adminTitle,
                    message: adminBody,
                    type: 'ORDER_STATUS_UPDATE',
                    relatedId: assignment.orderId,
                    targetRole: 'admin',
                    senderId: assignment.deliveryBoyId,
                    senderName: assignment.deliveryBoyName,
                    senderRole: 'delivery_boy'
                });

                socketService.broadcastToAdmin('new_notification', adminNotif);

                // Push to all active Admins
                const admins = await Admin.find({ fcmToken: { $ne: null }, status: true }).select('fcmToken').lean();
                if (admins.length > 0) {
                    const tokens = admins.map(a => a.fcmToken).filter(t => t);
                    if (tokens.length > 0) {
                        await fcmService.sendToMultipleTokens(tokens, adminTitle, adminBody, {
                            type: 'ORDER_STATUS_UPDATE',
                            screen: 'AdminOrders',
                            orderId: assignment.orderId.toString()
                        });
                    }
                }
            }

            // --- CUSTOMER NOTIFICATION (Only for DELIVERED) ---
            if (status === 'DELIVERED') {
                const userTitle = '🎉 Order Delivered!';
                const userBody = `Your order #VS${orderNum} has been delivered. Thank you for shopping with us!`;

                const userNotif = await Notification.create({
                    userId: customerId,
                    title: userTitle,
                    message: userBody,
                    type: 'ORDER_STATUS_UPDATE',
                    relatedId: assignment.orderId,
                    targetRole: 'user',
                    senderId: assignment.deliveryBoyId,
                    senderName: assignment.deliveryBoyName,
                    senderRole: 'delivery_boy'
                });

                socketService.emitToUser(customerId, 'new_notification', userNotif);

                // Push to Customer
                try {
                    const user = await User.findById(customerId).select('fcmToken').lean();
                    console.log(`📡 [FCM Debug: Delivery Completion] Status: "${status}"`);
                    
                    if (user?.fcmToken) {
                        console.log(`✅ [FCM Debug: Delivery Completion] Sending push to CUSTOMER: ${customerId}`);
                        const pushResult = await fcmService.sendToToken(user.fcmToken, userTitle, userBody, {
                            type: 'ORDER_STATUS_UPDATE',
                            screen: 'OrderDetails',
                            orderId: assignment.orderId.toString()
                        });
                        console.log(`🚀 [FCM Debug: Delivery Completion] Send result:`, pushResult);
                    } else {
                        console.warn(`❌ [FCM Debug: Delivery Completion] Customer ${customerId} has NO fcmToken in DB.`);
                    }
                } catch (fcmErr) {
                    console.error('🚨 [FCM Debug: Delivery Completion] Push failed:', fcmErr.message);
                }
            }
        } catch (notifErr) {
            console.error('Notification failed during assignment status update:', notifErr);
        }

        // Re-fetch populated assignment to provide full data to mobile app (prevents UI flicker)
        const updatedAssignment = await DeliveryAssignment.findById(id)
            .populate('orderId')
            .populate('customerId', 'name phone');

        res.json({
            success: true,
            message: `Assignment marked as ${status}`,
            data: updatedAssignment
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get assignment stats (Admin only view recommended)
 */
exports.getStats = async (req, res) => {
    try {
        const totalOrders = await DeliveryAssignment.countDocuments();
        const outForDelivery = await DeliveryAssignment.countDocuments({ status: { $in: ['ASSIGNED', 'PICKED'] } });
        const deliveredCount = await DeliveryAssignment.countDocuments({ status: 'DELIVERED' });
        const totalBoys = await DeliveryBoy.countDocuments({ status: true });

        res.json({
            success: true,
            data: {
                totalOrders,
                outForDelivery,
                deliveredCount,
                totalBoys
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
