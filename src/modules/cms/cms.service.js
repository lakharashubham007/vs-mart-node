const CMS = require('./cms.model');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status');

/**
 * Get CMS content by type
 * @param {string} type
 * @returns {Promise<CMS>}
 */
const getCMSByType = async (type) => {
    return await CMS.findOne({ type });
};

/**
 * Update or Create CMS content
 * @param {string} type
 * @param {Object} updateBody
 * @param {ObjectId} adminId
 * @returns {Promise<CMS>}
 */
const updateCMS = async (type, updateBody, adminId) => {
    let cms = await CMS.findOne({ type });
    if (!cms) {
        cms = new CMS({ type, ...updateBody, updatedBy: adminId });
    } else {
        Object.assign(cms, updateBody);
        cms.updatedBy = adminId;
    }
    await cms.save();
    return cms;
};

/**
 * Get all CMS records
 * @returns {Promise<QueryResult>}
 */
const getAllCMS = async () => {
    return await CMS.find();
};

/**
 * Delete CMS content by type
 * @param {string} type
 * @returns {Promise<CMS>}
 */
const deleteCMS = async (type) => {
    const cms = await getCMSByType(type);
    if (!cms) {
        throw new ApiError(httpStatus.NOT_FOUND, 'CMS content not found');
    }
    await cms.remove();
    return cms;
};

module.exports = {
    getCMSByType,
    updateCMS,
    getAllCMS,
    deleteCMS
};
