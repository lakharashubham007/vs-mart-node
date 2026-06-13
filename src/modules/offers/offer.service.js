const mongoose = require('mongoose');
const Offer = require('./offer.model');
const OfferUsage = require('./offerUsage.model');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status').status;

/**
 * Create an offer
 * @param {Object} offerBody
 * @returns {Promise<Offer>}
 */
const createOffer = async (offerBody) => {
    if (offerBody.type === 'OFFER' && !offerBody.code) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Offer code is required for OFFER type');
    }
    if (offerBody.code) {
        const existingOffer = await Offer.findOne({ code: offerBody.code });
        if (existingOffer) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Offer code already exists');
        }
    }
    return Offer.create(offerBody);
};

/**
 * Query for offers
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryOffers = async (filter, options) => {
    const { sortBy, limit = 10, page = 1 } = options;
    const skip = (page - 1) * limit;

    let sort = '';
    if (sortBy) {
        const parts = sortBy.split(':');
        sort = (parts[1] === 'desc' ? '-' : '') + parts[0];
    } else {
        sort = '-createdAt';
    }

    const offers = await Offer.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('productIds', 'name')
        .populate('categoryIds', 'name')
        .populate('variantIds', 'sku')
        .populate('freeProductId', 'name')
        .populate('freeProductVariantId', 'sku');

    const totalResults = await Offer.countDocuments(filter);
    const totalPages = Math.ceil(totalResults / limit);

    return {
        results: offers,
        page,
        limit,
        totalPages,
        totalResults,
    };
};

/**
 * Get offer by id
 * @param {ObjectId} id
 * @returns {Promise<Offer>}
 */
const getOfferById = async (id) => {
    return Offer.findById(id)
        .populate('productIds', 'name')
        .populate('categoryIds', 'name')
        .populate('variantIds', 'sku')
        .populate('freeProductId', 'name')
        .populate('freeProductVariantId', 'sku');
};

/**
 * Update offer by id
 * @param {ObjectId} offerId
 * @param {Object} updateBody
 * @returns {Promise<Offer>}
 */
const updateOfferById = async (offerId, updateBody) => {
    const offer = await getOfferById(offerId);
    if (!offer) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Offer not found');
    }
    if (updateBody.code && updateBody.code !== offer.code) {
        const existingOffer = await Offer.findOne({ code: updateBody.code });
        if (existingOffer) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Offer code already exists');
        }
    }
    Object.assign(offer, updateBody);
    await offer.save();
    return offer;
};

/**
 * Delete offer by id
 * @param {ObjectId} offerId
 * @returns {Promise<Offer>}
 */
const deleteOfferById = async (offerId) => {
    const offer = await Offer.findByIdAndUpdate(
        offerId,
        { isDeleted: true },
        { new: true, runValidators: false }
    );
    if (!offer) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Offer not found');
    }
    return offer;
};

/**
 * Toggle offer status
 * @param {ObjectId} offerId
 * @returns {Promise<Offer>}
 */
const toggleOfferStatus = async (offerId) => {
    const offer = await getOfferById(offerId);
    if (!offer) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Offer not found');
    }
    
    const updatedOffer = await Offer.findByIdAndUpdate(
        offerId,
        { isActive: !offer.isActive },
        { new: true, runValidators: false }
    );
    return updatedOffer;
};

/**
 * Get available offers for a user
 * @param {ObjectId} userId
 * @param {number} orderAmount
 * @returns {Promise<Array>}
 */
