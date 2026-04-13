const Attribute = require('./attribute.model');

exports.createAttribute = async (attributeData, userId) => {
    return await Attribute.create({ ...attributeData, createdBy: userId });
};

exports.getAttributes = async () => {
    return await Attribute.find();
};

exports.updateAttribute = async (id, attributeData, userId) => {
    return await Attribute.findByIdAndUpdate(
        id,
        { ...attributeData, updatedBy: userId },
        { new: true }
    );
};

exports.deleteAttribute = async (id) => {
    return await Attribute.findByIdAndUpdate(id, { isDeleted: true });
};
