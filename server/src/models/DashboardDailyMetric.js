const mongoose = require('mongoose');

const dashboardDailyMetricSchema = new mongoose.Schema({
    businessEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        ref: 'User'
    },
    date: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}-\d{2}$/ // YYYY-MM-DD format
    },
    volume: {
        USDT: { type: Number, default: 0 },
        USDC: { type: Number, default: 0 },
        BTC: { type: Number, default: 0 },
        ETH: { type: Number, default: 0 },
        MATIC: { type: Number, default: 0 },
        SOL: { type: Number, default: 0 }
    },
    currentMonthSummary: {
        totalPayments: { type: Number, default: 0 },
        completed: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
        pending: { type: Number, default: 0 }
    },
    totalSales: {
        type: Number,
        default: 0
    },
    transactionCount: {
        type: Number,
        default: 0
    },
    averageTransactionValue: {
        type: Number,
        default: 0
    },
    topCryptoCurrency: {
        type: String,
        default: 'USDT'
    }
}, { 
    timestamps: true 
});

// Compound index to ensure unique date per business
dashboardDailyMetricSchema.index({ businessEmail: 1, date: 1 }, { unique: true });
dashboardDailyMetricSchema.index({ businessEmail: 1, date: -1 });
dashboardDailyMetricSchema.index({ date: -1 });

const DashboardDailyMetric = mongoose.model('DashboardDailyMetric', dashboardDailyMetricSchema);

module.exports = { DashboardDailyMetric };
