const addonService = require('./addon.service');

exports.createAddon = async (req, res) => {
    try {
        const addon = await addonService.createAddon(req.body, req.user?._id);
        res.status(201).json({ success: true, addon });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getAddons = async (req, res) => {
    try {
        const addons = await addonService.getAddons();
        res.json({ success: true, addons });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateAddon = async (req, res) => {
    try {
        const addon = await addonService.updateAddon(req.params.id, req.body, req.user?._id);
        res.json({ success: true, addon });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.deleteAddon = async (req, res) => {
    try {
        await addonService.deleteAddon(req.params.id);
        res.json({ success: true, message: 'Addon deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
