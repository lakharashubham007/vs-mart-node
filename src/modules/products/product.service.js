const mongoose = require('mongoose');
const Product = require('./product.model');
const ProductVariant = require('./productVariant.model');
const Category = require('../categories/category.model');
const Subcategory = require('../subcategories/subcategory.model');
const Brand = require('../brands/brand.model');
const { sortByUnitValue } = require('../../utils/sorting.util');
const { generateProductQRCode } = require('../../utils/qr.util');
const { generateRandomEan, generateEanBarcode } = require('../../utils/barcode.util');
const stockService = require('../stock/stock.service');
const StockIn = require('../stock/stockIn.model');

// Helper to generate SKU if not provided
const generateSKU = () => {
    const random = Math.floor(100000 + Math.random() * 900000);
    return `PROD-${random}`;
};

// Helper to sort variants by attribute name (Logic moved to sorting.util.js)
const sortVariantsByValue = (variants) => {
    return sortByUnitValue(variants, (v) =>
        v.variantValues?.[0]?.valueName || v.attributes?.[0]?.valueId?.name || ''
    );
};

/**
 * Injects aggregated stock data into product objects (lean docs).
 * Handles both single product and array of products.
 */
const injectStockData = async (products) => {
    if (!products) return products;
    const isArray = Array.isArray(products);
    const productList = isArray ? products : [products];
    if (productList.length === 0) return products;

    const productIds = productList.map(p => p._id);
    const stockMap = await stockService.getAggregatedStockForProducts(productIds);

    productList.forEach(product => {
        const pId = product._id.toString();
        const pStock = stockMap[pId] || {};
        
        let grandTotal = 0;

        if (product.productType === 'Single') {
            const baseStock = pStock['base'] || { quantity: 0, batches: [] };
            grandTotal = baseStock.quantity || 0;
            
            // [FIFO] Identify lead pricing from the oldest active batch
            const oldestBatch = baseStock.batches?.find(b => b.quantity > 0) || baseStock.batches?.[0];
            const leadPricing = oldestBatch ? oldestBatch.pricing : (product.pricing || {});

            product.pricing = {
                ...leadPricing,
                quantity: grandTotal,
                batches: baseStock.batches || []
            };
        } else if (product.variants) {
            product.variants.forEach(variant => {
                const vId = variant._id.toString();
                const vStock = pStock[vId] || { quantity: 0, pricing: {}, batches: [] };
                
                const variantQty = vStock.quantity || 0;
                grandTotal += variantQty;

                // [FIFO] Identify lead pricing from the oldest active batch for this variant
                const oldestBatch = vStock.batches?.find(b => b.quantity > 0) || vStock.batches?.[0];
                const leadPricing = oldestBatch ? oldestBatch.pricing : (variant.pricing || {});

                variant.pricing = {
                    ...leadPricing,
                    quantity: variantQty,
                    batches: vStock.batches
                };
                variant.inventory = { quantity: variantQty, minStock: variant.minStock };
            });
            
            // Also check for any 'base' stock that might exist on a variant product
            if (pStock['base']) {
                grandTotal += (pStock['base'].quantity || 0);
            }
        }

        // Standardized Total Stock (used for sorting and top-level display)
        product.totalStock = grandTotal;

        // Comprehensive Stock Array for Frontend (Legacy support)
        product.stock = Object.keys(pStock).map(key => {
            const variantStock = pStock[key];
            return {
                variantId: key === 'base' ? null : key,
                totalQuantity: variantStock.quantity,
                batches: variantStock.batches
            };
        });
    });

    return isArray ? productList : productList[0];
};

