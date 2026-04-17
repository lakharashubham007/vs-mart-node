const express = require('express');
const shareController = require('./share.controller');
const Authentication = require('../../middlewares/auth.middleware');

const router = express.Router();

// Generate link — requires authentication to prevent abuse
router.post('/generate-link', Authentication, shareController.generateLink);

module.exports = router;
