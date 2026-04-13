const supportService = require('./support.service');

const createSupport = async (req, res) => {
    try {
        const support = await supportService.createSupport(req.body);
        res.status(201).json(support);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getAllSupport = async (req, res) => {
    try {
        const support = await supportService.getAllSupport();
        res.json(support);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getActiveSupport = async (req, res) => {
    try {
        const support = await supportService.getActiveSupport();
        res.json(support);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSupportById = async (req, res) => {
    try {
        const support = await supportService.getSupportById(req.params.id);
        if (!support) return res.status(404).json({ message: 'Support option not found' });
        res.json(support);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateSupport = async (req, res) => {
    try {
        const support = await supportService.updateSupport(req.params.id, req.body);
        if (!support) return res.status(404).json({ message: 'Support option not found' });
        res.json(support);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteSupport = async (req, res) => {
    try {
        const support = await supportService.deleteSupport(req.params.id);
        if (!support) return res.status(404).json({ message: 'Support option not found' });
        res.json({ message: 'Support option deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const changeSupportStatus = async (req, res) => {
    try {
        const support = await supportService.changeSupportStatus(req.params.id, req.body.isActive);
        if (!support) return res.status(404).json({ message: 'Support option not found' });
        res.json({ message: 'Support status updated successfully', data: support });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createSupport,
    getAllSupport,
    getActiveSupport,
    getSupportById,
    updateSupport,
    deleteSupport,
    changeSupportStatus
};