exports.createProduct = async (productData, files, user) => {
    const data = { ...productData };

    // Map legacy frontend field names to new model names
    if (data.categoryId) data.category = data.categoryId;
    if (data.subCategoryId) data.subcategory = data.subCategoryId;
    if (data.brandId) data.brandName = data.brandId;

    // Handle images
    data.images = { thumbnail: '', gallery: [] };
    if (files) {
        if (files.image) {
            data.images.thumbnail = files.image[0].path;
        }
        if (files.images) {
            data.images.gallery = files.images.map(file => file.path);
        }
    }

    // Parse JSON fields
    ['pricing', 'variants'].forEach(field => {
        if (typeof data[field] === 'string') {
            try {
                data[field] = JSON.parse(data[field]);
            } catch (e) {
                console.error(`Error parsing ${field}:`, e);
            }
        }
    });

    // Ensure SKU for Single product if missing
    if (data.productType === 'Single' && data.pricing && !data.pricing.sku) {
        data.pricing.sku = generateSKU();
    }

    // Resolve Names from IDs
    const categoryId = data.category || data.categoryId;
    const subcategoryId = data.subcategory || data.subCategoryId;
    const brandId = data.brandName || data.brandId;

    let categoryName = '';
    let subCategoryName = '';
    let brandName = '';

    if (categoryId) {
        const cat = await Category.findById(categoryId).select('name');
        if (cat) categoryName = cat.name;
    }
    if (subcategoryId) {
        const subcat = await Subcategory.findById(subcategoryId).select('name');
        if (subcat) subCategoryName = subcat.name;
    }
    if (brandId) {
        const brand = await Brand.findById(brandId).select('name');
        if (brand) brandName = brand.name;
    }

    const unitId = data.unitId;
    let unitName = '';
    if (unitId) {
        const Unit = require('../units/unit.model');
        const unit = await Unit.findById(unitId).select('name');
        if (unit) unitName = unit.name;
    }

    // 1. Create Parent Product (Base Common Info)
    const product = await Product.create({
        ...data,
        categoryId: categoryId,
        categoryName: categoryName,
        subCategoryId: subcategoryId,
        subCategoryName: subCategoryName,
        brandId: brandId,
        brandName: brandName,
        unitId: unitId,
        unitName: unitName,
        sku: data.productType === 'Single' ? (data.pricing?.sku || generateSKU()) : undefined,
        minStock: data.productType === 'Single' ? (Number(data.pricing?.minStock) || 0) : 0,
        createdBy: user?._id,
        tenantId: user?.tenantId
    });

    // If single product and has stock, initialize Batch 1
    if (data.productType === 'Single' && data.pricing && Number(data.pricing.quantity) > 0) {
        await stockService.addStockIn({
            productId: product._id,
            quantity: Number(data.pricing.quantity),
            pricing: {
                mrp: Number(data.pricing.mrp) || 0,
                sellingPrice: Number(data.pricing.sellingPrice) || 0,
                finalSellingPrice: Number(data.pricing.finalSellingPrice) || Number(data.pricing.sellingPrice) || 0,
                costPrice: Number(data.pricing.costPrice) || 0,
                taxId: data.pricing.taxId || null,
                discountType: data.pricing.discountType || 'Fixed',
                discountValue: Number(data.pricing.discountValue) || 0
            }
        }, user);
    }

    // Generate QR code for the new product
    try {
        const qrPath = await generateProductQRCode(product.slug);
        if (qrPath) {
            product.qrCode = qrPath;
            await product.save();
        }
    } catch (qrErr) {
        console.error('Failed to generate QR code for product:', product._id, qrErr);
    }

    // Generate EAN and Barcode for the new product
    try {
        if (!product.ean) {
            product.ean = generateRandomEan();
        }
        const barcodePath = await generateEanBarcode(product.ean, product.slug);
        if (barcodePath) {
            product.barcode = barcodePath;
            await product.save();
        }
    } catch (bcErr) {
        console.error('Failed to generate barcode for product:', product._id, bcErr);
    }

    const createdVariants = [];

    // 2. Process and Insert Decoupled Variants
    if (data.productType === 'Variant' && Array.isArray(data.variants) && data.variants.length > 0) {
        // Sort variants before processing
        const sortedVariants = sortVariantsByValue(data.variants);

        const variantDocs = sortedVariants.map(v => ({
            productId: product._id,
            sku: v.sku || generateSKU(),
            attributes: (v.variantValues || []).map(attr => ({
                variantTypeId: attr.variantTypeId,
                valueId: attr.valueId
            })),
            qrCode: '', // Placeholder
            minStock: Number(v.minStock) || 0,
            createdBy: user?._id
        }));

        // Bulk insert all child variants natively
        const inserted = await ProductVariant.insertMany(variantDocs);

        // Initialize batches for variants with stock
        for (let i = 0; i < inserted.length; i++) {
            const vData = sortedVariants[i];
            const vDoc = inserted[i];

            if (Number(vData.quantity) > 0) {
                await stockService.addStockIn({
                    productId: product._id,
                    variantId: vDoc._id,
                    quantity: Number(vData.quantity),
                    pricing: {
                        mrp: Number(vData.mrp) || 0,
                        sellingPrice: Number(vData.price) || 0,
                        finalSellingPrice: Number(vData.finalSellingPrice) || Number(vData.price) || 0,
                        costPrice: Number(vData.costPrice) || 0,
                        taxId: vData.taxId || null,
                        discountType: vData.discountType || 'Fixed',
                        discountValue: Number(vData.discountValue) || 0
                    }
                }, user);
            }
        }

        // Generate QR codes for each variant
        for (const variant of inserted) {
            try {
                const qrPath = await generateProductQRCode(product.slug, variant._id);
                if (qrPath) {
                    variant.qrCode = qrPath;
                    await variant.save();
                }
            } catch (qrErr) {
                console.error('Failed to generate QR code for variant:', variant._id, qrErr);
            }

            // Generate EAN and Barcode for the variant
            try {
                if (!variant.ean) {
                    variant.ean = generateRandomEan();
                }
                const barcodePath = await generateEanBarcode(variant.ean, `${product.slug}-${variant._id}`);
                if (barcodePath) {
                    variant.barcode = barcodePath;
                    await variant.save();
                }
            } catch (bcErr) {
                console.error('Failed to generate barcode for variant:', variant._id, bcErr);
            }
        }

        createdVariants.push(...inserted);
    }

    return { product, variantsCreated: createdVariants.length };
};

