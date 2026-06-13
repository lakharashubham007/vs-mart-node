const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getFolderSize } = require('../../utils/storage.util');
const ApiError = require('../../utils/ApiError');

const MAX_STORAGE_SIZE = 1 * 1024 * 1024 * 1024; // 1GB
const VIDEO_UPLOAD_PATH = path.join(__dirname, '../../../uploads/videos');

// Ensure directory exists
if (!fs.existsSync(VIDEO_UPLOAD_PATH)) {
    fs.mkdirSync(VIDEO_UPLOAD_PATH, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Check storage limit before accepting the file
        const currentSize = getFolderSize(VIDEO_UPLOAD_PATH);
        if (currentSize >= MAX_STORAGE_SIZE) {
            return cb(new ApiError(400, 'Video storage is full. Please delete old videos.'), null);
        }

        // We store everything in a temp folder if it's an image (to be uploaded to cloudinary)
        // or in the final videos folder if it's a video
        if (file.mimetype.startsWith('video/')) {
            cb(null, VIDEO_UPLOAD_PATH);
        } else {
            cb(null, 'uploads/'); // Temp for images
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new ApiError(400, 'Only images and videos are allowed'), false);
    }
};

const storyUpload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB per file
});

module.exports = storyUpload;
