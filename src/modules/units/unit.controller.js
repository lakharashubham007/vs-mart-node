const unitService = require('./unit.service');

exports.createUnit = async (req, res) => {
    try {
        const unit = await unitService.createUnit(req.body, req.user?._id);
        res.status(201).json({ success: true, unit });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getUnits = async (req, res) => {
    try {
        const units = await unitService.getUnits();
        res.json({ success: true, units });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateUnit = async (req, res) => {
    try {
        const unit = await unitService.updateUnit(req.params.id, req.body, req.user?._id);
        res.json({ success: true, unit });
    } catch (error) {
        const status = error.message === 'Unit not found' ? 404 : 400;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.deleteUnit = async (req, res) => {
    try {
        await unitService.deleteUnit(req.params.id);
        res.json({ success: true, message: 'Unit deleted successfully' });
    } catch (error) {
        const status = error.message === 'Unit not found' ? 404 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.updateUnitStatus = async (req, res) => {
    try {
        const unit = await unitService.updateUnitStatus(req.params.id, req.body.status, req.user?._id);
        res.json({ success: true, unit });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
