const express = require('express');
const router = express.Router();
const stockController = require('./stock.controller');
const Authentication = require('../../middlewares/auth.middleware');

router.use(Authentication); // Protect all stock routes

// Static routes FIRST
router.get('/last-batch', stockController.getLastBatch);
router.post('/create-stock', stockController.createStockLots);

// Parameterized routes
router.post('/', stockController.addStockIn);
router.get('/', stockController.getAllStockIn);
router.get('/history', stockController.getStockHistory);
router.get('/:id', stockController.getStockInById);
router.put('/:id', stockController.updateStockIn);

module.exports = router;
