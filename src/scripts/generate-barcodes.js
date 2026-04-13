const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const Product = require('../modules/products/product.model');
const ProductVariant = require('../modules/products/productVariant.model');
const { generateRandomEan, generateEanBarcode } = require('../utils/barcode.util');

const generateExistingBarcodes = async () => {
    try {
        console.log('🚀 Starting Barcode generation for existing products/variants...');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/vs-mart');
        console.log('✅ Connected to MongoDB');

        // 1. Process Parent Products
        const products = await Product.find({
            $or: [
                { barcode: { $exists: false } },
                { barcode: '' },
                { barcode: null }
            ],
            isDeleted: false
        });

        console.log(`📦 Found ${products.length} products needing barcodes.`);

        for (const product of products) {
            try {
                if (!product.ean) {
                    product.ean = generateRandomEan();
                }
                const bcPath = await generateEanBarcode(product.ean, product.slug);
                if (bcPath) {
                    product.barcode = bcPath;
                    await product.save();
                    console.log(`✅ Generated for Product: ${product.name}`);
                }
            } catch (err) {
                console.error(`❌ Failed for Product: ${product.name}`, err.message);
            }
        }

        // 2. Process Variants
        const variants = await ProductVariant.find({
            $or: [
                { barcode: { $exists: false } },
                { barcode: '' },
                { barcode: null }
            ],
            isDeleted: false
        }).populate('productId');

        console.log(`🔢 Found ${variants.length} variants needing barcodes.`);

        for (const variant of variants) {
            try {
                if (!variant.ean) {
                    variant.ean = generateRandomEan();
                }
                const productSlug = variant.productId ? variant.productId.slug : 'unknown';
                const bcPath = await generateEanBarcode(variant.ean, `${productSlug}-${variant._id}`);
                if (bcPath) {
                    variant.barcode = bcPath;
                    await variant.save();
                    console.log(`✅ Generated for Variant: ${variant.sku}`);
                }
            } catch (err) {
                console.error(`❌ Failed for Variant: ${variant.sku}`, err.message);
            }
        }

        const sample = await ProductVariant.findOne({ barcode: { $exists: true } });
        if (sample) console.log(`🔍 Sample EAN for testing: ${sample.ean}`);

        console.log('✨ Barcode generation completed!');
        process.exit(0);
    } catch (error) {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    }
};

generateExistingBarcodes();
