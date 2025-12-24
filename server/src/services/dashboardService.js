const { Payment } = require('../models/Payment');
const { Product } = require('../models/Product');
const { DashboardDailyMetric } = require('../models/DashboardDailyMetric');

const CRYPTO_COLORS = {
    'BTC': '#F7931A',
    'ETH': '#627EEA',
    'USDT': '#26A17B',
    'USDC': '#1FC7D4',
    'MATIC': '#8247E5',
    'SOL': '#9945FF'
};

/**
 * Build volume map and total sales from a list of daily metrics
 * NOW: volume contains USD values for each cryptocurrency
 */
function buildVolumeFromMetrics(dailyMetrics) {
    const volume = {};
    let totalSales = 0;

    dailyMetrics.forEach(metric => {
        totalSales += metric.totalSales || 0;
        
        // Handle volume as Map or plain object
        // Volume now stores USD values directly
        if (metric.volume instanceof Map) {
            metric.volume.forEach((usdAmount, crypto) => {
                volume[crypto] = (volume[crypto] || 0) + Number(usdAmount || 0);
            });
        } else if (metric.volume && typeof metric.volume === 'object') {
            Object.entries(metric.volume).forEach(([crypto, usdAmount]) => {
                volume[crypto] = (volume[crypto] || 0) + (Number(usdAmount) || 0);
            });
        }
    });

    return { volume, totalSales };
}

// GET RECENT ACTIVITY
async function getRecentActivity(req, res) {
    try {
        const { userId, limit = 5 } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        //console.log(`📋 Fetching recent activity for user: ${userId}, limit: ${limit}`);

        // Fetch recent payments for this user
        const payments = await Payment.find({ userId })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        //console.log(`✅ Found ${payments.length} recent transactions`);

        // Transform payments to activity format
        const recentActivity = payments.map(payment => ({
            id: payment._id.toString(),
            customer: payment.customerName || 'Unknown Customer',
            customerEmail: payment.customerEmail || '',
            amount: payment.amountUSD || 0,
            cryptocurrency: payment.cryptoType || payment.cryptoSymbol || 'Unknown',
            cryptoSymbol: payment.cryptoSymbol || payment.cryptoType || 'Unknown',
            cryptoAmount: payment.amountCrypto || 0,
            status: payment.status || 'pending',
            timestamp: payment.createdAt,
            network: payment.network || payment.cryptoType
        }));

        return res.status(200).json({
            success: true,
            recentActivity,
            isEmpty: recentActivity.length === 0
        });

    } catch (error) {
        console.error('❌ Get recent activity error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch recent activity',
            recentActivity: [],
            isEmpty: true
        });
    }
}

