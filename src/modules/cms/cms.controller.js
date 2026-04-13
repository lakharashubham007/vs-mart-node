const catchAsync = require('../../utils/catchAsync');
const cmsService = require('./cms.service');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status').status;

const getCMSByType = catchAsync(async (req, res) => {
    const cms = await cmsService.getCMSByType(req.params.type);
    if (!cms) {
        throw new ApiError(httpStatus.NOT_FOUND, 'CMS content not found');
    }
    res.send({ success: true, data: cms });
});

const updateCMS = catchAsync(async (req, res) => {
    const cms = await cmsService.updateCMS(req.params.type, req.body, req.user._id);
    res.send({ success: true, message: `${req.params.type} updated successfully`, data: cms });
});

const getAllCMS = catchAsync(async (req, res) => {
    const cms = await cmsService.getAllCMS();
    res.send({ success: true, data: cms });
});

const deleteCMS = catchAsync(async (req, res) => {
    await cmsService.deleteCMS(req.params.type);
    res.send({ success: true, message: `${req.params.type} deleted successfully` });
});

module.exports = {
    getCMSByType,
    updateCMS,
    getAllCMS,
    deleteCMS
};