exports.getProducts = async (query, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    const products = await Product.find(query)
        .populate('unitId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    // Fetch and attach variants for products that have them
    const variantProducts = products.filter(p => p.productType === 'Variant');
    if (variantProducts.length > 0) {
        const productIds = variantProducts.map(p => p._id);
        const allVariants = await ProductVariant.find({ productId: { $in: productIds }, isDeleted: false })
            .populate('attributes.variantTypeId', 'name type')
            .populate('attributes.valueId', 'name')
            .lean();

        // Intersect them back and sort
        products.forEach(product => {
            if (product.productType === 'Variant') {
                const variants = allVariants.filter(v => v.productId.toString() === product._id.toString());
                product.variants = sortVariantsByValue(variants);
            }
        });
    }

    // 4. Inject Aggregated Stock Data (Dynamic Merging)
    await injectStockData(products);

    const total = await Product.countDocuments(query);

    return {
        products,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit)
        }
    };
};

exports.getAdminProducts = async ({ search, sort, page = 1, limit = 10 }) => {
    const query = { isDeleted: false };

    if (search) {
        query.$or = [
            { name: new RegExp(search, 'i') },
            { slug: new RegExp(search, 'i') },
            { sku: new RegExp(search, 'i') }
        ];
    }

    // Step 1: Fetch matching products
    let products = await Product.find(query)
        .populate('unitId', 'name')
        .lean();

    // Step 2: Fetch and attach variants
    const productIds = products.map(p => p._id);
    const allVariants = await ProductVariant.find({ productId: { $in: productIds }, isDeleted: false })
        .populate('attributes.variantTypeId', 'name type')
        .populate('attributes.valueId', 'name')
        .lean();

    products.forEach(product => {
        if (product.productType === 'Variant') {
            const variants = allVariants.filter(v => v.productId.toString() === product._id.toString());
            product.variants = sortVariantsByValue(variants);
        }
    });

    // Step 3: Inject dynamic stock data
    await injectStockData(products);

    // Step 4: Calculate aggregate fields for sorting
    products.forEach(p => {
        if (p.productType === 'Single') {
            p.totalStock = p.pricing?.quantity || 0;
            p.displayPrice = p.pricing?.finalSellingPrice || p.pricing?.sellingPrice || 0;
        } else {
            p.totalStock = (p.variants || []).reduce((sum, v) => sum + (v.pricing?.quantity || 0), 0);
            p.displayPrice = (p.variants || [])[0]?.pricing?.finalSellingPrice || (p.variants || [])[0]?.pricing?.sellingPrice || 0;
        }

        // Determine Status based on total stock
        if (p.totalStock <= 0) p.adminStatus = 'Out of Stock';
        else if (p.totalStock <= (p.minStock || 20)) p.adminStatus = 'Low Stock';
        else p.adminStatus = 'In Stock';
    });

    // Step 5: Sort in-memory
    const sortOption = sort || 'newest';
    products.sort((a, b) => {
        switch (sortOption) {
            case 'name_asc': return a.name.localeCompare(b.name);
            case 'name_desc': return b.name.localeCompare(a.name);
            case 'stock_low': return a.totalStock - b.totalStock;
            case 'stock_high': return b.totalStock - a.totalStock;
            case 'newest': return new Date(b.createdAt) - new Date(a.createdAt);
            default: return new Date(b.createdAt) - new Date(a.createdAt);
        }
    });

    // Step 6: Paginate results
    const total = products.length;
    const startIndex = (page - 1) * limit;
    const paginatedProducts = products.slice(startIndex, startIndex + parseInt(limit));

    return {
        products: paginatedProducts,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit)
        }
    };
};

