const subcategoryService = require('./subcategory.service');

exports.createSubcategory = async (req, res) => {
    try {
        const subcategory = await subcategoryService.createSubcategory(req.body, req.file, req.user?._id);
        res.status(201).json({ success: true, subcategory });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getSubcategories = async (req, res) => {
    try {
        const { search, categoryId } = req.query;
        const subcategories = await subcategoryService.getSubcategories(search, categoryId);
        res.json({ success: true, subcategories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getSubcategoryById = async (req, res) => {
    try {
        const subcategory = await subcategoryService.getSubcategoryById(req.params.id);
        res.json({ success: true, subcategory });
    } catch (error) {
        const status = error.message === 'Subcategory not found' ? 404 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.updateSubcategory = async (req, res) => {
    try {
        const subcategory = await subcategoryService.updateSubcategory(req.params.id, req.body, req.file, req.user?._id);
        res.json({ success: true, subcategory });
    } catch (error) {
        const status = error.message === 'Subcategory not found' ? 404 : 400;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.updateSubcategoryStatus = async (req, res) => {
    try {
        const subcategory = await subcategoryService.updateSubcategoryStatus(req.params.id, req.body.status, req.user?._id);
        res.json({ success: true, subcategory });
    } catch (error) {
        const status = error.message === 'Subcategory not found' ? 404 : 400;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.deleteSubcategory = async (req, res) => {
    try {
        await subcategoryService.deleteSubcategory(req.params.id, req.user?._id);
        res.json({ success: true, message: 'Subcategory deleted successfully' });
    } catch (error) {
        const status = error.message === 'Subcategory not found' ? 404 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};
