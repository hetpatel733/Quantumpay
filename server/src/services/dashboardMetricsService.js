const { DashboardDailyMetric } = require('../models/DashboardDailyMetric');
const { Payment } = require('../models/Payment');

/**
 * Update dashboard metrics when a payment status changes
 * @param {Object} paymentData - Payment object
 * @param {string} previousStatus - Previous payment status (optional)
 */
const updatePaymentMetrics = async (paymentData, previousStatus = null) => {
    try {
        console.log('📊 Updating dashboard metrics for payment:', paymentData.payId);
        
        const businessEmail = paymentData.businessEmail;
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const currentStatus = paymentData.status;
        
        // Find or create today's metrics
        let todayMetrics = await DashboardDailyMetric.findOne({
            businessEmail,
            date: today
        });
        
        if (!todayMetrics) {
            console.log('📊 Creating new daily metrics for:', businessEmail, 'Date:', today);
            todayMetrics = new DashboardDailyMetric({
                businessEmail,
                date: today,
                // Updated volume structure for new crypto types
                volume: { 
                    USDT: 0, 
                    USDC: 0, 
                    BTC: 0, 
                    ETH: 0,
                    MATIC: 0,
                    SOL: 0
                },
                currentMonthSummary: { totalPayments: 0, completed: 0, failed: 0, pending: 0 },
                totalSales: 0,
                transactionCount: 0,
                averageTransactionValue: 0,
                topCryptoCurrency: 'USDT'
            });
        }
        
        // Update based on status change
        const amountUSD = paymentData.amountUSD || 0;
        const cryptoType = paymentData.cryptoType || 'USDT';
        
        // Handle status transitions
        if (previousStatus && previousStatus !== currentStatus) {
            console.log('📊 Status changed from', previousStatus, 'to', currentStatus);
            
            // Remove from previous status count
            if (previousStatus === 'pending') {
                todayMetrics.currentMonthSummary.pending = Math.max(0, todayMetrics.currentMonthSummary.pending - 1);
            } else if (previousStatus === 'completed') {
                todayMetrics.currentMonthSummary.completed = Math.max(0, todayMetrics.currentMonthSummary.completed - 1);
                todayMetrics.totalSales = Math.max(0, todayMetrics.totalSales - amountUSD);
                todayMetrics.transactionCount = Math.max(0, todayMetrics.transactionCount - 1);
                
                // Remove from crypto volume
                if (todayMetrics.volume[cryptoType] !== undefined) {
                    todayMetrics.volume[cryptoType] = Math.max(0, todayMetrics.volume[cryptoType] - amountUSD);
                }
            } else if (previousStatus === 'failed') {
                todayMetrics.currentMonthSummary.failed = Math.max(0, todayMetrics.currentMonthSummary.failed - 1);
            }
        }
        
        // Add to new status count
        if (currentStatus === 'pending') {
            todayMetrics.currentMonthSummary.pending += 1;
            todayMetrics.currentMonthSummary.totalPayments += 1;
        } else if (currentStatus === 'completed') {
            todayMetrics.currentMonthSummary.completed += 1;
            if (!previousStatus) { // New payment
                todayMetrics.currentMonthSummary.totalPayments += 1;
            }
            
            // Add to sales and transaction count
            todayMetrics.totalSales += amountUSD;
            todayMetrics.transactionCount += 1;
            
            // Add to crypto volume - only supported types
            if (['USDT', 'USDC', 'BTC', 'ETH', 'MATIC', 'SOL'].includes(cryptoType)) {
                if (todayMetrics.volume[cryptoType] !== undefined) {
                    todayMetrics.volume[cryptoType] += amountUSD;
                } else {
                    todayMetrics.volume[cryptoType] = amountUSD;
                }
            }
            
            // Update completion timestamp - ONLY for payments, not orders
            if (!paymentData.completedAt) {
                paymentData.completedAt = new Date();
            }
            
            // DO NOT update any order status here - orders are products that can be purchased multiple times
            
        } else if (currentStatus === 'failed') {
            todayMetrics.currentMonthSummary.failed += 1;
            if (!previousStatus) { // New payment
                todayMetrics.currentMonthSummary.totalPayments += 1;
            }
        }
        
        // Recalculate average transaction value
        if (todayMetrics.transactionCount > 0) {
            todayMetrics.averageTransactionValue = todayMetrics.totalSales / todayMetrics.transactionCount;
        }
        
        // Update top cryptocurrency
        todayMetrics.topCryptoCurrency = getTopCryptocurrency(todayMetrics.volume);
        
        await todayMetrics.save();
        console.log('✅ Dashboard metrics updated successfully for:', businessEmail, 'Status:', currentStatus, 'Amount:', amountUSD);
        
        return todayMetrics;
        
    } catch (error) {
        console.error('❌ Error updating dashboard metrics:', error);
        // Don't throw error to prevent payment processing failure
        return null;
    }
};

/**
 * Recalculate all metrics for a business (useful for data corrections)
 * @param {string} businessEmail - Business email
 * @param {string} date - Date in YYYY-MM-DD format (optional, defaults to today)
 */
