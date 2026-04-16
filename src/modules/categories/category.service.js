const Category = require('./category.model');
const fs = require('fs');
const path = require('path');

exports.createCategory = async (categoryData, file, userId) => {
    const data = { ...categoryData };
    if (file) {
        data.image = file.path;
    }

    if (categoryData['attributeIds[]']) {
        data.attributeIds = Array.isArray(categoryData['attributeIds[]']) ? categoryData['attributeIds[]'] : [categoryData['attributeIds[]']];
    }
    if (categoryData['variantTypeIds[]']) {
        data.variantTypeIds = Array.isArray(categoryData['variantTypeIds[]']) ? categoryData['variantTypeIds[]'] : [categoryData['variantTypeIds[]']];
    }
    if (categoryData['addonIds[]']) {
        data.addonIds = Array.isArray(categoryData['addonIds[]']) ? categoryData['addonIds[]'] : [categoryData['addonIds[]']];
    }

    return await Category.create({
        ...data,
        createdBy: userId
    });
};

exports.getCategories = async () => {
    return await Category.find()
        .populate('attributeIds')
        .populate('variantTypeIds')
        .populate('addonIds')
        .populate('parentId')
        .sort({ createdAt: -1 });
};

exports.getCategoryById = async (id) => {
    const category = await Category.findById(id)
        .populate('attributeIds')
        .populate('variantTypeIds')
        .populate('addonIds')
        .populate('parentId');
    if (!category) throw new Error('Category not found');
    return category;
};

exports.updateCategory = async (id, categoryData, file, userId) => {
    const data = { ...categoryData };
    if (file) {
        data.image = file.path;
    } else if (categoryData.removeImage === 'true') {
        data.image = null;
    }
    delete data.removeImage;

    if (categoryData['attributeIds[]']) {
        data.attributeIds = Array.isArray(categoryData['attributeIds[]']) ? categoryData['attributeIds[]'] : [categoryData['attributeIds[]']];
    }
    if (categoryData['variantTypeIds[]']) {
        data.variantTypeIds = Array.isArray(categoryData['variantTypeIds[]']) ? categoryData['variantTypeIds[]'] : [categoryData['variantTypeIds[]']];
    }
    if (categoryData['addonIds[]']) {
        data.addonIds = Array.isArray(categoryData['addonIds[]']) ? categoryData['addonIds[]'] : [categoryData['addonIds[]']];
    }

    const category = await Category.findByIdAndUpdate(
        id,
        { ...data, updatedBy: userId },
        { new: true }
    );
    if (!category) throw new Error('Category not found');
    return category;
};

exports.deleteCategory = async (id) => {
    const category = await Category.findById(id);
    if (!category) throw new Error('Category not found');

    category.isDeleted = true;
    await category.save();
    return category;
};

exports.updateCategoryStatus = async (id, status, userId) => {
    return await Category.findByIdAndUpdate(
        id,
        { status, updatedBy: userId },
        { new: true }
    );
};

const Subcategory = require('../subcategories/subcategory.model');

exports.getPublicCategoryImage = async (id, res) => {
    const category = await Category.findById(id);
    if (!category || !category.image) {
        throw new Error('Image not found');
    }

    if (category.image.startsWith('http')) {
        return res.redirect(category.image);
    }

    const imagePath = path.join(__dirname, '../../../../', category.image);
    if (fs.existsSync(imagePath)) {
        return res.sendFile(imagePath);
    } else {
        throw new Error('Image file not found');
    }
};

exports.getCategoriesWithSubcategories = async () => {
    const categories = await Category.find({ status: true, isDeleted: false }).sort({ order: 1 });
    const subcategories = await Subcategory.find({ status: true, isDeleted: false }).sort({ order: 1 });

    return categories.map(cat => {
        const catSub = subcategories.filter(sub => sub.categoryId.toString() === cat._id.toString());
        return {
            ...cat.toObject(),
            subcategories: catSub
        };
    });
};
