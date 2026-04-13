const taxService = require('./tax.service');

exports.createTax = async (req, res) => {
    try {
        const tax = await taxService.createTax(req.body, req.user?._id);
        res.status(201).json({ success: true, tax });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getTaxes = async (req, res) => {
    try {
        const taxes = await taxService.getTaxes();
        res.json({ success: true, taxes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateTax = async (req, res) => {
    try {
        const tax = await taxService.updateTax(req.params.id, req.body, req.user?._id);
        res.json({ success: true, tax });
    } catch (error) {
        const status = error.message === 'Tax not found' ? 404 : 400;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.updateTaxStatus = async (req, res) => {
    try {
        const tax = await taxService.updateTaxStatus(req.params.id, req.body.status, req.user?._id);
        res.json({ success: true, tax });
    } catch (error) {
        const status = error.message === 'Tax not found' ? 404 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.deleteTax = async (req, res) => {
    try {
        await taxService.deleteTax(req.params.id);
        res.json({ success: true, message: 'Tax deleted successfully' });
    } catch (error) {
        const status = error.message === 'Tax not found' ? 404 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};
