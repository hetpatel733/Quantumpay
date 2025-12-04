const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    payId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    orderId: {
        type: String,
        required: true,
        trim: true,
        ref: 'Order'
    },
    businessEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        ref: 'User'
    },
    hash: {
        type: String,
        trim: true,
        default: null
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'completed', 'failed', 'cancelled'],
        default: 'pending'
    },
    amountUSD: {
        type: Number,
        required: true,
        min: 0
    },
    amountCrypto: {
        type: Number,
        required: true,
        min: 0
    },
    cryptoType: {
        type: String,
        required: true,
        enum: ['USDT', 'USDC', 'BTC', 'ETH', 'MATIC', 'SOL'],
        uppercase: true
    },
    cryptoSymbol: {
        type: String,
        required: true,
        uppercase: true
    },
    network: {
        type: String,
        required: true,
        enum: ['Ethereum', 'Polygon', 'BSC', 'Bitcoin', 'Tron', 'Solana'],
        default: function() {
            // Set default network based on crypto type
            const defaultNetworks = {
                'BTC': 'Bitcoin',
                'ETH': 'Ethereum',
                'USDT': 'Polygon',
                'USDC': 'Polygon',
                'MATIC': 'Polygon',
                'SOL': 'Solana'
            };
            return defaultNetworks[this.cryptoType] || 'Ethereum';
        }
    },
    networkFee: {
        type: Number,
        default: 0
    },
    platformFee: {
        type: Number,
        default: 0
    },
    completedAt: {
        type: Date,
        default: null
    },
    failureReason: {
        type: String,
        trim: true,
        default: null
    },
    customerEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    customerName: {
        type: String,
        required: true,
        trim: true
    },
    exchangeRate: {
        type: Number,
        required: true,
        min: 0
    },
    priceSource: {
        type: String,
        enum: ['binance', 'fallback', 'manual'],
        default: 'binance'
    },
    priceTimestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Add virtual for customer info formatting
paymentSchema.virtual('customerInfo').get(function() {
    return {
        name: this.customerName,
        email: this.customerEmail
    };
});

// Add virtual for complete payment info with network
paymentSchema.virtual('paymentInfo').get(function() {
    return {
        crypto: `${this.cryptoType} (${this.network})`,
        amount: this.amountCrypto,
        usdValue: this.amountUSD,
        status: this.status
    };
});

// Add method to update status with timestamp
paymentSchema.methods.updateStatus = function(newStatus, hash = null) {
    this.status = newStatus;
    if (newStatus === 'completed') {
        this.completedAt = new Date();
    }
    if (hash) {
        this.hash = hash;
    }
    return this.save();
};

// Pre-save middleware to set cryptoSymbol based on cryptoType
paymentSchema.pre('save', function(next) {
    if (this.isModified('cryptoType')) {
        this.cryptoSymbol = this.cryptoType;
    }
    next();
});

// Add indexes for performance
paymentSchema.index({ payId: 1 });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ businessEmail: 1, status: 1 });
paymentSchema.index({ businessEmail: 1, createdAt: -1 });
paymentSchema.index({ businessEmail: 1, completedAt: -1 });
paymentSchema.index({ hash: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ cryptoType: 1, status: 1 });
paymentSchema.index({ network: 1, cryptoType: 1 });
paymentSchema.index({ businessEmail: 1, network: 1, cryptoType: 1 });

// Add a static method to find payments by business email with network filtering
paymentSchema.statics.findByBusiness = function(businessEmail, options = {}) {
    const query = { businessEmail: businessEmail.toLowerCase() };
    if (options.status) {
        query.status = options.status;
    }
    if (options.cryptoType) {
        query.cryptoType = options.cryptoType;
    }
    if (options.network) {
        query.network = options.network;
    }
    return this.find(query).sort({ createdAt: -1 });
};

// Add static method to get payment statistics by network
paymentSchema.statics.getNetworkStats = async function(businessEmail) {
    return await this.aggregate([
        { $match: { businessEmail: businessEmail.toLowerCase() } },
        {
            $group: {
                _id: { network: '$network', cryptoType: '$cryptoType' },
                count: { $sum: 1 },
                totalUSD: { $sum: '$amountUSD' },
                totalCrypto: { $sum: '$amountCrypto' },
                completed: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                }
            }
        },
        { $sort: { totalUSD: -1 } }
    ]);
};

// Debug method to check payment data
paymentSchema.statics.debugInfo = async function() {
    const total = await this.countDocuments({});
    const byStatus = await this.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const byBusiness = await this.aggregate([
        { $group: { _id: '$businessEmail', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
    ]);
    const byNetwork = await this.aggregate([
        { $group: { _id: { network: '$network', crypto: '$cryptoType' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);
    
    return {
        total,
        byStatus,
        topBusinesses: byBusiness,
        byNetwork
    };
};

// Ensure the collection name is correct
paymentSchema.set('collection', 'payments');

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = { Payment };