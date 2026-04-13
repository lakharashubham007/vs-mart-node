const Terms = require('./terms.model');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status').status;

/**
 * Create a new term
 * @param {Object} termBody
 * @param {ObjectId} adminId
 * @returns {Promise<Terms>}
 */
const createTerm = async (termBody, adminId) => {

    return await Terms.create({ ...termBody, updatedBy: adminId });
};

/**
 * Query for terms
 * @returns {Promise<QueryResult>}
 */
const queryTerms = async () => {
    return await Terms.find().sort({ createdAt: -1 });
};

/**
 * Get term by id
 * @param {ObjectId} id
 * @returns {Promise<Terms>}
 */
const getTermById = async (id) => {
    return await Terms.findById(id);
};

/**
 * Update term by id
 * @param {ObjectId} termId
 * @param {Object} updateBody
 * @param {ObjectId} adminId
 * @returns {Promise<Terms>}
 */
const updateTermById = async (termId, updateBody, adminId) => {
    const term = await getTermById(termId);
    if (!term) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Term not found');
    }



    Object.assign(term, updateBody);
    term.updatedBy = adminId;
    await term.save();
    return term;
};

/**
 * Delete term by id
 * @param {ObjectId} termId
 * @returns {Promise<Terms>}
 */
const deleteTermById = async (termId) => {
    const term = await getTermById(termId);
    if (!term) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Term not found');
    }
    await term.deleteOne();
    return term;
};

/**
 * Change term status
 * @param {ObjectId} termId
 * @param {boolean} isActive
 * @returns {Promise<Terms>}
 */
const changeTermStatusById = async (termId, isActive) => {
    const term = await getTermById(termId);
    if (!term) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Term not found');
    }
    term.isActive = isActive;
    await term.save();
    return term;
};

module.exports = {
    createTerm,
    queryTerms,
    getTermById,
    updateTermById,
    deleteTermById,
    changeTermStatusById
};
