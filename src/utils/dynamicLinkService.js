const axios = require('axios');

/**
 * Generate a short Firebase Dynamic Link using the REST API.
 * 
 * @param {Object} params
 * @param {string} params.productId - The product ID to link to
 * @param {string} params.title - Social meta title
 * @param {string} params.image - Social meta image URL
 * @param {string} params.description - Social meta description
 * @returns {Promise<string>} - Short dynamic link URL
 */
const generateShortLink = async ({ productId, title, image, description }) => {
    try {
        const apiKey = process.env.FIREBASE_API_KEY;
        const domainUriPrefix = process.env.DYNAMIC_LINK_DOMAIN; // e.g., https://vsmart.page.link

        if (!apiKey || !domainUriPrefix) {
            console.error('❌ [DynamicLinkService] Missing FIREBASE_API_KEY or DYNAMIC_LINK_DOMAIN in env');
            throw new Error('Firebase Dynamic Link configuration missing');
        }

        // PER USER REQUIREMENT: We use the page.link domain for the deep link itself 
        // to ensure Firebase handles the routing regardless of website domain verification.
        const deepLink = `${domainUriPrefix}/product/${productId}`;

        console.log(`📡 [DynamicLinkService] Generating short link for deep link: ${deepLink}`);

        const response = await axios.post(
            `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${apiKey}`,
            {
                dynamicLinkInfo: {
                    domainUriPrefix,
                    link: deepLink,
                    androidInfo: {
                        androidPackageName: 'com.vsmart',
                    },
                    socialMetaTagInfo: {
                        socialTitle: title,
                        socialDescription: description || 'Check out this amazing product on VS Mart!',
                        socialImageLink: image,
                    },
                },
                suffix: {
                    option: 'SHORT',
                },
            }
        );

        if (!response.data || !response.data.shortLink) {
            throw new Error('No shortLink returned from Firebase API');
        }

        return response.data.shortLink;
    } catch (error) {
        const errorData = error.response?.data || error.message;
        console.error('❌ [DynamicLinkService] Error generating short link:', errorData);
        // DO NOT return the long link fallback. Throw instead so controller can handle error.
        throw new Error('Failed to generate short link');
    }
};

module.exports = {
    generateShortLink,
};
