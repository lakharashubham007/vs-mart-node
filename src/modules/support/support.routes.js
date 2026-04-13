const express = require('express');
const router = express.Router();
const supportController = require('./support.controller');
const auth = require('../../middlewares/auth.middleware');
const validateRole = require('../../middlewares/authorization.middleware');

router.post('/create-support', auth, validateRole, supportController.createSupport);
router.get('/get-supports', auth, validateRole, supportController.getAllSupport);
router.get('/get-active-support', supportController.getActiveSupport);
router.get('/get-support/:id', auth, validateRole, supportController.getSupportById);
router.put('/update-support/:id', auth, validateRole, supportController.updateSupport);
router.delete('/delete-support/:id', auth, validateRole, supportController.deleteSupport);
router.patch('/update-support-status/:id', auth, validateRole, supportController.changeSupportStatus);

module.exports = router;