// GET DASHBOARD OVERVIEW - USES DAILY METRICS ONLY
async function getDashboardOverview(req, res) {
    try {
        const { userId, period = '30' } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        //console.log(`📊 Fetching dashboard overview from daily metrics for user: ${userId}, period: ${period} days`);

        // Calculate date range based on selected period
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        // Fetch daily metrics for the selected period
        const dailyMetrics = await DashboardDailyMetric.find({
            userId,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: 1 }).lean();

        //console.log(`✅ Found ${dailyMetrics.length} daily metric records for the ${period}-day period`);

        // Build aggregated data from metrics for the SELECTED PERIOD
        const { volume, totalSales } = buildVolumeFromMetrics(dailyMetrics);

        // Calculate status counts from metrics for the SELECTED PERIOD
        let totalPayments = 0;
        let completedCount = 0;
        let failedCount = 0;

        dailyMetrics.forEach(metric => {
            completedCount += metric.completedCount || 0;
            failedCount += metric.failedCount || 0;
            totalPayments += (metric.completedCount || 0) + (metric.failedCount || 0);
        });

        // CHANGED: Get real-time pending count from Payment collection (not from metrics)
        const currentPendingCount = await Payment.countDocuments({
            userId,
            status: 'pending'
        });

        //console.log(`📊 Period summary (${period} days):`, {
        //     total: totalPayments,
        //     completed: completedCount,
        //     pending: currentPendingCount, // Real-time count
        //     failed: failedCount,
        //     totalSales
        // });

        // Build daily breakdown from metrics
        const dailyBreakdown = dailyMetrics.map(metric => ({
            name: new Date(metric.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            volume: metric.totalSales || 0
        }));

        // Fill in missing days with zeros
        const days = parseInt(period);
        const fullDailyBreakdown = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            const existingMetric = dailyBreakdown.find(m => m.name === dateStr);
            fullDailyBreakdown.push({
                name: dateStr,
                volume: existingMetric ? existingMetric.volume : 0
            });
        }

        // Crypto distribution for pie chart
        const cryptoDistribution = Object.entries(volume)
            .map(([name, value]) => {
                const percentage = totalSales > 0 ? (value / totalSales * 100).toFixed(1) : 0;
                return {
                    name,
                    value: parseFloat(percentage),
                    color: CRYPTO_COLORS[name] || '#999999'
                };
            })
            .filter(item => item.value > 0);

        const response = {
            success: true,
            periodMetrics: {
                totalSales,
                transactionCount: completedCount,
                volume,
                statusSummary: {
                    totalPayments,
                    completed: completedCount,
                    failed: failedCount,
                    pending: currentPendingCount // Real-time pending count
                },
                averageTransactionValue: completedCount > 0 ? totalSales / completedCount : 0,
                topCryptoCurrency: Object.keys(volume).sort((a, b) => volume[b] - volume[a])[0] || 'USDT',
                periodDays: parseInt(period)
            },
            dailyBreakdown: fullDailyBreakdown,
            cryptoDistribution,
            orderStats: {
                total: totalPayments + currentPendingCount,
                pending: currentPendingCount, // Real-time
                processing: 0,
                completed: completedCount,
                cancelled: failedCount
            }
        };

        return res.status(200).json(response);

    } catch (error) {
        console.error('❌ Get dashboard overview error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard overview'
        });
    }
}

// GET CRYPTO DISTRIBUTION (percentage) - NOW USES DAILY METRICS
async function getCryptoDistribution(req, res) {
    try {
        const { userId, period = '30days' } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const days = parseInt(period, 10) || 30;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        //console.log(`📊 Fetching crypto distribution from daily metrics for user: ${userId}, period: ${days} days`);

        // Fetch daily metrics instead of payments
        const dailyMetrics = await DashboardDailyMetric.find({
            userId,
            date: { $gte: startDate, $lte: endDate }
        }).lean();

        const { volume, totalSales } = buildVolumeFromMetrics(dailyMetrics);

        const distribution = Object.entries(volume)
            .map(([name, value]) => ({
                name,
                value: totalSales > 0 ? parseFloat(((value / totalSales) * 100).toFixed(1)) : 0,
                color: CRYPTO_COLORS[name] || '#999999'
            }))
            .filter(entry => entry.value > 0);

        return res.status(200).json({
            success: true,
            distribution: distribution.length > 0 ? distribution : [
                { name: 'USDT', value: 20, color: CRYPTO_COLORS.USDT },
                { name: 'USDC', value: 20, color: CRYPTO_COLORS.USDC },
                { name: 'BTC', value: 20, color: CRYPTO_COLORS.BTC },
                { name: 'ETH', value: 20, color: CRYPTO_COLORS.ETH },
                { name: 'MATIC', value: 10, color: CRYPTO_COLORS.MATIC },
                { name: 'SOL', value: 10, color: CRYPTO_COLORS.SOL }
            ]
        });

    } catch (error) {
        console.error('❌ Get crypto distribution error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch crypto distribution',
            distribution: []
        });
    }
}

// Export addition
module.exports = {
    getRecentActivity,
    getDashboardOverview,
    getCryptoDistribution
};
