const mongoose = require('mongoose');

const CryptoConfigSchema = new mongoose.Schema({
    coinType: {
        type: String,
        required: true,
        enum: ['BTC', 'ETH', 'USDT', 'USDC', 'MATIC', 'SOL']
    },
    network: {
        type: String,
        required: true,
        enum: ['Bitcoin', 'Ethereum', 'Polygon', 'BSC', 'Tron', 'Solana']
    },
    enabled: {
        type: Boolean,
        default: false
    },
    address: {
        type: String,
        trim: true,
        default: ''
    },
    label: {
        type: String,
        trim: true,
        default: ''
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    networkConfig: {
        contractAddress: String,
        decimals: Number,
        chainId: Number,
        explorerUrl: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const PaymentConfigurationSchema = new mongoose.Schema({
    businessEmail: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    
    // Array of cryptocurrency configurations
    cryptoConfigurations: [CryptoConfigSchema],
    
    // API provider configurations
    apiProviders: [{
        network: String,
        provider: String,
        apiKey: String,
        enabled: {
            type: Boolean,
            default: false
        }
    }],
    
    // Payment processing settings
    settings: {
        minAmount: {
            type: Number,
            default: 1
        },
        maxAmount: {
            type: Number,
            default: 100000
        },
        verificationTimeout: {
            type: Number,
            default: 1800000, // 30 minutes in milliseconds
        },
        requireCustomerInfo: {
            type: Boolean,
            default: true
        },
        notifyOnPayment: {
            type: Boolean,
            default: true
        },
        notifyOnComplete: {
            type: Boolean,
            default: true
        }
    },
    
    // Webhook configuration
    webhookUrl: {
        type: String,
        trim: true,
        default: ''
    },
    webhookSecret: {
        type: String,
        trim: true,
        default: ''
    },
    
    isActive: {
        type: Boolean,
        default: true
    },
    
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-update the updatedAt field on any save
PaymentConfigurationSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Auto-update the nested crypto config updatedAt
PaymentConfigurationSchema.pre('save', function(next) {
    if (this.cryptoConfigurations) {
        this.cryptoConfigurations.forEach(config => {
            config.updatedAt = Date.now();
        });
    }
    next();
});

// Index for fast lookups
PaymentConfigurationSchema.index({ businessEmail: 1, 'cryptoConfigurations.enabled': 1 });

const PaymentConfiguration = mongoose.model('PaymentConfiguration', PaymentConfigurationSchema);

module.exports = { PaymentConfiguration };
