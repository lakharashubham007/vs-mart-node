const Addon = require('./addon.model');

exports.createAddon = async (addonData, userId) => {
    return await Addon.create({ ...addonData, createdBy: userId });
};

exports.getAddons = async () => {
    return await Addon.find();
};

exports.updateAddon = async (id, addonData, userId) => {
    return await Addon.findByIdAndUpdate(
        id,
        { ...addonData, updatedBy: userId },
        { new: true }
    );
};

exports.deleteAddon = async (id) => {
    return await Addon.findByIdAndUpdate(id, { isDeleted: true });
};
