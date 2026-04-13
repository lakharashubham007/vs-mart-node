/**
 * Catch async errors in express routes
 * @param {Function} fn
 * @returns {Function}
 */
const catchAsync = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};

module.exports = catchAsync;
