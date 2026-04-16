const config = require('../config/config');

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

module.exports = {
    getFullImageUrl,
    getFullImageUrls
};
