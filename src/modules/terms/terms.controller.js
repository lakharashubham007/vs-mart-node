const catchAsync = require('../../utils/catchAsync');
const termsService = require('./terms.service');
const httpStatus = require('http-status').status;

const createTerm = catchAsync(async (req, res) => {
    const term = await termsService.createTerm(req.body, req.user._id);
    res.status(httpStatus.CREATED).send({ success: true, data: term });
});

const getTerms = catchAsync(async (req, res) => {
    const result = await termsService.queryTerms();
    res.send({ success: true, data: result });
});

const getTerm = catchAsync(async (req, res) => {
    const term = await termsService.getTermById(req.params.termId);
    if (!term) {
        return res.status(httpStatus.NOT_FOUND).send({ success: false, message: 'Term not found' });
    }
    res.send({ success: true, data: term });
});

const updateTerm = catchAsync(async (req, res) => {
    const term = await termsService.updateTermById(req.params.termId, req.body, req.user._id);
    res.send({ success: true, data: term });
});

const deleteTerm = catchAsync(async (req, res) => {
    await termsService.deleteTermById(req.params.termId);
    res.status(httpStatus.NO_CONTENT).send();
});

const changeTermStatus = catchAsync(async (req, res) => {
    const term = await termsService.changeTermStatusById(req.params.termId, req.body.isActive);
    res.send({ success: true, message: 'Term status updated successfully', data: term });
});

const getPublicTerms = catchAsync(async (req, res) => {
    const terms = await termsService.queryTerms();
    const activeTerms = terms.filter(t => t.isActive);
    res.send({ success: true, data: activeTerms });
});

module.exports = {
    createTerm,
    getTerms,
    getTerm,
    updateTerm,
    deleteTerm,
    changeTermStatus,
    getPublicTerms
};
