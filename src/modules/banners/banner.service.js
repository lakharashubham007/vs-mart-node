const Banner = require('./banner.model');
const ApiError = require('../../utils/ApiError');
const { deleteFromCloudinary } = require('../../utils/image.util');

/**
 * Create a banner
 * @param {Object} bannerBody
 * @returns {Promise<Banner>}
 */
const createBanner = async (bannerBody) => {
    try {
        return await Banner.create(bannerBody);
    } catch (error) {
        if (bannerBody.image) {
            await deleteFromCloudinary(bannerBody.image);
        }
        throw error;
    }
};

/**
 * Query for banners
 */
const queryBanners = async (filter = {}, options = {}) => {
    const { search, limit = 10, page = 1 } = options;
    const skip = (page - 1) * limit;

    let finalFilter = { ...filter, isDeleted: { $ne: true } };

    if (search) {
        finalFilter.$or = [
            { title: { $regex: search, $options: 'i' } },
            { linkType: { $regex: search, $options: 'i' } }
        ];
    }

    const banners = await Banner.find(finalFilter)
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    const total = await Banner.countDocuments(finalFilter);

    return {
        banners,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get active banners for mobile app
 * @returns {Promise<Array<Banner>>}
 */
const getActiveBanners = async () => {
    const now = new Date();
    return Banner.find({
        isActive: true,
        $or: [
            { expiryDate: { $exists: false } },
            { expiryDate: null },
            { expiryDate: { $gt: now } }
        ],
        publishDate: { $lte: now }
    }).sort({ order: 1 });
};

/**
 * Get banner by id
 * @param {ObjectId} id
 * @returns {Promise<Banner>}
 */
const getBannerById = async (id) => {
    return Banner.findById(id);
};

/**
 * Update banner by id
 * @param {ObjectId} bannerId
 * @param {Object} updateBody
 * @returns {Promise<Banner>}
 */
const updateBannerById = async (bannerId, updateBody) => {
    const banner = await getBannerById(bannerId);
    if (!banner) {
        throw new ApiError(404, 'Banner not found');
    }
    
    if (updateBody.image && banner.image && updateBody.image !== banner.image) {
        await deleteFromCloudinary(banner.image);
    }

    Object.assign(banner, updateBody);
    await banner.save();
    return banner;
};

/**
 * Delete banner by id
 * @param {ObjectId} bannerId
 * @returns {Promise<Banner>}
 */
const deleteBannerById = async (bannerId) => {
    const banner = await getBannerById(bannerId);
    if (!banner) {
        throw new ApiError(404, 'Banner not found');
    }

    if (banner.image) {
        await deleteFromCloudinary(banner.image);
    }

    banner.isDeleted = true;
    await banner.save();
    return banner;
};

module.exports = {
    createBanner,
    queryBanners,
    getActiveBanners,
    getBannerById,
    updateBannerById,
    deleteBannerById,
};
