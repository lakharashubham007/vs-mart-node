const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Product = require('../modules/products/product.model');
const ProductVariant = require('../modules/products/productVariant.model');
const { generateProductQRCode } = require('../utils/qr.util');

const BATCH_SIZE = 100;

const run = async () => {
    await connectDB();
    console.log('--- Starting Bulk QR Code Generation ---');

    try {
        // --- PASS 1: Main Products ---
        const totalProducts = await Product.countDocuments({ qrCode: { $exists: false } });
        console.log(`\n[Pass 1] Found ${totalProducts} main products without QR codes.`);

        let processedP = 0;
        let successP = 0;
        let failedP = 0;

        while (processedP < totalProducts) {
            const products = await Product.find({ qrCode: { $exists: false } })
                .limit(BATCH_SIZE);

            if (products.length === 0) break;

            const promises = products.map(async (product) => {
                try {
                    const qrPath = await generateProductQRCode(product.slug);
                    if (qrPath) {
                        product.qrCode = qrPath;
                        await product.save();
                        return true;
                    }
                    return false;
                } catch (err) {
                    console.error(`Failed for product ${product.slug}:`, err.message);
                    return false;
                }
            });

            const results = await Promise.all(promises);
            successP += results.filter(r => r === true).length;
            failedP += results.filter(r => r === false).length;
            processedP += products.length;

            console.log(`Products: ${processedP}/${totalProducts} | Success: ${successP} | Failed: ${failedP}`);
        }

        // --- PASS 2: Variants ---
        const totalVariants = await ProductVariant.countDocuments({ qrCode: { $exists: false } });
        console.log(`\n[Pass 2] Found ${totalVariants} variants without QR codes.`);

        let processedV = 0;
        let successV = 0;
        let failedV = 0;

        while (processedV < totalVariants) {
            const variants = await ProductVariant.find({ qrCode: { $exists: false } })
                .populate('productId', 'slug')
                .limit(BATCH_SIZE);

            if (variants.length === 0) break;

            const promises = variants.map(async (variant) => {
                try {
                    if (!variant.productId || !variant.productId.slug) {
                        return false;
                    }
                    const qrPath = await generateProductQRCode(variant.productId.slug, variant._id);
                    if (qrPath) {
                        variant.qrCode = qrPath;
                        await variant.save();
                        return true;
                    }
                    return false;
                } catch (err) {
                    console.error(`Failed for variant ${variant._id}:`, err.message);
                    return false;
                }
            });

            const results = await Promise.all(promises);
            successV += results.filter(r => r === true).length;
            failedV += results.filter(r => r === false).length;
            processedV += variants.length;

            console.log(`Variants: ${processedV}/${totalVariants} | Success: ${successV} | Failed: ${failedV}`);
        }

        console.log('\n--- Bulk Generation Completed ---');
        console.log(`Total Products Success: ${successP}`);
        console.log(`Total Variants Success: ${successV}`);

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        mongoose.disconnect();
        process.exit(0);
    }
};

run();
