/**
 * Distance and Delivery Charge calculation utility
 */

const STORE_LOCATION = {
    latitude: 23.723167,
    longitude: 73.695313
};

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function getDistanceInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

module.exports = {
    STORE_LOCATION,
    getDistanceInKm
};
