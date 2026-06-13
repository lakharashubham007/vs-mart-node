const catchAsync = require('../../utils/catchAsync');
const bannerService = require('./banner.service');
const ApiError = require('../../utils/ApiError');

const createBanner = catchAsync(async (req, res) => {
    const bannerData = {
        ...req.body,
        image: req.file ? req.file.path : null,
        createdBy: req.user._id
    };

    if (!bannerData.image) {
        throw new ApiError(400, 'Banner image is required');
    }

    if (!bannerData.type) {
        throw new ApiError(400, 'Banner type is required');
    }

    const banner = await bannerService.createBanner(bannerData);
    res.status(201).send({ 
        success: true,
        message: 'Banner created successfully',
        banner 
    });
});

const getBanners = catchAsync(async (req, res) => {
    const { page, limit, search, type } = req.query;
    const result = await bannerService.queryBanners({}, { page, limit, search, type });
    res.send({
        success: true,
        ...result
    });
});

const getActiveBanners = catchAsync(async (req, res) => {
    const { type } = req.query;
    const banners = await bannerService.getActiveBanners(type);
    res.send({ 
        success: true,
        banners 
    });
});

const getBanner = catchAsync(async (req, res) => {
    const banner = await bannerService.getBannerById(req.params.bannerId);
    if (!banner) {
        throw new ApiError(404, 'Banner not found');
    }
    res.send({ 
        success: true,
        banner 
    });
});

const updateBanner = catchAsync(async (req, res) => {
    const updateBody = { ...req.body, updatedBy: req.user._id };
    if (req.file) {
        updateBody.image = req.file.path;
    }
    const banner = await bannerService.updateBannerById(req.params.bannerId, updateBody);
    res.send({ 
        success: true,
        message: 'Banner updated successfully',
        banner 
    });
});

const updateBannerStatus = catchAsync(async (req, res) => {
    const { isActive } = req.body;
    const banner = await bannerService.updateBannerById(req.params.bannerId, { isActive, updatedBy: req.user._id });
    res.send({ 
        success: true,
        message: `Banner ${isActive ? 'activated' : 'deactivated'} successfully`,
        banner 
    });
});

const deleteBanner = catchAsync(async (req, res) => {
    await bannerService.deleteBannerById(req.params.bannerId);
    res.send({
        success: true,
        message: 'Banner deleted successfully'
    });
});

module.exports = {
    createBanner,
    getBanners,
    getActiveBanners,
    getBanner,
    updateBanner,
    updateBannerStatus,
    deleteBanner,
};
