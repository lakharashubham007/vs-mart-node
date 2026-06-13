const mongoose = require('mongoose');

const pricingRuleSchema = new mongoose.Schema({
    minOrderAmount: {
        type: Number,
        required: true,
        min: 0
    },
    deliveryCharge: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false });

const bucketSchema = new mongoose.Schema({
    minDistance: {
        type: Number,
        required: true,
        min: 0
    },
    maxDistance: {
        type: Number,
        required: true,
        min: 0
    },
    pricingRules: {
        type: [pricingRuleSchema],
        validate: [v => Array.isArray(v) && v.length > 0, 'At least one pricing rule is required per bucket']
    },
    estimatedTime: {
        type: String,
        trim: true
    }
}, { _id: false });

const deliveryConfigSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Configuration name is required'],
        trim: true,
        unique: true
    },
    maxRadius: {
        type: Number,
        required: [true, 'Max radius in KM is required'],
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    buckets: [bucketSchema]
}, {
    timestamps: true
});

// Create index for search and sorting
deliveryConfigSchema.index({ name: 'text' });
deliveryConfigSchema.index({ createdAt: -1 });

// Validation hook
deliveryConfigSchema.pre('save', async function () {
    if (this.buckets && this.buckets.length > 0) {
        for (let i = 0; i < this.buckets.length; i++) {
            const bucket = this.buckets[i];
            
            // 1. Distance Validation
            if (bucket.minDistance >= bucket.maxDistance) {
                throw new Error(`Bucket ${i + 1}: Min distance (${bucket.minDistance}) must be less than max distance (${bucket.maxDistance}).`);
            }
            if (bucket.maxDistance > this.maxRadius) {
                throw new Error(`Bucket ${i + 1}: Max distance (${bucket.maxDistance}) cannot exceed the zone maxRadius (${this.maxRadius} KM).`);
            }

            // 2. Pricing Rules Validation
            if (!bucket.pricingRules || bucket.pricingRules.length === 0) {
                throw new Error(`Bucket ${i + 1}: At least one pricing rule is required.`);
            }

            // Sort pricing rules by minOrderAmount
            bucket.pricingRules.sort((a, b) => a.minOrderAmount - b.minOrderAmount);

            // Check for duplicate minOrderAmount
            const amounts = bucket.pricingRules.map(r => r.minOrderAmount);
            if (new Set(amounts).size !== amounts.length) {
                throw new Error(`Bucket ${i + 1}: Duplicate minOrderAmount detected in pricing rules.`);
            }
        }
        
        // Sort buckets by minDistance to ensure order
        this.buckets.sort((a, b) => a.minDistance - b.minDistance);
        
        // Check for overlaps after sorting
        for (let i = 0; i < this.buckets.length - 1; i++) {
            if (this.buckets[i].maxDistance > this.buckets[i + 1].minDistance) {
                throw new Error(`Buckets overlap between range ${this.buckets[i].maxDistance}KM and ${this.buckets[i+1].minDistance}KM.`);
            }
        }
    }
});

const DeliveryConfig = mongoose.model('DeliveryConfig', deliveryConfigSchema);

module.exports = DeliveryConfig;
