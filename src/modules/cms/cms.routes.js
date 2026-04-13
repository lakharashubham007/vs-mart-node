const express = require('express');
const Authentication = require('../../middlewares/auth.middleware');
const Authorization = require('../../middlewares/authorization.middleware');
const cmsController = require('./cms.controller');

const router = express.Router();

router
    .route('/')
    .get(Authentication, Authorization, cmsController.getAllCMS);

router
    .route('/:type')
    .get(cmsController.getCMSByType) // Publicly readable
    .put(Authentication, Authorization, cmsController.updateCMS)
    .delete(Authentication, Authorization, cmsController.deleteCMS);

module.exports = router;
