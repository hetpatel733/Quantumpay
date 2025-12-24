const mongoose = require('mongoose');

const currencyDetailsSchema = new mongoose.Schema({
    currencyId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    network: {
        type: String,
        required: true,
        trim: true
    },
    currency: {
        type: String,
        required: true,
        trim: true
    },
    symbol: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    contractAddress: {
        type: String,
        trim: true,
        default: ''
    },
    decimals: {
        type: Number,
        required: true
    },
    chainId: {
        type: Number,
        default: null
    },
    explorerURL: {
        type: String,
        trim: true,
        default: ''
    }
}, {
    timestamps: true
});

// Indexes
currencyDetailsSchema.index({ symbol: 1, network: 1 }, { unique: true });

const CurrencyDetails = mongoose.model('CurrencyDetails', currencyDetailsSchema);

module.exports = { CurrencyDetails };
