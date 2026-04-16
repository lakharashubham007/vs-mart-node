const productService = require('./product.service');
const config = require('../../config/config');
const { getFullImageUrl, getFullImageUrls } = require('../../utils/image.util');

exports.createProduct = async (req, res) => {
    try {
        const { product, variantsCreated } = await productService.createProduct(req.body, req.files, req.user);
        res.status(201).json({
            success: true,
            message: 'Product & Variants created efficiently',
            product,
            variantsCreated
        });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

exports.getProducts = async (req, res) => {
    try {
        const { 
            categoryId, subCategoryId, brandId, productType, status, 
            search, minPrice, maxPrice, onlyInStock, discountOnly, 
            sort, page = 1, limit = 10 
        } = req.query;
        
        const query = { isDeleted: false };
        const filterOptions = {
            minPrice: parseFloat(minPrice),
            maxPrice: parseFloat(maxPrice),
            onlyInStock: onlyInStock === 'true',
            discountOnly: discountOnly === 'true',
            sort
        };

        if (categoryId) query.categoryId = categoryId;
        if (subCategoryId) query.subCategoryId = subCategoryId;
        if (brandId) query.brandName = brandId;
        if (productType) query.productType = productType;
        if (status !== undefined && status !== '') query.status = status === 'true';
        if (search) {
            query.$or = [
                { name: new RegExp(search, 'i') },
                { slug: new RegExp(search, 'i') },
                { sku: new RegExp(search, 'i') }
            ];
        }

        const result = await productService.getProducts(query, page, limit, filterOptions);

        console.log(`📦 [Backend Discovery] Query: ${JSON.stringify(query)}, Found: ${result.pagination.total} records`);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getProductById = async (req, res) => {
    try {
        const product = await productService.getProductById(req.params.id, true);
        res.json({ success: true, product });
    } catch (error) {
        const status = error.message === 'Product not found' ? 404 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const product = await productService.updateProduct(req.params.id, req.body, req.files, req.user);
        res.json({ success: true, message: 'Product & Variants updated successfully', product });
    } catch (error) {
        const status = error.message === 'Product not found' ? 404 : 400;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        await productService.deleteProduct(req.params.id);
        res.json({ success: true, message: 'Product and associated variants deleted successfully' });
    } catch (error) {
        const status = error.message === 'Product not found' ? 404 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.updateProductStatus = async (req, res) => {
    try {
        const product = await productService.updateProductStatus(req.params.id, req.body.status);
        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllProducts = async (req, res) => {
    try {
        const products = await productService.getAllProducts();
        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getProductByQrScannerCode = async (req, res) => {
    try { res.json({ success: true, message: 'QR scan successful' }); } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getProductDetailsForPublic = async (req, res) => {
    try {
        const { slug } = req.params;
        const { v: variantId } = req.query;

        const productData = await productService.getProductDetailsForPublic(slug);
        if (!productData) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Handle specific variant display if provided
        if (variantId) {
            const variant = await productService.getVariantById(variantId);
            if (variant) {
                productData.variantId = variant._id;
                productData.mrp = variant.pricing?.mrp || productData.mrp;
                productData.price = variant.pricing?.finalSellingPrice || variant.pricing?.sellingPrice || productData.price;
                productData.variantText = variant.attributes?.map(a => a.valueId?.name).filter(Boolean).join(' / ') || '';
                productData.sku = variant.sku;

                if (productData.mrp > productData.price) {
                    productData.discountPercentage = Math.round(((productData.mrp - productData.price) / productData.mrp) * 100);
                }
            }
        }

        res.json({
            success: true,
            data: productData,
            deepLink: variantId
                ? `vsmart://product/${slug}?variantId=${variantId}`
                : `vsmart://product/${slug}`
        });
    } catch (error) {
        console.error('Public product details error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.generateQrForProduct = async (req, res) => {
    try { res.json({ success: true, message: 'QR generated' }); } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.searchProducts = async (req, res) => {
    try {
        const products = await productService.searchProducts(req.query.q);
        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getSimilarProducts = async (req, res) => {
    try { res.json({ success: true, products: [] }); } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getProductByEan = async (req, res) => {
    try {
        const result = await productService.getProductByEan(req.params.ean);
        res.json({ success: true, ...result });
    } catch (error) {
        const status = error.message === 'Product not found' ? 404 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};


exports.getSimilarHoseAssemblyItem = async (req, res) => {
    try { res.json({ success: true, items: [] }); } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getAdminProducts = async (req, res) => {
    try {
        const { search, sort, page = 1, limit = 10 } = req.query;
        
        const result = await productService.getAdminProducts({ search, sort, page, limit });
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Get admin products error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

