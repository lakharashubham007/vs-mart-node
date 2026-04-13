const httpStatus = require('http-status').status;
const catchAsync = require('../../utils/catchAsync');
const privacyService = require('./privacy.service');

const createPrivacy = catchAsync(async (req, res) => {
    const privacy = await privacyService.createPrivacy(req.body);
    res.status(httpStatus.CREATED).send({ success: true, data: privacy });
});

const getPrivacies = catchAsync(async (req, res) => {
    const privacies = await privacyService.queryPrivacies();
    res.send({ success: true, data: privacies });
});

const getPrivacy = catchAsync(async (req, res) => {
    const privacy = await privacyService.getPrivacyById(req.params.privacyId);
    if (!privacy) {
        return res.status(httpStatus.NOT_FOUND).send({ success: false, message: 'Privacy Policy not found' });
    }
    res.send({ success: true, data: privacy });
});

const updatePrivacy = catchAsync(async (req, res) => {
    const privacy = await privacyService.updatePrivacyById(req.params.privacyId, req.body);
    res.send({ success: true, data: privacy });
});

const deletePrivacy = catchAsync(async (req, res) => {
    await privacyService.deletePrivacyById(req.params.privacyId);
    res.status(httpStatus.NO_CONTENT).send();
});

const getActivePrivacy = catchAsync(async (req, res) => {
    const privacy = await privacyService.getActivePrivacy();
    res.send({ success: true, data: privacy });
});

const changePrivacyStatus = catchAsync(async (req, res) => {
    const privacy = await privacyService.changePrivacyStatusById(req.params.privacyId, req.body.isActive);
    res.send({ success: true, message: 'Privacy policy status updated successfully', data: privacy });
});

const getPublicPrivacies = catchAsync(async (req, res) => {
    const privacies = await privacyService.queryPrivacies();
    const activePrivacies = privacies.filter(p => p.isActive);
    res.send({ success: true, data: activePrivacies });
});

module.exports = {
    createPrivacy,
    getPrivacies,
    getPrivacy,
    updatePrivacy,
    deletePrivacy,
    getActivePrivacy,
    changePrivacyStatus,
    getPublicPrivacies
};
