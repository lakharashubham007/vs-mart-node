const express = require('express');
const storyController = require('./story.controller');
const Authentication = require('../../middlewares/auth.middleware');
const Authorization = require('../../middlewares/authorization.middleware');
const storyUpload = require('./story.upload');

const router = express.Router();

// Admin Routes (Private)
router
    .route('/')
    .post(
        Authentication, 
        Authorization, 
        storyUpload.fields([{ name: 'media', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), 
        storyController.createStory
    )
    .get(Authentication, storyController.getStories);

router
    .route('/:storyId')
    .get(Authentication, storyController.getStory)
    .put(
        Authentication, 
        Authorization, 
        storyUpload.fields([{ name: 'media', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), 
        storyController.updateStory
    )
    .delete(Authentication, Authorization, storyController.deleteStory);

module.exports = router;
