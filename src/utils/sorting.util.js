/**
 * Parses a string with a number and unit into a base value (Grams or Milliliters)
 * for correct numeric comparison.
 */
const parseToValue = (str) => {
    if (!str) return 0;
    const numPart = str.match(/[\d.]+/);
    const value = numPart ? parseFloat(numPart[0]) : 0;
    const lowerStr = str.toLowerCase();

    // Weight conversion to Grams
    if (lowerStr.includes('kg') || lowerStr.includes('kilogram')) return value * 1000;
    if (lowerStr.includes('gram') || lowerStr.includes('gm') || lowerStr.match(/\d+\s*g($|\s)/)) return value;
    if (lowerStr.includes('mg') || lowerStr.includes('milligram')) return value / 1000;

    // Volume conversion to Milliliters
    if (lowerStr.includes('liter') || lowerStr.includes('ltr') || lowerStr.match(/\d+\s*l($|\s)/)) return value * 1000;
    if (lowerStr.includes('ml') || lowerStr.includes('milliliter')) return value;

    return value;
};

/**
 * Sorts an array of objects by a property that contains unit-based values.
 * @param {Array} items - Array of objects to sort
 * @param {Function} getNameFn - Function to extract the unit string from an item
 * @returns {Array} - Sorted array
 */
const sortByUnitValue = (items, getNameFn) => {
    if (!items || !Array.isArray(items)) return [];

    return items.sort((a, b) => {
        const nameA = String(getNameFn(a));
        const nameB = String(getNameFn(b));

        const valA = parseToValue(nameA);
        const valB = parseToValue(nameB);

        if (valA !== valB) {
            return valA - valB;
        }

        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });
};

module.exports = {
    parseToValue,
    sortByUnitValue
};
