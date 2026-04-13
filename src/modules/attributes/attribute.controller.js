const attributeService = require('./attribute.service');

exports.createAttribute = async (req, res) => {
    try {
        const attribute = await attributeService.createAttribute(req.body, req.user?._id);
        res.status(201).json({ success: true, attribute });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getAttributes = async (req, res) => {
    try {
        const attributes = await attributeService.getAttributes();
        res.json({ success: true, attributes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateAttribute = async (req, res) => {
    try {
        const attribute = await attributeService.updateAttribute(req.params.id, req.body, req.user?._id);
        res.json({ success: true, attribute });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.deleteAttribute = async (req, res) => {
    try {
        await attributeService.deleteAttribute(req.params.id);
        res.json({ success: true, message: 'Attribute deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
