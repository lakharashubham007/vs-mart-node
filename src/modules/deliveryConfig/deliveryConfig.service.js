const DeliveryConfig = require('./deliveryConfig.model');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status').status;

class DeliveryConfigService {
    /**
     * Create a new delivery configuration
     */
    async createDeliveryConfig(data) {
        const existing = await DeliveryConfig.findOne({ name: { $regex: new RegExp(`^${data.name}$`, 'i') } });
        if (existing) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'A configuration with this name already exists');
        }
        
        const config = new DeliveryConfig(data);
        await config.save(); // Using save to trigger the validation hooks
        return config;
    }

    /**
     * Get all delivery configurations with pagination, sorting and searching
     */
    async getAllDeliveryConfigs(query = {}) {
        const { page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = query;

        const filter = {};
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }

        const skip = (page - 1) * limit;
        const sortParam = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        const results = await DeliveryConfig.find(filter)
            .sort(sortParam)
            .skip(Number(skip))
            .limit(Number(limit));

        const totalResults = await DeliveryConfig.countDocuments(filter);
        const totalPages = Math.ceil(totalResults / limit);

        return {
            results,
            page: Number(page),
            limit: Number(limit),
            totalPages,
            totalResults
        };
    }

    /**
     * Get a delivery configuration by ID
     */
    async getDeliveryConfigById(id) {
        const config = await DeliveryConfig.findById(id);
        if (!config) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Delivery configuration not found');
        }
        return config;
    }

    /**
     * Update a delivery configuration
     */
    async updateDeliveryConfig(id, data) {
        const config = await DeliveryConfig.findById(id);
        if (!config) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Delivery configuration not found');
        }

        // Check name collision
        if (data.name && data.name.toLowerCase() !== config.name.toLowerCase()) {
            const existing = await DeliveryConfig.findOne({ name: { $regex: new RegExp(`^${data.name}$`, 'i') } });
            if (existing) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'A configuration with this name already exists');
            }
        }

        Object.assign(config, data);
        await config.save(); // Using save to trigger the validation hooks
        
        return config;
    }

    /**
     * Delete a delivery configuration
     */
    async deleteDeliveryConfig(id) {
        const config = await DeliveryConfig.findByIdAndDelete(id);
        if (!config) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Delivery configuration not found');
        }
        return config;
    }

    /**
     * Toggle status of a delivery configuration
     */
    async toggleStatus(id) {
        const config = await DeliveryConfig.findById(id);
        if (!config) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Delivery configuration not found');
        }
        config.isActive = !config.isActive;
        // Not modifying buckets, so simple save is fine
        await config.save();
        return config;
    }

    /**
     * Calculate delivery dynamically based on user coordinates and order amount
     */
    async calculateDelivery(latitude, longitude, orderAmount = 0) {
        if (latitude === undefined || longitude === undefined) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Latitude and Longitude are required');
        }

        // Get Active Delivery Config
        const config = await DeliveryConfig.findOne({ isActive: true });
        
        if (!config) {
            throw new ApiError(httpStatus.NOT_FOUND, 'No active delivery configuration found');
        }

        const { STORE_LOCATION, getDistanceInKm } = require('../../utils/delivery.util');
        
        const distance = getDistanceInKm(STORE_LOCATION.latitude, STORE_LOCATION.longitude, Number(latitude), Number(longitude));
        const exactDistance = Number(distance.toFixed(2));

        if (exactDistance > config.maxRadius) {
            return {
                serviceable: false,
                distance: exactDistance,
                deliveryCharge: 0,
                message: 'Out of delivery range',
                bucket: null,
                appliedRule: null
            };
        }

        // Find matching bucket (minDistance <= distance <= maxDistance)
        let currentBucket = null;
        for (let i = 0; i < config.buckets.length; i++) {
            const bucket = config.buckets[i];
            if (exactDistance >= bucket.minDistance && exactDistance <= bucket.maxDistance) {
                currentBucket = bucket;
                break;
            }
        }

        if (!currentBucket) {
            return {
                serviceable: false,
                distance: exactDistance,
                deliveryCharge: 0,
                message: 'Delivery configuration error: Unmatched distance bucket.',
                bucket: null,
                appliedRule: null
            };
        }

        // Apply Pricing Rules
        // Sort pricingRules DESC by minOrderAmount to find the highest threshold reached
        let appliedRule = null;
        const numOrderAmount = Number(orderAmount);

        if (currentBucket.pricingRules && currentBucket.pricingRules.length > 0) {
            const sortedRules = [...currentBucket.pricingRules].sort((a, b) => b.minOrderAmount - a.minOrderAmount);
            
            console.log(`[DELIVERY_DEBUG] Comparing Amount ${numOrderAmount} against rules:`, 
                sortedRules.map(r => `Min ${r.minOrderAmount} -> ${r.deliveryCharge}`));

            // Find rule where orderAmount >= minOrderAmount
            appliedRule = sortedRules.find(rule => numOrderAmount >= rule.minOrderAmount);
            
            console.log(`[DELIVERY_DEBUG] Selected Rule:`, appliedRule);
        }

        // Find suggestion (next better rule)
        let suggestion = null;
        if (currentBucket.pricingRules && currentBucket.pricingRules.length > 0) {
            const sortedRulesAsc = [...currentBucket.pricingRules].sort((a, b) => a.minOrderAmount - b.minOrderAmount);
            // Find first rule where minOrderAmount > orderAmount AND deliveryCharge < appliedRule.deliveryCharge
            const currentCharge = appliedRule ? appliedRule.deliveryCharge : Infinity;
            const nextRule = sortedRulesAsc.find(rule => 
                rule.minOrderAmount > Number(orderAmount) && 
                rule.deliveryCharge < currentCharge
            );
            
            if (nextRule) {
                suggestion = {
                    minOrderAmount: nextRule.minOrderAmount,
                    deliveryCharge: nextRule.deliveryCharge,
                    amountNeeded: nextRule.minOrderAmount - Number(orderAmount)
                };
            }
        }

        // Response format
        const response = {
            serviceable: true,
            distance: exactDistance,
            deliveryCharge: appliedRule ? appliedRule.deliveryCharge : 0,
            bucket: {
                minDistance: currentBucket.minDistance,
                maxDistance: currentBucket.maxDistance,
                pricingRules: currentBucket.pricingRules
            },
            appliedRule: appliedRule ? {
                minOrderAmount: appliedRule.minOrderAmount,
                deliveryCharge: appliedRule.deliveryCharge
            } : null,
            suggestion
        };

        console.log(`[DELIVERY_CALC] Result for User:`, {
            orderAmount,
            distance: exactDistance,
            appliedCharge: response.deliveryCharge,
            appliedRule: response.appliedRule
        });

        return response;
    }

    /**
     * Check if a location is within the delivery range
     */
    async checkServiceability(latitude, longitude) {
        if (latitude === undefined || longitude === undefined) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Latitude and Longitude are required');
        }

        const config = await DeliveryConfig.findOne({ isActive: true });
        if (!config) {
            throw new ApiError(httpStatus.NOT_FOUND, 'No active delivery configuration found');
        }

        const { STORE_LOCATION, getDistanceInKm } = require('../../utils/delivery.util');
        const distance = getDistanceInKm(STORE_LOCATION.latitude, STORE_LOCATION.longitude, Number(latitude), Number(longitude));
        const exactDistance = Number(distance.toFixed(2));

        const serviceable = exactDistance <= config.maxRadius;

        return {
            serviceable,
            distance: exactDistance,
            maxRadius: config.maxRadius,
            message: serviceable 
                ? "Location is within delivery range." 
                : "Currently we are not serving in your area. We are working to reach you soon!"
        };
    }
}

module.exports = new DeliveryConfigService();
