const httpStatus = require('http-status');
const catchAsync = require('../../utils/catchAsync');
const storyService = require('./story.service');
const { cloudinary } = require('../../config/cloudinary');
const fs = require('fs');
const path = require('path');

const createStory = catchAsync(async (req, res) => {
    const storyData = { ...req.body };
    
    // Handle Media (Video or Image)
    if (req.files && req.files.media) {
        const mediaFile = req.files.media[0];
        if (mediaFile.mimetype.startsWith('video/')) {
            // Local path for video
            storyData.media = `uploads/videos/${mediaFile.filename}`;
            storyData.mediaType = 'video';
        } else {
            // Upload image to Cloudinary and delete local temp
            const result = await cloudinary.uploader.upload(mediaFile.path, {
                folder: 'vsmart/stories',
                format: 'jpg'
            });
            storyData.media = result.secure_url;
            storyData.mediaType = 'image';
            if (fs.existsSync(mediaFile.path)) fs.unlinkSync(mediaFile.path);
        }
    }

    // Handle Thumbnail (Always Cloudinary)
    if (req.files && req.files.thumbnail) {
        const thumbFile = req.files.thumbnail[0];
        const result = await cloudinary.uploader.upload(thumbFile.path, {
            folder: 'vsmart/stories/thumbnails',
            format: 'jpg'
        });
        storyData.thumbnail = result.secure_url;
        if (fs.existsSync(thumbFile.path)) fs.unlinkSync(thumbFile.path);
    }

    const story = await storyService.createStory({
        ...storyData,
        createdBy: req.user._id
    });

    res.status(201).send({
        success: true,
        message: 'Story created successfully',
        data: story
    });
});

const getStories = catchAsync(async (req, res) => {
    const { isActive, search, limit, page } = req.query;
    const filter = isActive !== undefined ? { isActive: isActive === 'true' } : {};
    const options = { search, limit, page };
    const result = await storyService.queryStories(filter, options);
    res.send({
        success: true,
        data: result.stories,
        pagination: result.pagination
    });
});

const getAppStories = catchAsync(async (req, res) => {
    console.log('📖 [API] Fetching app stories');
    const stories = await storyService.getActiveStories();
    res.send({
        success: true,
        data: stories
    });
});

const getStory = catchAsync(async (req, res) => {
    const story = await storyService.getStoryById(req.params.storyId);
    if (!story) {
        return res.status(404).send({
            status: false,
            message: 'Story not found'
        });
    }
    res.send({
        success: true,
        data: story
    });
});

const updateStory = catchAsync(async (req, res) => {
    const storyData = { ...req.body };
    const oldStory = await storyService.getStoryById(req.params.storyId);

    if (!oldStory) {
        return res.status(404).send({ success: false, message: 'Story not found' });
    }

    // ── Handle Media Update ──────────────────────────────────────────────────
    if (req.files && req.files.media) {
        const mediaFile = req.files.media[0];

        // Delete OLD media
        if (oldStory.media) {
            if (oldStory.mediaType === 'video' && oldStory.media.startsWith('uploads/')) {
                // Delete old local video file
                const oldPath = path.join(__dirname, '../../../', oldStory.media);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            } else if (oldStory.media.startsWith('http')) {
                // Delete old Cloudinary image
                try {
                    const urlParts = oldStory.media.split('/');
                    const publicIdWithExt = urlParts.slice(-2).join('/'); // folder/filename
                    const publicId = publicIdWithExt.replace(/\.[^.]+$/, ''); // remove extension
                    await cloudinary.uploader.destroy(publicId);
                } catch (e) { /* Cloudinary delete failed silently */ }
            }
        }

        if (mediaFile.mimetype.startsWith('video/')) {
            storyData.media = `uploads/videos/${mediaFile.filename}`;
            storyData.mediaType = 'video';
        } else {
            const result = await cloudinary.uploader.upload(mediaFile.path, {
                folder: 'vsmart/stories',
                format: 'jpg'
            });
            storyData.media = result.secure_url;
            storyData.mediaType = 'image';
            if (fs.existsSync(mediaFile.path)) fs.unlinkSync(mediaFile.path);
        }
    }
    // If no new media uploaded, keep old media as is (don't set storyData.media)

    // ── Handle Thumbnail Update ───────────────────────────────────────────────
    if (req.files && req.files.thumbnail) {
        const thumbFile = req.files.thumbnail[0];

        // Delete OLD thumbnail from Cloudinary
        if (oldStory.thumbnail && oldStory.thumbnail.startsWith('http')) {
            try {
                const urlParts = oldStory.thumbnail.split('/');
                const publicIdWithExt = urlParts.slice(-2).join('/');
                const publicId = publicIdWithExt.replace(/\.[^.]+$/, '');
                await cloudinary.uploader.destroy(publicId);
            } catch (e) { /* silent */ }
        }

        const result = await cloudinary.uploader.upload(thumbFile.path, {
            folder: 'vsmart/stories/thumbnails',
            format: 'jpg'
        });
        storyData.thumbnail = result.secure_url;
        if (fs.existsSync(thumbFile.path)) fs.unlinkSync(thumbFile.path);
    }
    // If no new thumbnail uploaded, keep old thumbnail as is

    const story = await storyService.updateStoryById(req.params.storyId, storyData);
    res.send({
        success: true,
        message: 'Story updated successfully',
        data: story
    });
});


const deleteStory = catchAsync(async (req, res) => {
    const story = await storyService.getStoryById(req.params.storyId);
    if (!story) {
        return res.status(404).send({ status: false, message: 'Story not found' });
    }

    // Delete local video file if it exists
    if (story.mediaType === 'video' && story.media.startsWith('uploads/')) {
        const filePath = path.join(__dirname, '../../../', story.media);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    await storyService.deleteStoryById(req.params.storyId);
    res.status(204).send();
});

module.exports = {
    createStory,
    getStories,
    getAppStories,
    getStory,
    updateStory,
    deleteStory,
};
