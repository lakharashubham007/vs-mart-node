const crypto = require('crypto');
const razorpay = require('./payment.config');
const Order = require('../orders/order.model');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status').status;

/**
 * Create a Razorpay order
 * POST /api/payment/create-order
 */
const createRazorpayOrder = async (req, res) => {
    try {
        const { amount } = req.body;
        
        if (!amount) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Amount is required');
        }

        console.log(`💳 [Razorpay] Creating order for amount: ${amount} (In Paise: ${Math.round(amount * 100)})`);
        
        const options = {
            amount: Math.round(amount * 100), // convert to paise
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);
        console.log(`✅ [Razorpay] Order created successfully: ${order.id}`);

        res.status(200).json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
        });
    } catch (error) {
        console.error('Razorpay Create Order Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create Razorpay order',
        });
    }
};

/**
 * Verify Razorpay payment signature
 * POST /api/payment/verify-payment
 */
const verifyPayment = async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature,
            orderId // Our internal mongo order ID
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        const isValid = expectedSignature === razorpay_signature;

        if (isValid) {
            // Update order in database
            const order = await Order.findByIdAndUpdate(
                orderId,
                {
                    paymentStatus: 'PAID',
                    paymentId: razorpay_payment_id,
                    razorpayOrderId: razorpay_order_id,
                },
                { new: true }
            );

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Internal Order not found',
                });
            }

            res.status(200).json({
                success: true,
                message: 'Payment verified successfully',
                order
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid signature, payment verification failed',
            });
        }
    } catch (error) {
        console.error('Razorpay Verify Payment Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Verification error',
        });
    }
};

module.exports = {
    createRazorpayOrder,
    verifyPayment,
};
