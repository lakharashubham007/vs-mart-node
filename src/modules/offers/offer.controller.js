const catchAsync = require('../../utils/catchAsync');
const offerService = require('./offer.service');
const ApiError = require('../../utils/ApiError');

const createOffer = catchAsync(async (req, res) => {
    const offerData = {
        ...req.body,
        image: req.file ? req.file.path : null,
        createdBy: req.user._id
    };

    if (!offerData.image) {
        throw new ApiError(400, 'Offer image is required');
    }
    
    const offer = await offerService.createOffer(offerData);
    res.status(201).send({ offer });
});

const getOffers = catchAsync(async (req, res) => {
    const { page, limit, search } = req.query;
    const result = await offerService.queryOffers({ page, limit, search });
    res.send(result);
});

const getActiveOffers = catchAsync(async (req, res) => {
    const offers = await offerService.getActiveOffers();
    res.send({ offers });
});

const getOffer = catchAsync(async (req, res) => {
    const offer = await offerService.getOfferById(req.params.offerId);
    if (!offer) {
        throw new ApiError(404, 'Offer not found');
    }
    res.send({ offer });
});

const updateOffer = catchAsync(async (req, res) => {
    const updateBody = { ...req.body, updatedBy: req.user._id };
    if (req.file) {
        updateBody.image = req.file.path;
    }
    const offer = await offerService.updateOfferById(req.params.offerId, updateBody);
    res.send({ offer });
});

const updateOfferStatus = catchAsync(async (req, res) => {
    const { isActive } = req.body;
    const offer = await offerService.updateOfferById(req.params.offerId, { isActive, updatedBy: req.user._id });
    res.send({ offer });
});

const deleteOffer = catchAsync(async (req, res) => {
    await offerService.deleteOfferById(req.params.offerId);
    res.status(204).send();
});

module.exports = {
    createOffer,
    getOffers,
    getActiveOffers,
    getOffer,
    updateOffer,
    updateOfferStatus,
    deleteOffer,
};
