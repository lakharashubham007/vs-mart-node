const orderService = require('./order.service');

exports.createOrder = async (req, res) => {
    try {
        const orderData = {
            ...req.body,
            userId: req.user._id,
        };
        const order = await orderService.createOrder(orderData);
        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            order
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

exports.getOrdersByUser = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const result = await orderService.getOrdersByUser(req.user._id, parseInt(page), parseInt(limit));
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getOrderById = async (req, res) => {
    try {
        const order = await orderService.getOrderById(req.params.id);
        res.json({
            success: true,
            order
        });
    } catch (error) {
        const status = error.message === 'Order not found' ? 404 : 500;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const order = await orderService.updateOrderStatus(req.params.id, req.body.status, req.user);
        res.json({
            success: true,
            message: 'Order status updated',
            order
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

exports.getAdminOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search } = req.query;
        const filter = {};

        if (status && status !== 'All') {
            if (status === 'InProgress') {
                filter.orderStatus = { $in: ['Confirmed', 'Processing', 'OutForDelivery'] };
            } else if (status === 'Pending') {
                filter.orderStatus = 'Placed';
            } else {
                filter.orderStatus = status;
            }
        }

        if (search) {
            const User = require('../users/user.model');
            const users = await User.find({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } }
                ]
            }).select('_id');

            filter.$or = [
                { orderId: { $regex: search, $options: 'i' } },
                { userId: { $in: users.map(u => u._id) } },
                { 'shippingAddress.phone': { $regex: search, $options: 'i' } },
                { 'shippingAddress.receiverName': { $regex: search, $options: 'i' } }
            ];
        }

        const result = await orderService.getOrdersAdmin(filter, parseInt(page), parseInt(limit));
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
