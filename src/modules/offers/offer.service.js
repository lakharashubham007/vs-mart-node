const Offer = require('./offer.model');
const ApiError = require('../../utils/ApiError');
const { deleteFromCloudinary } = require('../../utils/image.util');

/**
 * Create an offer
 * @param {Object} offerBody
 * @returns {Promise<Offer>}
 */
const createOffer = async (offerBody) => {
    try {
        return await Offer.create(offerBody);
    } catch (error) {
        if (offerBody.image) {
            await deleteFromCloudinary(offerBody.image);
        }
        throw error;
    }
};

/**
 * Query for offers with pagination and search
 * @param {Object} query - Query parameters (page, limit, search)
 * @returns {Promise<Object>} - Object with offers and pagination info
 */
const queryOffers = async (query = {}) => {
    const { page = 1, limit = 10, search = '' } = query;
    const filter = { isDeleted: false };
    
    if (search) {
        filter.title = { $regex: search, $options: 'i' };
    }

    const options = {
        limit: parseInt(limit, 10),
        skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
        sort: { order: 1, createdAt: -1 }
    };

    const offers = await Offer.find(filter, null, options);
    const total = await Offer.countDocuments(filter);

    return {
        offers,
        pagination: {
            total,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            pages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get active offers for mobile app
 * @returns {Promise<Array<Offer>>}
 */
const getActiveOffers = async () => {
    const now = new Date();
    return Offer.find({
        isActive: true,
        $or: [
            { expiryDate: { $exists: false } },
            { expiryDate: null },
            { expiryDate: { $gt: now } }
        ],
        startDate: { $lte: now }
    }).sort({ order: 1 });
};

/**
 * Get offer by id
 * @param {ObjectId} id
 * @returns {Promise<Offer>}
 */
const getOfferById = async (id) => {
    return Offer.findById(id);
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
        throw new ApiError(404, 'Offer not found');
    }
    
    if (updateBody.image && offer.image && updateBody.image !== offer.image) {
        await deleteFromCloudinary(offer.image);
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
    const offer = await getOfferById(offerId);
    if (!offer) {
        throw new ApiError(404, 'Offer not found');
    }

    if (offer.image) {
        await deleteFromCloudinary(offer.image);
    }

    offer.isDeleted = true;
    await offer.save();
    return offer;
};

module.exports = {
    createOffer,
    queryOffers,
    getActiveOffers,
    getOfferById,
    updateOfferById,
    deleteOfferById,
};
