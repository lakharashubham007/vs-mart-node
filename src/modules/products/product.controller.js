const productService = require('./product.service');
const config = require('../../config/config');

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
        const { categoryId, subCategoryId, brandId, productType, status, search, page = 1, limit = 10 } = req.query;
        const query = { isDeleted: false };

        if (categoryId) query.categoryId = categoryId;
        if (subCategoryId) query.subCategoryId = subCategoryId;
        if (brandId) query.brandName = brandId;
        if (productType) query.productType = productType;
        if (status !== undefined && status !== '') query.status = status === 'true';
        if (search) {
            query.$or = [
                { name: new RegExp(search, 'i') },
                { slug: new RegExp(search, 'i') },
                { 'pricing.sku': new RegExp(search, 'i') }
            ];
        }

        const result = await productService.getProducts(query, page, limit);

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
        console.log(`📈 [Backend Discovery] Total products in DB: ${products.length}`);
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

        const product = await productService.getProductBySlug(slug);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Base display data
        let displayData = {
            id: product._id,
            name: product.name,
            description: product.description || '',
            slug: product.slug,
            image: product.images?.thumbnail ? `${config.backendUrl}/${product.images.thumbnail}` : '',
            gallery: product.images?.gallery?.map(img => `${config.backendUrl}/${img}`) || [],
            mrp: product.pricing?.mrp || 0,
            price: product.pricing?.finalSellingPrice || product.pricing?.sellingPrice || 0,
            discountPercentage: 0,
            variantText: '',
            variants: [],
            isSingle: product.productType === 'Single'
        };

        // Calculate discount for single
        if (displayData.mrp > displayData.price) {
            displayData.discountPercentage = Math.round(((displayData.mrp - displayData.price) / displayData.mrp) * 100);
        }

        if (variantId) {
            const variant = await productService.getVariantById(variantId);
            if (variant) {
                displayData.variantId = variant._id;
                displayData.mrp = variant.pricing?.mrp || displayData.mrp;
                displayData.price = variant.pricing?.finalSellingPrice || variant.pricing?.sellingPrice || displayData.price;
                displayData.variantText = variant.attributes?.map(a => a.valueId?.name).filter(Boolean).join(' / ') || '';
                displayData.sku = variant.sku;

                // Recalculate discount for variant
                if (displayData.mrp > displayData.price) {
                    displayData.discountPercentage = Math.round(((displayData.mrp - displayData.price) / displayData.mrp) * 100);
                }
            }
        }

        res.json({
            success: true,
            data: displayData,
            deepLink: variantId
                ? `vsmart://product/${slug}?variantId=${variantId}`
                : `vsmart://product/${slug}`
        });

    } catch (error) {
        console.error('Public product details error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
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

exports.getProductDetailsForPublic = async (req, res) => {
    try {
        const product = await productService.getProductDetailsForPublic(req.params.slug);
        res.json({ success: true, product });
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

