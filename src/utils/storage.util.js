const fs = require('fs');
const path = require('path');

/**
 * Get total size of a folder in bytes
 * @param {string} folderPath 
 * @returns {number} bytes
 */
const getFolderSize = (folderPath) => {
    let totalSize = 0;

    if (!fs.existsSync(folderPath)) {
        return 0;
    }

    const files = fs.readdirSync(folderPath);

    files.forEach(file => {
        const filePath = path.join(folderPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile()) {
            totalSize += stats.size;
        } else if (stats.isDirectory()) {
            totalSize += getFolderSize(filePath);
        }
    });

    return totalSize;
};

module.exports = {
    getFolderSize
};
