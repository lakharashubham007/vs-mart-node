const config = require('../config/config');
const { cloudinary } = require('../config/cloudinary');

/**
 * Ensures an image path is returned as a full URL.
 * If it's already a full URL (starts with http), it's returned as is.
 * If it's a relative path, it's prefixed with the backend URL.
 * @param {string} path - The image path or URL
 * @returns {string} - Full image URL
 */
const getFullImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${config.backendUrl}/${path}`;
};

/**
 * Handles arrays of image paths/URLs.
 * @param {string[]} paths - Array of image paths or URLs
 * @returns {string[]} - Array of full image URLs
 */
const getFullImageUrls = (paths) => {
    if (!paths || !Array.isArray(paths)) return [];
    return paths.map(path => getFullImageUrl(path));
};

/**
 * Extracts public_id from Cloudinary URL and deletes the image.
 * Handles single URL or array of URLs.
 * @param {string|string[]} target - URL or array of URLs to delete
 */
const deleteFromCloudinary = async (target) => {
    if (!target) return;

    const deleteSingle = async (url) => {
        if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return;

        try {
            // Extract public_id:
            // Standard Cloudinary URL: https://res.cloudinary.com/[cloud]/image/upload/v[ver]/[public_id].[ext]
            // We want everything between /v[ver]/ and the last dot.
            const parts = url.split('/');
            const uploadIndex = parts.indexOf('upload');
            if (uploadIndex === -1) return;

            // Public ID is everything after the version segment (vNNNNN)
            // But sometimes people don't use versions. 
            // Better: find the version segment (starts with 'v') or just everything after 'upload/'
            const publicIdWithExt = parts.slice(uploadIndex + 2).join('/'); // skipping 'upload' and 'version'
            const publicId = publicIdWithExt.split('.')[0];
            
            console.log(`🗑️ [Cloudinary] Deleting public_id: ${publicId}`);
            await cloudinary.uploader.destroy(publicId);
        } catch (error) {
            console.error('❌ [Cloudinary] Delete error:', error.message);
        }
    };

    if (Array.isArray(target)) {
        await Promise.all(target.map(url => deleteSingle(url)));
    } else {
        await deleteSingle(target);
    }
};

module.exports = {
    getFullImageUrl,
    getFullImageUrls,
    deleteFromCloudinary
};
