const bwipjs = require('bwip-js');
const path = require('path');
const fs = require('fs');

/**
 * Calculates EAN-13 checksum for a 12-digit string.
 */
const calculateEanChecksum = (digits) => {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checksum = (10 - (sum % 10)) % 10;
    return checksum;
};

/**
 * Generates a unique 13-digit EAN-13 number.
 * For this implementation, we use a prefix (e.g., 890 for India or a custom internal prefix)
 * + a random 9-digit number + checksum.
 */
const generateRandomEan = () => {
    const prefix = '890'; // Example prefix
    const randomBody = Math.floor(100000000 + Math.random() * 900000000).toString();
    const twelveDigits = prefix + randomBody;
    const checksum = calculateEanChecksum(twelveDigits);
    return twelveDigits + checksum;
};

/**
 * Generates an EAN-13 barcode image and saves it to the filesystem.
 * @param {string} ean - The 13-digit EAN number.
 * @param {string} fileNamePrefix - Prefix for the filename.
 * @returns {Promise<string>} - The relative path to the saved barcode image.
 */
const generateEanBarcode = async (ean, fileNamePrefix) => {
    try {
        const barcodeDir = path.join(__dirname, '../../uploads/barcodes');

        // Ensure directory exists
        if (!fs.existsSync(barcodeDir)) {
            fs.mkdirSync(barcodeDir, { recursive: true });
        }

        const fileName = `${fileNamePrefix}-barcode.png`;
        const filePath = path.join(barcodeDir, fileName);

        const png = await bwipjs.toBuffer({
            bcid: 'ean13',       // Barcode type
            text: ean,           // Text to encode
            scale: 3,            // 3x scaling factor
            height: 10,          // Bar height, in millimeters
            includetext: true,   // Show human-readable text
            textxalign: 'center',// Always good to set this
        });

        fs.writeFileSync(filePath, png);

        // Return relative path for storage in DB
        return `/uploads/barcodes/${fileName}`;
    } catch (err) {
        console.error('Barcode generation failed:', err);
        return null;
    }
};

module.exports = {
    generateRandomEan,
    generateEanBarcode
};
