const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validateRole = require('../../middlewares/authorization.middleware');
const privacyController = require('./privacy.controller');

const router = express.Router();

router.post('/create-privacy', auth, validateRole, privacyController.createPrivacy);
router.get('/get-privacies', auth, validateRole, privacyController.getPrivacies);
router.get('/get-active-privacy', privacyController.getActivePrivacy);
router.get('/get-privacy/:privacyId', auth, validateRole, privacyController.getPrivacy);
router.put('/update-privacy/:privacyId', auth, validateRole, privacyController.updatePrivacy);
router.delete('/delete-privacy/:privacyId', auth, validateRole, privacyController.deletePrivacy);
router.patch('/update-privacy-status/:privacyId', auth, validateRole, privacyController.changePrivacyStatus);

module.exports = router;
