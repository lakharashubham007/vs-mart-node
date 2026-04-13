const categoryService = require('./category.service');

exports.createCategory = async (req, res) => {
    try {
        const category = await categoryService.createCategory(req.body, req.file, req.user?._id);
        res.status(201).json({ success: true, category });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getCategories = async (req, res) => {
    try {
        const categories = await categoryService.getCategories();
        res.json({ success: true, categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getCategoryById = async (req, res) => {
    try {
        const category = await categoryService.getCategoryById(req.params.id);
        res.json({ success: true, category });
    } catch (error) {
        const status = error.message === 'Category not found' ? 404 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const category = await categoryService.updateCategory(req.params.id, req.body, req.file, req.user?._id);
        res.json({ success: true, category });
    } catch (error) {
        const status = error.message === 'Category not found' ? 404 : 400;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        await categoryService.deleteCategory(req.params.id);
        res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        const status = error.message === 'Category not found' ? 404 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.updateCategoryStatus = async (req, res) => {
    try {
        const category = await categoryService.updateCategoryStatus(req.params.id, req.body.status, req.user?._id);
        res.json({ success: true, category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPublicCategoryImage = async (req, res) => {
    try {
        const imagePath = await categoryService.getPublicCategoryImage(req.params.id);
        res.sendFile(imagePath);
    } catch (error) {
        const status = error.message === 'Image not found' || error.message === 'Image file not found' ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
};

exports.getCategoriesWithSubcategories = async (req, res) => {
    try {
        const categories = await categoryService.getCategoriesWithSubcategories();
        res.json({ success: true, categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
