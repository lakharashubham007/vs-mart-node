const Brand = require('./brand.model');
const fs = require('fs');
const path = require('path');

exports.createBrand = async (brandData, file, userId) => {
    const data = { ...brandData };
    if (file) {
        data.logo = file.path;
    }

    return await Brand.create({
        ...data,
        createdBy: userId
    });
};

exports.getBrands = async () => {
    return await Brand.find().sort({ createdAt: -1 });
};

exports.getBrandById = async (id) => {
    const brand = await Brand.findById(id);
    if (!brand) throw new Error('Brand not found');
    return brand;
};

exports.updateBrand = async (id, brandData, file, userId) => {
    const data = { ...brandData };
    if (file) {
        data.logo = file.path;
    } else if (brandData.removeImage === 'true') {
        data.logo = null;
    }
    delete data.removeImage;

    const brand = await Brand.findByIdAndUpdate(
        id,
        { ...data, updatedBy: userId },
        { new: true }
    );
    if (!brand) throw new Error('Brand not found');
    return brand;
};

exports.deleteBrand = async (id) => {
    const brand = await Brand.findById(id);
    if (!brand) throw new Error('Brand not found');

    brand.isDeleted = true;
    await brand.save();
    return brand;
};

exports.updateBrandStatus = async (id, status, userId) => {
    return await Brand.findByIdAndUpdate(
        id,
        { status, updatedBy: userId },
        { new: true }
    );
};

exports.getPublicBrandLogo = async (id, res) => {
    const brand = await Brand.findById(id);
    if (!brand || !brand.logo) {
        throw new Error('Logo not found');
    }

    if (brand.logo.startsWith('http')) {
        return res.redirect(brand.logo);
    }

    const imagePath = path.join(__dirname, '../../../../', brand.logo);
    if (fs.existsSync(imagePath)) {
        return res.sendFile(imagePath);
    } else {
        throw new Error('Logo file not found');
    }
};
