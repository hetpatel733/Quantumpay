const mongoose = require('mongoose');

const dashboardDailyMetricSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    date: {
        type: Date,
        required: true
    },
    totalSales: {
        type: Number,
        default: 0
    },
    transactionCount: {
        type: Number,
        default: 0
    },
    volume: {
        // Maps cryptocurrency symbol to USD volume (e.g., { "BTC": 1250.00, "ETH": 800.50 })
        // Stores USD equivalent values, NOT crypto amounts
        type: Map,
        of: Number,
        default: {}
    },
    // Breakdown by status - REMOVED pendingCount as it's real-time data
    completedCount: {
        type: Number,
        default: 0
    },
    failedCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
dashboardDailyMetricSchema.index({ userId: 1, date: 1 }, { unique: true });

const DashboardDailyMetric = mongoose.model('DashboardDailyMetric', dashboardDailyMetricSchema);

module.exports = { DashboardDailyMetric };
