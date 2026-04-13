const variantValueService = require('./variantValue.service');

exports.createVariantValue = async (req, res) => {
    try {
        const { variantValue, variantValues } = await variantValueService.createVariantValue(req.body, req.user?._id);
        res.status(201).json({ success: true, variantValue, variantValues });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getVariantValues = async (req, res) => {
    try {
        const variantValues = await variantValueService.getVariantValues(req.query.variantTypeId);
        res.json({ success: true, variantValues });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateVariantValue = async (req, res) => {
    try {
        const { variantValue, variantValues } = await variantValueService.updateVariantValue(req.params.id, req.body, req.user?._id);
        res.json({ success: true, variantValue, variantValues });
    } catch (error) {
        const status = error.message === 'Variant Value not found' ? 404 : 400;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.updateVariantValueStatus = async (req, res) => {
    try {
        const { variantValue, variantValues } = await variantValueService.updateVariantValueStatus(req.params.id, req.body.status, req.user?._id);
        res.json({ success: true, variantValue, variantValues });
    } catch (error) {
        const status = error.message === 'Variant Value not found' ? 404 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.deleteVariantValue = async (req, res) => {
    try {
        const { variantValue, variantValues } = await variantValueService.deleteVariantValue(req.params.id);
        res.json({ success: true, message: 'Variant Value deleted successfully', variantValue, variantValues });
    } catch (error) {
        const status = error.message === 'Variant Value not found' ? 404 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};
