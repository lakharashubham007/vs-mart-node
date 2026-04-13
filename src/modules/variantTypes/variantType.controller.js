const variantTypeService = require('./variantType.service');

exports.createVariantType = async (req, res) => {
    try {
        const variantType = await variantTypeService.createVariantType(req.body, req.user?._id);
        res.status(201).json({ success: true, variantType });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getVariantTypes = async (req, res) => {
    try {
        const variantTypes = await variantTypeService.getVariantTypes();
        res.json({ success: true, variantTypes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateVariantType = async (req, res) => {
    try {
        const variantType = await variantTypeService.updateVariantType(req.params.id, req.body, req.user?._id);
        res.json({ success: true, variantType });
    } catch (error) {
        const status = error.message === 'Variant Attribute not found' ? 404 : 400;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.deleteVariantType = async (req, res) => {
    try {
        await variantTypeService.deleteVariantType(req.params.id);
        res.json({ success: true, message: 'Variant Attribute deleted successfully' });
    } catch (error) {
        const status = error.message === 'Variant Attribute not found' ? 404 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.updateVariantTypeStatus = async (req, res) => {
    try {
        const variantType = await variantTypeService.updateVariantTypeStatus(req.params.id, req.body.status, req.user?._id);
        res.json({ success: true, variantType });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
