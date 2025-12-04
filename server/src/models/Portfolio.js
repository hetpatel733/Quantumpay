const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
    businessEmail: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        ref: 'User'
    },
    orderIds: [{
        type: String,
        ref: 'Order'
    }],
    totalOrders: {
        type: Number,
        default: 0
    },
    totalRevenue: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: 'USD'
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, { 
    timestamps: true 
});

// Add indexes for performance
portfolioSchema.index({ businessEmail: 1 });
portfolioSchema.index({ totalRevenue: -1 });

const Portfolio = mongoose.model('Portfolio', portfolioSchema);

module.exports = { Portfolio };
