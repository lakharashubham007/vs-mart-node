const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

/**
 * Generates a QR code for a product or variant and saves it to the filesystem.
 * @param {string} slug - The product slug.
 * @param {string} variantId - Optional variant ID.
 * @returns {Promise<string>} - The relative path to the saved QR code image.
 */
const generateProductQRCode = async (slug, variantId = null) => {
    try {
        const qrDir = path.join(__dirname, '../../uploads/qrcodes');

        // Ensure directory exists
        if (!fs.existsSync(qrDir)) {
            fs.mkdirSync(qrDir, { recursive: true });
        }

        // Universal web landing page link: {frontendUrl}/p/{slug}?v={variantId}
        const data = variantId
            ? `${config.frontendUrl}/p/${slug}?v=${variantId}`
            : `${config.frontendUrl}/p/${slug}`;

        const fileName = variantId
            ? `${slug}-${variantId}-qr.png`
            : `${slug}-qr.png`;

        const filePath = path.join(qrDir, fileName);

        // Generate and save QR code
        await QRCode.toFile(filePath, data, {
            color: {
                dark: '#1A6B3A', // primary color
                light: '#FFFFFF'
            },
            width: 512
        });

        // Return relative path for storage in DB
        return `/uploads/qrcodes/${fileName}`;
    } catch (err) {
        console.error('QR Code generation failed:', err);
        return null;
    }
};

module.exports = {
    generateProductQRCode
};
