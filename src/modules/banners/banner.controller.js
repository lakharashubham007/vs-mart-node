const catchAsync = require('../../utils/catchAsync');
const bannerService = require('./banner.service');
const ApiError = require('../../utils/ApiError');

const createBanner = catchAsync(async (req, res) => {
    const bannerData = {
        ...req.body,
        image: req.file ? `uploads/banners/${req.file.filename}` : null,
        createdBy: req.user._id
    };

    if (!bannerData.image) {
        throw new ApiError(400, 'Banner image is required');
    }
    console.log("bannerData", bannerData);
    const banner = await bannerService.createBanner(bannerData);
    res.status(201).send({ banner });
});

const getBanners = catchAsync(async (req, res) => {
    const { page, limit, search } = req.query;
    const result = await bannerService.queryBanners({}, { page, limit, search });
    res.send(result);
});

const getActiveBanners = catchAsync(async (req, res) => {
    const banners = await bannerService.getActiveBanners();
    res.send({ banners });
});

const getBanner = catchAsync(async (req, res) => {
    const banner = await bannerService.getBannerById(req.params.bannerId);
    if (!banner) {
        throw new ApiError(404, 'Banner not found');
    }
    res.send({ banner });
});

const updateBanner = catchAsync(async (req, res) => {
    const updateBody = { ...req.body, updatedBy: req.user._id };
    if (req.file) {
        updateBody.image = `uploads/banners/${req.file.filename}`;
    }
    const banner = await bannerService.updateBannerById(req.params.bannerId, updateBody);
    res.send({ banner });
});

const updateBannerStatus = catchAsync(async (req, res) => {
    const { isActive } = req.body;
    const banner = await bannerService.updateBannerById(req.params.bannerId, { isActive, updatedBy: req.user._id });
    res.send({ banner });
});

const deleteBanner = catchAsync(async (req, res) => {
    await bannerService.deleteBannerById(req.params.bannerId);
    res.status(204).send();
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
