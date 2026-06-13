const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = 'vsmart/products';
    
    if (file.fieldname === 'profileImage') {
      folder = req.originalUrl.includes('/user/') ? 'vsmart/userProfile' : 'vsmart/profiles';
    } else if (req.originalUrl.includes('banners')) {
      folder = 'vsmart/banners';
    } else if (req.originalUrl.includes('offers')) {
      folder = 'vsmart/offers';
    } else if (req.originalUrl.includes('delivery-boy')) {
      folder = 'vsmart/delivery-boys';
    } else if (req.originalUrl.includes('stories')) {
      folder = 'vsmart/stories';
    }

    const isVideo = file.mimetype.startsWith('video/');

    return {
      folder: folder,
      public_id: file.fieldname + '-' + Date.now(),
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp4'],
      resource_type: isVideo ? 'video' : 'image',
    };
  },
});

module.exports = { cloudinary, storage };
