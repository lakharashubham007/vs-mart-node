const stockService = require('./stock.service');

const addStockIn = async (req, res) => {
    try {
        const stock = await stockService.addStockIn(req.body, req.user);
        res.status(201).json({
            message: 'Stock check-in successful',
            data: stock
        });
    } catch (error) {
        res.status(error.status || 400).json({ message: error.message });
    }
};

const getStockHistory = async (req, res) => {
    try {
        const { productId, variantId } = req.query;
        if (!productId) {
            return res.status(400).json({ message: 'Product ID is required for history' });
        }
        const history = await stockService.getStockHistory(productId, variantId);
        res.json(history);
    } catch (error) {
        res.status(error.status || 500).json({ message: error.message });
    }
};

const getAllStockIn = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, productId, variantId, aggregate } = req.query;
        const query = { 
            productId, 
            variantId, 
            aggregate: aggregate === 'true', 
            search 
        };

        const data = await stockService.getAllStockIn(query, page, limit);
        res.json(data);
    } catch (error) {
        res.status(error.status || 500).json({ message: error.message });
    }
};

const updateStockIn = async (req, res) => {
    try {
        const stock = await stockService.updateStockIn(req.params.id, req.body, req.user);
        res.json({
            message: 'Stock update successful',
            data: stock
        });
    } catch (error) {
        res.status(error.status || 400).json({ message: error.message });
    }
};

const getStockInById = async (req, res) => {
    try {
        const stock = await stockService.getStockInById(req.params.id);
        res.json({
            success: true,
            data: stock
        });
    } catch (error) {
        res.status(error.status || 404).json({ message: error.message });
    }
};

const getLastBatch = async (req, res) => {
    try {
        const lastBatch = await stockService.getLastBatchCode();
        res.json({ lastBatch });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createStockLots = async (req, res) => {
    try {
        const results = await stockService.createMultipleStockIn(req.body, req.user);
        res.status(201).json({
            success: true,
            message: 'Stock lots created successfully',
            data: results
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    addStockIn,
    getStockHistory,
    getAllStockIn,
    updateStockIn,
    getStockInById,
    getLastBatch,
    createStockLots
};
