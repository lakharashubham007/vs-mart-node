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
        const notificationService = require('../../services/notification.service');

        // 5. Trigger Notifications
        try {
            const shortOrderId = order._id.toString().slice(-6).toUpperCase();
            
            // --- DELIVERY BOY NOTIFICATION ---
            await notificationService.sendNotification({
                userId: deliveryBoyId,
                role: 'delivery_boy',
                title: '🚚 New Delivery Assigned',
                body: `You have been assigned a new order #VS${shortOrderId}. Tap to view details.`,
                data: {
                    type: 'NEW_ASSIGNMENT',
                    screen: 'DeliveryOrderDetails',
                    orderId: order._id.toString(),
                    assignmentId: assignment._id.toString()
                },
                senderId: req.user?._id,
                senderRole: 'admin'
            });

            // --- CUSTOMER NOTIFICATION (Out for Delivery) ---
            await notificationService.sendNotification({
                userId: order.userId,
                role: 'customer',
                title: '🚚 Order Out for Delivery',
                body: `Your order #VS${shortOrderId} is now out for delivery with ${deliveryBoy.firstName}.`,
                data: {
                    type: 'ORDER_STATUS_UPDATE',
                    screen: 'OrderDetails',
                    orderId: order._id.toString()
                },
                senderId: req.user?._id,
                senderRole: 'admin'
            });

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
        const notificationService = require('../../services/notification.service');

        // 3. Trigger Targeted Notifications
        try {
            const orderNum = assignment.orderNumber || assignment.orderId.toString().slice(-6).toUpperCase();
            
            // --- ADMIN NOTIFICATION (For PICKED and DELIVERED) ---
            if (status === 'PICKED' || status === 'DELIVERED') {
                const adminTitle = status === 'PICKED' ? '📦 Order Picked Up' : '✅ Order Delivered';
                const adminBody = status === 'PICKED' 
                    ? `Order #VS${orderNum} has been picked up by ${assignment.deliveryBoyName}.`
                    : `Order #VS${orderNum} has been delivered successfully by ${assignment.deliveryBoyName}.`;

                // Fetch all active Super Admins
                const Role = require('../roles/role.model');
                const superAdminRole = await Role.findOne({ name: { $regex: /^super\s*admin$/i } }).lean();
                if (superAdminRole) {
                    const admins = await Admin.find({ roleId: superAdminRole._id, status: true }).select('_id').lean();
                    for (const admin of admins) {
                        await notificationService.sendNotification({
                            userId: admin._id,
                            role: 'admin',
                            title: adminTitle,
                            body: adminBody,
                            data: {
                                type: 'ORDER_STATUS_UPDATE',
                                screen: 'AdminOrders',
                                orderId: assignment.orderId.toString()
                            },
                            senderId: assignment.deliveryBoyId,
                            senderName: assignment.deliveryBoyName,
                            senderRole: 'delivery_boy'
                        });
                    }
                }
            }

            // --- CUSTOMER NOTIFICATION (Only for DELIVERED) ---
            if (status === 'DELIVERED') {
                await notificationService.sendNotification({
                    userId: assignment.customerId,
                    role: 'customer',
                    title: '🎉 Order Delivered!',
                    body: `Your order #VS${orderNum} has been delivered. Thank you!`,
                    data: {
                        type: 'ORDER_STATUS_UPDATE',
                        screen: 'OrderDetails',
                        orderId: assignment.orderId.toString()
                    },
                    senderId: assignment.deliveryBoyId,
                    senderName: assignment.deliveryBoyName,
                    senderRole: 'delivery_boy'
                });
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
