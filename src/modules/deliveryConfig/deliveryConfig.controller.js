const deliveryConfigService = require('./deliveryConfig.service');

const createDeliveryConfig = async (req, res, next) => {
    try {
        const config = await deliveryConfigService.createDeliveryConfig(req.body);
        res.status(201).json(config);
    } catch (error) {
        next(error);
    }
};

const getAllDeliveryConfigs = async (req, res, next) => {
    try {
        const configs = await deliveryConfigService.getAllDeliveryConfigs(req.query);
        res.status(200).json(configs);
    } catch (error) {
        next(error);
    }
};

const getDeliveryConfigById = async (req, res, next) => {
    try {
        const config = await deliveryConfigService.getDeliveryConfigById(req.params.id);
        res.status(200).json(config);
    } catch (error) {
        next(error);
    }
};

const updateDeliveryConfig = async (req, res, next) => {
    try {
        const config = await deliveryConfigService.updateDeliveryConfig(req.params.id, req.body);
        res.status(200).json(config);
    } catch (error) {
        next(error);
    }
};

const deleteDeliveryConfig = async (req, res, next) => {
    try {
        const config = await deliveryConfigService.deleteDeliveryConfig(req.params.id);
        res.status(200).json(config);
    } catch (error) {
        next(error);
    }
};

const toggleStatus = async (req, res, next) => {
    try {
        const config = await deliveryConfigService.toggleStatus(req.params.id);
        res.status(200).json(config);
    } catch (error) {
        next(error);
    }
};

const calculateDeliveryCharge = async (req, res, next) => {
    try {
        const { latitude, longitude, orderAmount } = req.body;
        const result = await deliveryConfigService.calculateDelivery(latitude, longitude, orderAmount);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const checkServiceability = async (req, res, next) => {
    try {
        const { latitude, longitude } = req.body;
        const userId = req.user ? req.user.id : (req.body.userId || 'Guest');
        const requestId = Math.random().toString(36).substring(7).toUpperCase();

        const result = await deliveryConfigService.checkServiceability(latitude, longitude);

        // Structured Logging
        console.log(`[SERVICEABILITY_CHECK] [${new Date().toISOString()}]`, {
            requestId,
            userId,
            latitude,
            longitude,
            distance: result.distance,
            maxRadius: result.maxRadius,
            serviceable: result.serviceable
        });

        res.status(200).json({
            ...result,
            requestId
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createDeliveryConfig,
    getAllDeliveryConfigs,
    getDeliveryConfigById,
    updateDeliveryConfig,
    deleteDeliveryConfig,
    toggleStatus,
    calculateDeliveryCharge,
    checkServiceability
};