exports.getProductById = async (id, includeDeleted = false) => {
    const product = await Product.findById(id)
        .populate('unitId')
        .lean();

    if (!product) throw new Error('Product not found');

    // Fetch and attach variants if product type is Variant
    if (product.productType === 'Variant') {
        const variantQuery = { productId: product._id };
        if (!includeDeleted) {
            variantQuery.isDeleted = false;
        }

        const variants = await ProductVariant.find(variantQuery)
            .populate('attributes.variantTypeId')
            .populate('attributes.valueId', 'name')
            .lean();

        product.variants = sortVariantsByValue(variants);
    }

    // Fetch dynamic stock data
    return await injectStockData(product);
};

exports.updateProduct = async (id, productData, files, user) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const data = { ...productData };

        const existingProduct = await Product.findById(id).session(session);
        if (!existingProduct) throw new Error('Product not found');

        // Handle images
        if (files) {
            const newImages = { ...existingProduct.images };
            if (files.image) {
                newImages.thumbnail = files.image[0].path;
            }
            if (files.images) {
                const gallery = files.images.map(file => file.path);
                newImages.gallery = [...(newImages.gallery || []), ...gallery];
            }
            data.images = newImages;
        }

        // Handle image removal if requested
        if (productData.removeGalleryImage) {
            const currentImages = data.images || existingProduct.images;
            currentImages.gallery = currentImages.gallery.filter(img => img !== productData.removeGalleryImage);
            data.images = currentImages;
        }

        // Parse JSON fields
        ['pricing', 'variants'].forEach(field => {
            if (typeof data[field] === 'string') {
                try {
                    data[field] = JSON.parse(data[field]);
                } catch (e) {
                    console.error(`Error parsing ${field}:`, e);
                }
            }
        });

        // Resolve Names from IDs...
        const categoryId = data.category || data.categoryId || existingProduct.categoryId;
        const subcategoryId = data.subcategory || data.subCategoryId || existingProduct.subCategoryId;
        const brandId = data.brandName || data.brandId || existingProduct.brandId;

        let categoryName = existingProduct.categoryName || '';
        let subCategoryName = existingProduct.subCategoryName || '';
        let brandName = existingProduct.brandName || '';

        if (categoryId && (!categoryName || categoryId.toString() !== existingProduct.categoryId?.toString())) {
            const cat = await Category.findById(categoryId).select('name');
            if (cat) categoryName = cat.name;
        }
        if (subcategoryId && (!subCategoryName || subcategoryId.toString() !== existingProduct.subCategoryId?.toString())) {
            const subcat = await Subcategory.findById(subcategoryId).select('name');
            if (subcat) subCategoryName = subcat.name;
        }
        if (brandId && (!brandName || brandId.toString() !== existingProduct.brandId?.toString())) {
            const brand = await Brand.findById(brandId).select('name');
            if (brand) brandName = brand.name;
        }

        const unitId = data.unitId || existingProduct.unitId;
        let unitName = existingProduct.unitName || '';
        if (unitId && (!unitName || unitId.toString() !== existingProduct.unitId?.toString())) {
            const Unit = require('../units/unit.model');
            const unit = await Unit.findById(unitId).select('name');
            if (unit) unitName = unit.name;
        }

        const product = await Product.findByIdAndUpdate(id,
            {
                ...data,
                categoryId: categoryId,
                categoryName: categoryName,
                subCategoryId: subcategoryId,
                subCategoryName: subCategoryName,
                brandId: brandId,
                brandName: brandName,
                unitId: unitId,
                unitName: unitName,
                sku: data.productType === 'Single' ? (data.pricing?.sku || existingProduct.sku || generateSKU()) : undefined,
                updatedBy: user?._id
            },
            { new: true, session }
        );

        // QR/Barcode updates...
        if (product && (!product.qrCode || product.slug !== existingProduct.slug)) {
            try {
                const qrPath = await generateProductQRCode(product.slug);
                if (qrPath) {
                    product.qrCode = qrPath;
                    await product.save({ session });
                }
            } catch (qrErr) {
                console.error('Failed to generate/update main QR code:', qrErr);
            }
        }

        if (product && (!product.barcode || product.slug !== existingProduct.slug)) {
            try {
                if (!product.ean) product.ean = generateRandomEan();
                const barcodePath = await generateEanBarcode(product.ean, product.slug);
                if (barcodePath) {
                    product.barcode = barcodePath;
                    await product.save({ session });
                }
            } catch (bcErr) {
                console.error('Failed to generate/update main Barcode:', bcErr);
            }
        }
    
        // Update Single Product pricing in StockIn
        if (data.productType === 'Single' && data.pricing) {
            const firstBatch = await StockIn.findOne({ productId: product._id, variantId: null, isDeleted: false }).sort({ createdAt: 1 }).session(session);
            if (firstBatch) {
                await stockService.updateStockIn(firstBatch._id, {
                    pricing: {
                        mrp: Number(data.pricing.mrp) || firstBatch.pricing.mrp,
                        sellingPrice: Number(data.pricing.sellingPrice) || firstBatch.pricing.sellingPrice,
                        finalSellingPrice: Number(data.pricing.finalSellingPrice) || Number(data.pricing.sellingPrice) || firstBatch.pricing.finalSellingPrice,
                        costPrice: Number(data.pricing.costPrice) || firstBatch.pricing.costPrice,
                        discountType: data.pricing.discountType || firstBatch.pricing.discountType,
                        discountValue: Number(data.pricing.discountValue) ?? firstBatch.pricing.discountValue,
                        taxId: data.pricing.taxId || firstBatch.pricing.taxId
                    }
                }, user, session);
            }
        }

        // Advanced Variant Sync Logic
        if (data.productType === 'Variant' && Array.isArray(data.variants)) {
            const incomingVariants = data.variants;
            const processedIds = [];

            for (const v of incomingVariants) {
                const variantData = {
                    productId: product._id,
                    sku: v.sku || generateSKU(),
                    attributes: v.variantValues.map(attr => ({
                        variantTypeId: attr.variantTypeId,
                        valueId: attr.valueId
                    })),
                    minStock: Number(v.minStock) || 0,
                    isDeleted: false,
                    updatedBy: user?._id
                };

                let updatedVariant;
                if (v._id) {
                    updatedVariant = await ProductVariant.findByIdAndUpdate(v._id, variantData, { new: true, session });
                    
                    // Update existing variant pricing in its first batch
                    const firstBatch = await StockIn.findOne({ productId: product._id, variantId: v._id, isDeleted: false }).sort({ createdAt: 1 }).session(session);
                    if (firstBatch) {
                        await stockService.updateStockIn(firstBatch._id, {
                            pricing: {
                                mrp: Number(v.mrp) || firstBatch.pricing.mrp,
                                sellingPrice: Number(v.price) || firstBatch.pricing.sellingPrice,
                                finalSellingPrice: Number(v.finalSellingPrice) || Number(v.price) || firstBatch.pricing.finalSellingPrice,
                                costPrice: Number(v.costPrice) || firstBatch.pricing.costPrice,
                                discountType: v.discountType || firstBatch.pricing.discountType,
                                discountValue: Number(v.discountValue) ?? firstBatch.pricing.discountValue,
                                taxId: v.taxId || firstBatch.pricing.taxId
                            }
                        }, user, session);
                    }
                } else {
                    const existingBySku = await ProductVariant.findOne({ sku: variantData.sku }).session(session);
                    if (existingBySku) {
                        updatedVariant = await ProductVariant.findByIdAndUpdate(existingBySku._id, variantData, { new: true, session });
                    } else {
                        variantData.createdBy = existingProduct.createdBy || user?._id;
                        updatedVariant = await ProductVariant.create([variantData], { session });
                        updatedVariant = updatedVariant[0];

                        if (updatedVariant && Number(v.quantity) > 0) {
                            await stockService.addStockIn({
                                productId: product._id,
                                variantId: updatedVariant._id,
                                quantity: Number(v.quantity),
                                pricing: {
                                    mrp: Number(v.mrp) || 0,
                                    sellingPrice: Number(v.price) || 0,
                                    finalSellingPrice: Number(v.finalSellingPrice) || Number(v.price) || 0,
                                    costPrice: Number(v.costPrice) || 0,
                                    taxId: v.taxId || null,
                                    discountType: v.discountType || 'Percentage',
                                    discountValue: Number(v.discountValue) || 0
                                }
                            }, user);
                        }
                    }
                }

                if (updatedVariant && (!updatedVariant.qrCode || product.slug !== existingProduct.slug)) {
                    try {
                        const qrPath = await generateProductQRCode(product.slug, updatedVariant._id);
                        if (qrPath) {
                            updatedVariant.qrCode = qrPath;
                            await updatedVariant.save({ session });
                        }
                    } catch (qrErr) {
                        console.error('Failed to QR variant:', qrErr);
                    }
                }

                if (updatedVariant && (!updatedVariant.barcode || product.slug !== existingProduct.slug)) {
                    try {
                        if (!updatedVariant.ean) updatedVariant.ean = generateRandomEan();
                        const barcodePath = await generateEanBarcode(updatedVariant.ean, `${product.slug}-${updatedVariant._id}`);
                        if (barcodePath) {
                            updatedVariant.barcode = barcodePath;
                            await updatedVariant.save({ session });
                        }
                    } catch (bcErr) {
                        console.error('Failed to Barcode variant:', bcErr);
                    }
                }

                if (updatedVariant) processedIds.push(updatedVariant._id);
            }

            // identify variants to be deleted
            const toDeleteVariants = await ProductVariant.find({
                productId: product._id,
                _id: { $nin: processedIds },
                isDeleted: false
            }).session(session);

            if (toDeleteVariants.length > 0) {
                const deletedIds = toDeleteVariants.map(v => v._id);

                // Soft delete variants
                await ProductVariant.updateMany(
                    { _id: { $in: deletedIds } },
                    { isDeleted: true },
                    { session }
                );

                // Cascade soft-delete StockIn for these variants
                await mongoose.model('StockIn').updateMany(
                    { variantId: { $in: deletedIds } },
                    { isDeleted: true },
                    { session }
                );

                // Cascade hard-delete StockOut for these variants
                await mongoose.model('StockOut').deleteMany(
                    { variantId: { $in: deletedIds } },
                    { session }
                );
            }
        }

        await session.commitTransaction();
        return product;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

