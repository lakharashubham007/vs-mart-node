const Subcategory = require('./subcategory.model');
const { deleteFromCloudinary } = require('../../utils/image.util');
const fs = require('fs');

exports.createSubcategory = async (subcategoryData, file, userId) => {
    const data = { ...subcategoryData };
    if (file) {
        data.image = file.path;
    }

    try {
        const subcategory = new Subcategory({
            ...data,
            createdBy: userId
        });

        await subcategory.save();
        return subcategory;
    } catch (error) {
        if (data.image) {
            await deleteFromCloudinary(data.image);
        }
        throw error;
    }
};

exports.getSubcategories = async (search, categoryId) => {
    const query = { isDeleted: false };
    if (search) {
        query.name = { $regex: search, $options: 'i' };
    }
    if (categoryId) {
        query.categoryId = categoryId;
    }

    return await Subcategory.find(query)
        .sort({ order: 1, createdAt: -1 })
        .populate('categoryId', 'name image');
};

exports.getSubcategoryById = async (id) => {
    const subcategory = await Subcategory.findById(id)
        .populate('categoryId', 'name');
    if (!subcategory || subcategory.isDeleted) throw new Error('Subcategory not found');
    return subcategory;
};

exports.updateSubcategory = async (id, subcategoryData, file, userId) => {
    const data = { ...subcategoryData };

    try {
        const existingSubcategory = await Subcategory.findById(id);
        if (!existingSubcategory) throw new Error('Subcategory not found');

        if (file) {
            data.image = file.path;
            if (existingSubcategory.image) await deleteFromCloudinary(existingSubcategory.image);
        } else if (subcategoryData.removeImage === 'true') {
            data.image = null;
            if (existingSubcategory.image) await deleteFromCloudinary(existingSubcategory.image);
        }
        delete data.removeImage;

        const subcategory = await Subcategory.findByIdAndUpdate(
            id,
            { ...data, updatedBy: userId },
            { new: true }
        ).populate('categoryId', 'name image');

        if (!subcategory) throw new Error('Subcategory not found');
        return subcategory;
    } catch (error) {
        if (data.image && file) {
            await deleteFromCloudinary(data.image);
        }
        throw error;
    }
};

exports.updateSubcategoryStatus = async (id, status, userId) => {
    const subcategory = await Subcategory.findByIdAndUpdate(
        id,
        { status, updatedBy: userId },
        { new: true }
    );
    if (!subcategory) throw new Error('Subcategory not found');
    return subcategory;
};

exports.deleteSubcategory = async (id, userId) => {
    const subcategory = await Subcategory.findById(id);
    if (!subcategory) throw new Error('Subcategory not found');

    if (subcategory.image) {
        await deleteFromCloudinary(subcategory.image);
    }

    const deletedSubcategory = await Subcategory.findByIdAndUpdate(
        id,
        { isDeleted: true, updatedBy: userId },
        { new: true }
    );
    return deletedSubcategory;
};
