const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === 'profileImage') {
            // User profile update goes to userProfile/, admin goes to profiles/
            if (req.originalUrl.includes('/user/')) {
                cb(null, 'uploads/userProfile/');
            } else {
                cb(null, 'uploads/profiles/');  // Admin profile images
            }
        } else if (req.originalUrl.includes('banners')) {
            cb(null, 'uploads/banners/');
        } else if (req.originalUrl.includes('offers')) {
            cb(null, 'uploads/offers/');
        } else if (req.originalUrl.includes('delivery-boy')) {
            cb(null, 'uploads/delivery-boys/');
        } else {
            cb(null, 'uploads/products/');
        }
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = upload;