exports.getProductBySlug = async (slug) => {
    const product = await Product.findOne({ slug }).lean();
    return await injectStockData(product);
};

exports.getVariantById = async (id) => {
    return await ProductVariant.findById(id).populate({
        path: 'attributes.variantTypeId attributes.valueId',
        select: 'name valueName value'
    });
};

exports.deleteProduct = async (id) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const product = await Product.findById(id).session(session);
        if (!product) throw new Error('Product not found');

        product.isDeleted = true;
        await product.save({ session });

        // Cascade delete variants
        const variants = await ProductVariant.find({ productId: product._id }).session(session);
        const variantIds = variants.map(v => v._id);

        if (variants.length > 0) {
            await ProductVariant.updateMany(
                { productId: product._id },
                { isDeleted: true },
                { session }
            );
        }

        // Cascade delete StockIn (Soft delete)
        await mongoose.model('StockIn').updateMany(
            { productId: product._id },
            { isDeleted: true },
            { session }
        );

        // Cascade delete StockOut (Hard delete or soft delete if supported)
        // Since StockOut doesn't have isDeleted, we hard delete to keep DB clean of orphaned records
        await mongoose.model('StockOut').deleteMany(
            { productId: product._id },
            { session }
        );

        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

exports.updateProductStatus = async (id, status) => {
    return await Product.findByIdAndUpdate(id, { status }, { new: true });
};

