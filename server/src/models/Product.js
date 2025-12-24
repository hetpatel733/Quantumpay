const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    productId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    productName: {
        type: String,
        required: true,
        trim: true
    },
    amountUSD: {
        type: Number,
        required: true,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    image: {
        type: String,
        trim: true,
        default: ''
    },
    imageFileId: {
        type: String,
        trim: true,
        default: null
    },
    totalVolume: {
        type: Number,
        default: 0
    },
    salesCount: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

// Indexes
orderSchema.index({ userId: 1, productId: 1 }, { unique: true });
orderSchema.index({ userId: 1, isActive: 1 });
orderSchema.index({ salesCount: -1 }); // Index for sorting by sales

const Product = mongoose.model('Product', orderSchema);

module.exports = { Product };