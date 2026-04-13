const deliveryBoyService = require('./deliveryBoy.service');

exports.createDeliveryBoy = async (req, res) => {
    try {
        const body = req.body;
        // In case of multipart form, req.body.address might be stringified JSON
        if (typeof body.address === 'string') {
            body.address = JSON.parse(body.address);
        }
        
        const deliveryBoy = await deliveryBoyService.createDeliveryBoy(body, req.file);
        res.status(201).json({
            success: true,
            message: 'Delivery Boy created successfully',
            data: deliveryBoy
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

exports.getDeliveryBoys = async (req, res) => {
    try {
        const { search, status, page = 1, limit = 10 } = req.query;
        const result = await deliveryBoyService.getDeliveryBoys({ search, status, page, limit });
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

exports.getDeliveryBoyById = async (req, res) => {
    try {
        const deliveryBoy = await deliveryBoyService.getDeliveryBoyById(req.params.id);
        if (!deliveryBoy) {
            return res.status(404).json({ success: false, message: 'Delivery Boy not found' });
        }
        res.json({ success: true, data: deliveryBoy });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateDeliveryBoy = async (req, res) => {
    try {
        const body = req.body;
        if (typeof body.address === 'string') {
            body.address = JSON.parse(body.address);
        }
        const deliveryBoy = await deliveryBoyService.updateDeliveryBoy(req.params.id, body, req.file);
        res.json({
            success: true,
            message: 'Delivery Boy updated successfully',
            data: deliveryBoy
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

exports.deleteDeliveryBoy = async (req, res) => {
    try {
        await deliveryBoyService.deleteDeliveryBoy(req.params.id);
        res.json({
            success: true,
            message: 'Delivery Boy deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.toggleStatus = async (req, res) => {
    try {
        const deliveryBoy = await deliveryBoyService.toggleStatus(req.params.id, req.body.status);
        res.json({
            success: true,
            message: `Delivery Boy ${req.body.status ? 'activated' : 'deactivated'} successfully`,
            data: deliveryBoy
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateFcmToken = async (req, res) => {
    try {
        const { id } = req.params;
        const { fcmToken } = req.body;
        
        if (!fcmToken) {
            return res.status(400).json({ success: false, message: 'FCM Token is required' });
        }

        const deliveryBoy = await deliveryBoyService.updateFcmToken(id, fcmToken);
        if (!deliveryBoy) {
            return res.status(404).json({ success: false, message: 'Delivery Boy not found' });
        }

        res.json({
            success: true,
            message: 'FCM Token updated successfully',
            data: { fcmToken: deliveryBoy.fcmToken }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
