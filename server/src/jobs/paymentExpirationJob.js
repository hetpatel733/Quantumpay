const cron = require('node-cron');
const mongoose = require('mongoose');

/**
 * Payment Expiration Job
 * Automatically marks pending payments as failed if no transaction is received within 10 minutes
 */

let cronTask = null;

function initializePaymentExpirationJob() {
    try {
        // Run every 1 minute
        cronTask = cron.schedule('*/1 * * * *', async () => {
            await checkAndExpirePayments();
        });

        console.log('🕐 Payment expiration cron job initialized (runs every 1 minute)');
        return cronTask;
    } catch (error) {
        console.error('❌ Failed to initialize payment expiration job:', error);
        return null;
    }
}

async function checkAndExpirePayments() {
    try {
        const Payment = mongoose.model('Payment');
        const DashboardDailyMetric = mongoose.model('DashboardDailyMetric');
        
        // Calculate time 10 minutes ago
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        
        // Find all pending payments created more than 10 minutes ago
        const expiredPayments = await Payment.find({
            status: 'pending',
            createdAt: { $lt: tenMinutesAgo }
        });

        if (expiredPayments.length > 0) {
            console.log(`⏰ Found ${expiredPayments.length} expired payment(s) to mark as failed`);

            let successCount = 0;
            let errorCount = 0;

            // Mark each expired payment as failed
            for (const payment of expiredPayments) {
                try {
                    payment.status = 'failed';
                    payment.failureReason = 'Payment expired - no transaction received within 10 minutes';
                    await payment.save();
                    
                    // ✅ FIX: Update daily metrics for expired payments
                    await updateDailyMetricsForExpiredPayment(payment, DashboardDailyMetric);
                    
                    console.log(`✅ Marked payment ${payment.payId} as expired`);
                    successCount++;
                } catch (err) {
                    console.error(`❌ Failed to expire payment ${payment.payId}:`, err.message);
                    errorCount++;
                }
            }

            console.log(`📊 Payment expiration summary: ${successCount} succeeded, ${errorCount} failed`);
        } else {
            console.log('✅ Payment expiration check completed - no expired payments found');
        }

    } catch (error) {
        console.error('❌ Payment expiration cron job error:', error);
    }
}

// Helper function to update daily metrics for expired payments
async function updateDailyMetricsForExpiredPayment(payment, DashboardDailyMetric) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find or create daily metric
        let dailyMetric = await DashboardDailyMetric.findOne({
            userId: payment.userId,
            date: today
        });

        if (!dailyMetric) {
            dailyMetric = new DashboardDailyMetric({
                userId: payment.userId,
                date: today,
                totalSales: 0,
                transactionCount: 0,
                volume: {},
                completedCount: 0,
                failedCount: 0
            });
        }

        // Increment failed count
        dailyMetric.failedCount = (dailyMetric.failedCount || 0) + 1;

        await dailyMetric.save();

        console.log(`📊 Daily metrics updated for expired payment on ${today.toDateString()}: failedCount++`);

    } catch (error) {
        console.error('❌ Update daily metrics error for expired payment:', error);
    }
}

function stopPaymentExpirationJob() {
    if (cronTask) {
        cronTask.stop();
        console.log('⏹️ Payment expiration cron job stopped');
    }
}

module.exports = {
    initializePaymentExpirationJob,
    stopPaymentExpirationJob,
    checkAndExpirePayments
};