const recalculateMetrics = async (businessEmail, date = null) => {
    try {
        const targetDate = date || new Date().toISOString().split('T')[0];
        console.log('🔄 Recalculating metrics for:', businessEmail, 'Date:', targetDate);
        
        // Get all payments for the date
        const startDate = new Date(targetDate + 'T00:00:00.000Z');
        const endDate = new Date(targetDate + 'T23:59:59.999Z');
        
        const payments = await Payment.find({
            businessEmail,
            createdAt: { $gte: startDate, $lte: endDate }
        });
        
        console.log('📊 Found', payments.length, 'payments for recalculation');
        
        // Initialize metrics
        const metrics = {
            // Updated volume structure
            volume: { USDT: 0, USDC: 0, BTC: 0, ETH: 0, MATIC: 0, SOL: 0 },
            currentMonthSummary: { totalPayments: payments.length, completed: 0, failed: 0, pending: 0 },
            totalSales: 0,
            transactionCount: 0,
            averageTransactionValue: 0,
            topCryptoCurrency: 'USDT'
        };
        
        // Process each payment
        payments.forEach(payment => {
            const status = payment.status;
            const amountUSD = payment.amountUSD || 0;
            const cryptoType = payment.cryptoType || 'USDT';
            
            // Count by status
            if (status === 'completed') {
                metrics.currentMonthSummary.completed += 1;
                metrics.totalSales += amountUSD;
                metrics.transactionCount += 1;
                
                // Only add to volume if it's a supported crypto type
                if (['USDT', 'USDC', 'BTC', 'ETH', 'MATIC', 'SOL'].includes(cryptoType)) {
                    if (metrics.volume[cryptoType] !== undefined) {
                        metrics.volume[cryptoType] += amountUSD;
                    } else {
                        metrics.volume[cryptoType] = amountUSD;
                    }
                }
            } else if (status === 'failed') {
                metrics.currentMonthSummary.failed += 1;
            } else if (status === 'pending') {
                metrics.currentMonthSummary.pending += 1;
            }
        });
        
        // Calculate average
        if (metrics.transactionCount > 0) {
            metrics.averageTransactionValue = metrics.totalSales / metrics.transactionCount;
        }
        
        // Get top cryptocurrency
        metrics.topCryptoCurrency = getTopCryptocurrency(metrics.volume);
        
        // Update or create the daily metric
        const updatedMetrics = await DashboardDailyMetric.findOneAndUpdate(
            { businessEmail, date: targetDate },
            {
                businessEmail,
                date: targetDate,
                ...metrics
            },
            { upsert: true, new: true }
        );
        
        console.log('✅ Metrics recalculated successfully');
        return updatedMetrics;
        
    } catch (error) {
        console.error('❌ Error recalculating metrics:', error);
        throw error;
    }
};

/**
 * Get metrics for a date range
 * @param {string} businessEmail - Business email
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 */
const getMetricsForRange = async (businessEmail, startDate, endDate) => {
    try {
        const metrics = await DashboardDailyMetric.find({
            businessEmail,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: 1 });
        
        return metrics;
    } catch (error) {
        console.error('❌ Error fetching metrics for range:', error);
        throw error;
    }
};

/**
 * Get monthly summary for a business
 * @param {string} businessEmail - Business email
 * @param {string} month - Month in YYYY-MM format
 */
const getMonthlySummary = async (businessEmail, month) => {
    try {
        const metrics = await DashboardDailyMetric.find({
            businessEmail,
            date: { $regex: `^${month}` }
        });
        
        // Aggregate monthly data
        const summary = {
            totalSales: 0,
            transactionCount: 0,
            volume: { USDT: 0, USDC: 0, BTC: 0, ETH: 0, MATIC: 0, SOL: 0 },
            paymentsSummary: { totalPayments: 0, completed: 0, failed: 0, pending: 0 }
        };
        
        metrics.forEach(metric => {
            summary.totalSales += metric.totalSales;
            summary.transactionCount += metric.transactionCount;
            summary.paymentsSummary.totalPayments += metric.currentMonthSummary.totalPayments;
            summary.paymentsSummary.completed += metric.currentMonthSummary.completed;
            summary.paymentsSummary.failed += metric.currentMonthSummary.failed;
            summary.paymentsSummary.pending += metric.currentMonthSummary.pending;
            
            // Sum volumes
            Object.keys(summary.volume).forEach(crypto => {
                summary.volume[crypto] += metric.volume[crypto] || 0;
            });
        });
        
        return summary;
    } catch (error) {
        console.error('❌ Error fetching monthly summary:', error);
        throw error;
    }
};

/**
 * Helper function to determine top cryptocurrency by volume
 * @param {Object} volume - Volume object with crypto types
 */
const getTopCryptocurrency = (volume) => {
    let topCrypto = 'USDT';
    let maxVolume = 0;
    
    Object.entries(volume).forEach(([crypto, vol]) => {
        if (vol > maxVolume) {
            maxVolume = vol;
            topCrypto = crypto;
        }
    });
    
    return topCrypto;
};

/**
 * Initialize metrics for a new business user
 * @param {string} businessEmail - Business email
 */
const initializeBusinessMetrics = async (businessEmail) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const existingMetrics = await DashboardDailyMetric.findOne({
            businessEmail,
            date: today
        });
        
        if (!existingMetrics) {
            const initialMetrics = new DashboardDailyMetric({
                businessEmail,
                date: today,
                volume: { USDT: 0, USDC: 0, BTC: 0, ETH: 0, MATIC: 0, SOL: 0 },
                currentMonthSummary: { totalPayments: 0, completed: 0, failed: 0, pending: 0 },
                totalSales: 0,
                transactionCount: 0,
                averageTransactionValue: 0,
                topCryptoCurrency: 'USDT'
            });
            
            await initialMetrics.save();
            console.log('✅ Initial metrics created for new business:', businessEmail);
            return initialMetrics;
        }
        
        return existingMetrics;
    } catch (error) {
        console.error('❌ Error initializing business metrics:', error);
        throw error;
    }
};

module.exports = {
    updatePaymentMetrics,
    recalculateMetrics,
    getMetricsForRange,
    getMonthlySummary,
    initializeBusinessMetrics
};