exports.getAllProducts = async () => {
    const products = await Product.find({ isDeleted: false }).lean();
    return await injectStockData(products);
};

exports.searchProducts = async (searchTerm) => {
    const products = await Product.find({ name: new RegExp(searchTerm, 'i'), isDeleted: false }).lean();
    return await injectStockData(products);
};

exports.getProductByEan = async (ean) => {
    // 1. Check Variants first
    const variant = await ProductVariant.findOne({ ean, isDeleted: false });
    if (variant) {
        const product = await this.getProductDetailsForPublicById(variant.productId);
        if (!product) throw new Error('Product not found');

        // Filter variants to only show the scanned one
        if (product.variants && Array.isArray(product.variants)) {
            product.variants = product.variants.filter(v => v._id.toString() === variant._id.toString());
        }

        return { product, variantId: variant._id };
    }

    // 2. Check Parent Products
    const product = await Product.findOne({ ean, isDeleted: false });
    if (product) {
        const fullProduct = await this.getProductDetailsForPublic(product.slug);
        return { product: fullProduct, variantId: null };
    }

    throw new Error('Product not found');
};

exports.getProductDetailsForPublicById = async (id) => {
    const product = await Product.findById(id).populate('unitId');
    if (!product || product.isDeleted) return null;

    const variants = await ProductVariant.find({ productId: product._id, isDeleted: false })
        .populate({
            path: 'attributes.variantTypeId attributes.valueId',
            select: 'name valueName value'
        });

    return await injectStockData({
        ...product._doc,
        variants: sortVariantsByValue(variants)
    });
};
