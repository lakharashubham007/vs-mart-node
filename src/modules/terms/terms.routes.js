const express = require('express');
const Authentication = require('../../middlewares/auth.middleware');
const Authorization = require('../../middlewares/authorization.middleware');
const termsController = require('./terms.controller');

const router = express.Router();

router.post('/create-term', Authentication, Authorization, termsController.createTerm);
router.get('/get-terms', Authentication, Authorization, termsController.getTerms);
router.get('/get-term/:termId', Authentication, Authorization, termsController.getTerm);
router.put('/update-term/:termId', Authentication, Authorization, termsController.updateTerm);
router.delete('/delete-term/:termId', Authentication, Authorization, termsController.deleteTerm);
router.patch('/update-term-status/:termId', Authentication, Authorization, termsController.changeTermStatus);

module.exports = router;
