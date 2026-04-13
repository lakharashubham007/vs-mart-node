const Privacy = require('./privacy.model');
const httpStatus = require('http-status').status;
const ApiError = require('../../utils/ApiError');

const createPrivacy = async (privacyBody) => {

    return Privacy.create(privacyBody);
};

const queryPrivacies = async () => {
    return Privacy.find().sort({ createdAt: -1 });
};

const getPrivacyById = async (id) => {
    return Privacy.findById(id);
};

const updatePrivacyById = async (privacyId, updateBody) => {
    const privacy = await getPrivacyById(privacyId);
    if (!privacy) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Privacy Policy not found');
    }



    Object.assign(privacy, updateBody);
    await privacy.save();
    return privacy;
};

const deletePrivacyById = async (privacyId) => {
    const privacy = await getPrivacyById(privacyId);
    if (!privacy) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Privacy Policy not found');
    }
    await privacy.deleteOne();
    return privacy;
};

const getActivePrivacy = async () => {
    return Privacy.findOne({ isActive: true });
};

const changePrivacyStatusById = async (privacyId, isActive) => {
    const privacy = await getPrivacyById(privacyId);
    if (!privacy) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Privacy Policy not found');
    }
    privacy.isActive = isActive;
    await privacy.save();
    return privacy;
};

module.exports = {
    createPrivacy,
    queryPrivacies,
    getPrivacyById,
    updatePrivacyById,
    deletePrivacyById,
    getActivePrivacy,
    changePrivacyStatusById
};