const getAvailableOffers = async (userId, orderAmount) => {
    const OfferUsage = require('./offerUsage.model');
    const now = new Date();

    // 1. Fetch all active and non-expired offers
    const offers = await Offer.find({
        isActive: true,
        isDeleted: false,
        validFrom: { $lte: now },
        validTo: { $gte: now }
    });

    // 2. Fetch user usage in one aggregate query (Optimization ✅)
    const usageData = await OfferUsage.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
            $group: {
                _id: "$offerId",
                count: { $sum: 1 }
            }
        }
    ]);

    // Convert to Map for O(1) lookup
    const usageMap = {};
    usageData.forEach(item => {
        usageMap[item._id.toString()] = item.count;
    });

    // 3. Process offers in memory (FAST ⚡)
    const availableOffers = offers.map(offer => {
        const userUsageCount = usageMap[offer._id.toString()] || 0;
        let isUsable = true;
        let message = '';

        // Check overall usage limit
        if (offer.usageLimit > 0 && offer.usedCount >= offer.usageLimit) {
            isUsable = false;
            message = 'Offer fully redeemed';
        }
        // Check per-user limit
        else if (userUsageCount >= offer.perUserLimit) {
            isUsable = false;
            message = 'You already used this offer';
        }
        // Check min order amount
        else if (orderAmount < offer.minOrderAmount) {
            isUsable = false;
            message = `Add ₹${(offer.minOrderAmount - orderAmount).toFixed(0)} more to unlock`;
        }

        return {
            id: offer._id,
            title: offer.title,
            code: offer.code,
            discountType: offer.discountType,
            discountValue: offer.discountValue,
            minOrderAmount: offer.minOrderAmount,
            maxDiscount: offer.maxDiscount,
            isUsable,
            message
        };
    });

    // Sort by usable first, then by discount value
    return availableOffers.sort((a, b) => {
        if (a.isUsable === b.isUsable) {
            return b.discountValue - a.discountValue;
        }
        return a.isUsable ? -1 : 1;
    });
};

/**
 * Apply an offer code
 * @param {string} code
 * @param {ObjectId} userId
 * @param {number} orderAmount
 * @returns {Promise<Object>}
 */
const applyOffer = async (code, userId, orderAmount) => {
    const offer = await Offer.findOne({ code: code.toUpperCase(), isActive: true, isDeleted: false });
    if (!offer) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Invalid offer code');
    }

    const now = new Date();
    if (now < offer.validFrom || now > offer.validTo) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Offer has expired');
    }

    if (offer.usageLimit > 0 && offer.usedCount >= offer.usageLimit) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Offer limit reached');
    }

    if (orderAmount < offer.minOrderAmount) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Minimum order amount of ₹${offer.minOrderAmount} required`);
    }

    const userUsageCount = await OfferUsage.countDocuments({ userId, offerId: offer._id });
    if (userUsageCount >= offer.perUserLimit) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'You have already used this offer');
    }

    let discountAmount = 0;
    if (offer.discountType === 'PERCENTAGE') {
        discountAmount = (orderAmount * offer.discountValue) / 100;
        if (offer.maxDiscount && discountAmount > offer.maxDiscount) {
            discountAmount = offer.maxDiscount;
        }
    } else if (offer.discountType === 'FLAT') {
        discountAmount = offer.discountValue;
    }

    return {
        offerId: offer._id,
        code: offer.code,
        discountAmount: Math.round(discountAmount),
        discountType: offer.discountType,
        discountValue: offer.discountValue
    };
};

/**
 * Get detailed usage analytics for an offer
 * @param {ObjectId} offerId
 * @param {Object} options
 * @returns {Promise<QueryResult>}
 */
const getOfferUsageAnalytics = async (offerId, options) => {
    const { limit = 10, page = 1 } = options;
    const skip = (page - 1) * limit;

    const filter = { offerId: new mongoose.Types.ObjectId(offerId) };

    const usage = await OfferUsage.find(filter)
        .sort({ usedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email phone profileImage')
        .populate('orderId', 'orderId orderStatus totalAmount');

    const totalResults = await OfferUsage.countDocuments(filter);
    const totalPages = Math.ceil(totalResults / limit);

    return {
        results: usage,
        page,
        limit,
        totalPages,
        totalResults,
    };
};

module.exports = {
    createOffer,
    queryOffers,
    getOfferById,
    updateOfferById,
    deleteOfferById,
    toggleOfferStatus,
    getAvailableOffers,
    applyOffer,
    getOfferUsageAnalytics
};
