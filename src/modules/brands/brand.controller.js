const brandService = require('./brand.service');
const { getFullImageUrl } = require('../../utils/image.util');

exports.createBrand = async (req, res) => {
    try {
        const brand = await brandService.createBrand(req.body, req.file, req.user?._id);
        res.status(201).json({ success: true, brand });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getBrands = async (req, res) => {
    try {
        const brands = await brandService.getBrands();
        res.json({ success: true, brands });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getBrandById = async (req, res) => {
    try {
        const brand = await brandService.getBrandById(req.params.id);
        res.json({ success: true, brand });
    } catch (error) {
        const status = error.message === 'Brand not found' ? 404 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.updateBrand = async (req, res) => {
    try {
        const brand = await brandService.updateBrand(req.params.id, req.body, req.file, req.user?._id);
        res.json({ success: true, brand });
    } catch (error) {
        const status = error.message === 'Brand not found' ? 404 : 400;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.deleteBrand = async (req, res) => {
    try {
        await brandService.deleteBrand(req.params.id);
        res.json({ success: true, message: 'Brand deleted successfully' });
    } catch (error) {
        const status = error.message === 'Brand not found' ? 404 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.updateBrandStatus = async (req, res) => {
    try {
        const brand = await brandService.updateBrandStatus(req.params.id, req.body.status, req.user?._id);
        res.json({ success: true, brand });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPublicBrandLogo = async (req, res) => {
    try {
        await brandService.getPublicBrandLogo(req.params.id, res);
    } catch (error) {
        const status = error.message === 'Logo not found' || error.message === 'Logo file not found' ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
};
