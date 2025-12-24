const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    payId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    productId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'completed', 'failed', 'cancelled'],
        default: 'pending'
    },
    // Amount fields
    amountUSD: {
        type: Number,
        required: true,
        min: 0,
        get: v => Math.round(v * 1000) / 1000 // Ensure 3 decimal places on retrieval
    },
    amountCrypto: {
        type: Number,
        required: true,
        min: 0
    },
    // Crypto details
    cryptoType: {
        type: String,
        required: true,
        trim: true
    },
    cryptoSymbol: {
        type: String,
        required: true,
        trim: true
    },
    network: {
        type: String,
        required: true,
        trim: true
    },
    walletAddress: {
        type: String,
        required: true,
        trim: true
    },
    // Customer info
    customerName: {
        type: String,
        required: true,
        trim: true
    },
    customerEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    // Transaction details
    hash: {
        type: String,
        trim: true,
        default: null
    },
    exchangeRate: {
        type: Number,
        required: true,
        min: 0
    },
    priceTimestamp: {
        type: Date,
        default: Date.now
    },
    // Status tracking
    completedAt: {
        type: Date,
        default: null
    },
    failureReason: {
        type: String,
        trim: true,
        default: null
    },
    fees: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes
paymentSchema.index({ payId: 1 }, { unique: true });
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ productId: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = { Payment };