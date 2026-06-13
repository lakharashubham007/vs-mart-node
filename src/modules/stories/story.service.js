const Story = require('./story.model');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status').status;

/**
 * Create a story
 * @param {Object} storyBody
 * @returns {Promise<Story>}
 */
const createStory = async (storyBody) => {
    return Story.create(storyBody);
};

/**
 * Query for stories (Admin)
 */
const queryStories = async (filter = {}, options = {}) => {
    const { search, limit = 10, page = 1 } = options;
    const skip = (page - 1) * limit;

    let finalFilter = { ...filter };

    if (search) {
        finalFilter.$or = [
            { title: { $regex: search, $options: 'i' } }
        ];
    }

    const stories = await Story.find(finalFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name email')
        .lean();

    const total = await Story.countDocuments(finalFilter);

    return {
        stories,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get active stories for mobile app
 * @returns {Promise<Array<Story>>}
 */
const getActiveStories = async () => {
    const now = new Date();
    return Story.find({
        isActive: true,
        expireAt: { $gt: now }
    }).sort({ createdAt: -1 });
};

/**
 * Get story by id
 * @param {ObjectId} id
 * @returns {Promise<Story>}
 */
const getStoryById = async (id) => {
    return Story.findById(id);
};

/**
 * Update story by id
 * @param {ObjectId} storyId
 * @param {Object} updateBody
 * @returns {Promise<Story>}
 */
const updateStoryById = async (storyId, updateBody) => {
    const story = await getStoryById(storyId);
    if (!story) {
        throw new ApiError(404, 'Story not found');
    }
    
    Object.assign(story, updateBody);
    await story.save();
    return story;
};

/**
 * Delete story by id
 * @param {ObjectId} storyId
 * @returns {Promise<Story>}
 */
const deleteStoryById = async (storyId) => {
    const story = await getStoryById(storyId);
    if (!story) {
        throw new ApiError(404, 'Story not found');
    }

    await story.deleteOne();
    return story;
};

module.exports = {
    createStory,
    queryStories,
    getActiveStories,
    getStoryById,
    updateStoryById,
    deleteStoryById,
};
