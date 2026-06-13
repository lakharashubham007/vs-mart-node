const httpStatus = require('http-status').status;
const catchAsync = require('../../utils/catchAsync');
const offerService = require('./offer.service');
const ApiError = require('../../utils/ApiError');

const createOffer = catchAsync(async (req, res) => {
    const offer = await offerService.createOffer({
        ...req.body,
        createdBy: req.user.id
    });
    res.status(httpStatus.CREATED).send({
        success: true,
        message: 'Offer created successfully',
        data: offer
    });
});

const getOffers = catchAsync(async (req, res) => {
    const filter = { isDeleted: false };
    if (req.query.search) {
        filter.$or = [
            { title: { $regex: req.query.search, $options: 'i' } },
            { code: { $regex: req.query.search, $options: 'i' } }
        ];
    }
    if (req.query.type) filter.type = req.query.type;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const options = {
        sortBy: req.query.sortBy,
        limit: parseInt(req.query.limit, 10) || 10,
        page: parseInt(req.query.page, 10) || 1
    };

    const result = await offerService.queryOffers(filter, options);
    res.send({
        success: true,
        data: result
    });
});

const getOffer = catchAsync(async (req, res) => {
    const offer = await offerService.getOfferById(req.params.offerId);
    if (!offer) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Offer not found');
    }
    res.send({
        success: true,
        data: offer
    });
});

const updateOffer = catchAsync(async (req, res) => {
    const offer = await offerService.updateOfferById(req.params.offerId, {
        ...req.body,
        updatedBy: req.user.id
    });
    res.send({
        success: true,
        message: 'Offer updated successfully',
        data: offer
    });
});

const deleteOffer = catchAsync(async (req, res) => {
    await offerService.deleteOfferById(req.params.offerId);
    res.send({
        success: true,
        message: 'Offer deleted successfully'
    });
});

const toggleStatus = catchAsync(async (req, res) => {
    const offer = await offerService.toggleOfferStatus(req.params.offerId);
    res.status(httpStatus.OK).send({
        success: true,
        message: `Offer status ${offer.isActive ? 'activated' : 'deactivated'} successfully`,
        data: offer
    });
});

const getAvailableOffers = catchAsync(async (req, res) => {
    const { orderAmount } = req.query;
    const offers = await offerService.getAvailableOffers(req.user.id, parseFloat(orderAmount) || 0);
    res.status(httpStatus.OK).send({
        success: true,
        data: offers
    });
});

const applyOffer = catchAsync(async (req, res) => {
    const { code, orderAmount } = req.body;
    const result = await offerService.applyOffer(code, req.user.id, parseFloat(orderAmount) || 0);
    res.status(httpStatus.OK).send({
        success: true,
        data: result
    });
});

const getUsageAnalytics = catchAsync(async (req, res) => {
    const options = {
        limit: parseInt(req.query.limit, 10) || 10,
        page: parseInt(req.query.page, 10) || 1
    };
    const result = await offerService.getOfferUsageAnalytics(req.params.offerId, options);
    res.send({
        success: true,
        data: result
    });
});

module.exports = {
    createOffer,
    getOffers,
    getOffer,
    updateOffer,
    deleteOffer,
    toggleStatus,
    getAvailableOffers,
    applyOffer,
    getUsageAnalytics
};
