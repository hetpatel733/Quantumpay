const { Payment } = require('../models/Payment');
const { Product } = require('../models/Product');
const { DashboardDailyMetric } = require('../models/DashboardDailyMetric');
const { checkAndExpirePayments } = require('../jobs/paymentExpirationJob');
const { verifyPendingPayments } = require('../jobs/paymentVerificationJob');

// GET ALL PAYMENTS FOR ADMIN
async function getAllPaymentsAdmin(req, res) {
    try {
        console.log('📋 Admin: Fetching all payments');

        const payments = await Payment.find()
            .sort({ createdAt: -1 })
            .limit(100);

        return res.status(200).json({
            success: true,
            payments
        });

    } catch (error) {
        console.error('❌ Admin get payments error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch payments'
        });
    }
}

// APPROVE PAYMENT
async function approvePayment(req, res) {
    try {
        const { payId } = req.params;
        const { hash } = req.body;

        console.log(`✅ Admin: Approving payment ${payId}`);

        // Find payment
        const payment = await Payment.findOne({ payId });
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        if (payment.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Payment already completed'
            });
        }

        // Update payment status
        payment.status = 'completed';
        payment.completedAt = new Date();
        if (hash) payment.hash = hash;
        await payment.save();

        // Update product sales metrics
        await updateProductMetrics(payment);

        // Update daily metrics
        await updateDailyMetrics(payment);

        console.log(`✅ Payment ${payId} approved and metrics updated`);

        return res.status(200).json({
            success: true,
            message: 'Payment approved successfully',
            payment
        });

    } catch (error) {
        console.error('❌ Admin approve payment error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to approve payment'
        });
    }
}

// REJECT PAYMENT
async function rejectPayment(req, res) {
    try {
        const { payId } = req.params;
        const { reason } = req.body;

        console.log(`❌ Admin: Rejecting payment ${payId}`);

        const payment = await Payment.findOne({ payId });
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Can only reject pending payments'
            });
        }

        payment.status = 'failed';
        payment.failureReason = reason || 'Rejected by admin';
        await payment.save();

        // ✅ FIX: Update daily metrics when payment is rejected
        await updateDailyMetrics(payment);

        console.log(`❌ Payment ${payId} rejected and metrics updated`);

        return res.status(200).json({
            success: true,
            message: 'Payment rejected',
            payment
        });

    } catch (error) {
        console.error('❌ Admin reject payment error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to reject payment'
        });
    }
}

// UPDATE PRODUCT METRICS
async function updateProductMetrics(payment) {
    try {
        const product = await Product.findOne({ productId: payment.productId });
        if (product) {
            // Increment sales count
            product.salesCount = (product.salesCount || 0) + 1;
            
            // Update total volume
            product.totalVolume = (product.totalVolume || 0) + payment.amountUSD;
            
            await product.save();
            console.log(`📊 Product ${product.productId} updated: Sales: ${product.salesCount}, Volume: $${product.totalVolume}`);
        } else {
            console.warn(`⚠️ Product not found for productId: ${payment.productId}`);
        }
    } catch (error) {
        console.error('❌ Update product metrics error:', error);
    }
}

// UPDATE DAILY METRICS
async function updateDailyMetrics(payment) {
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
                volume: {}
            });
        }

        // Update metrics
        dailyMetric.totalSales = (dailyMetric.totalSales || 0) + (payment.amountUSD || 0);
        dailyMetric.transactionCount = (dailyMetric.transactionCount || 0) + 1;

        // Update status counts - REMOVED pending count tracking
        if (payment.status === 'completed') {
            dailyMetric.completedCount = (dailyMetric.completedCount || 0) + 1;
        } else if (payment.status === 'failed') {
            dailyMetric.failedCount = (dailyMetric.failedCount || 0) + 1;
        }
        // Note: We don't track 'pending' in daily metrics anymore since it's real-time

        // Store USD value instead of crypto amount for proper distribution
        const cryptoType = payment.cryptoType || payment.cryptoSymbol || 'UNKNOWN';
        const usdValue = Number(payment.amountUSD || 0);

        if (!dailyMetric.volume) {
            dailyMetric.volume = {};
        }

        // If Mongoose Map instance, use .get/.set
        if (typeof dailyMetric.volume.get === 'function') {
            const prev = Number(dailyMetric.volume.get(cryptoType) || 0);
            dailyMetric.volume.set(cryptoType, prev + usdValue);
        } else {
            // plain object fallback
            dailyMetric.volume[cryptoType] = (Number(dailyMetric.volume[cryptoType] || 0) + usdValue);
        }

        await dailyMetric.save();

        console.log(`📊 Daily metrics updated for ${today.toDateString()}: ${cryptoType} += $${usdValue.toFixed(2)} USD`);

    } catch (error) {
        console.error('❌ Update daily metrics error:', error);
    }
}

// MANUAL CRON JOB TRIGGER
async function triggerManualCronJob(req, res) {
    try {
        console.log('🔧 Admin: Manually triggering payment verification & expiration jobs');

        const results = {
            verification: { success: false, error: null },
            expiration: { success: false, error: null }
        };

        // Run verification job
        try {
            console.log('\n📍 Running payment verification job...');
            await verifyPendingPayments();
            results.verification.success = true;
            console.log('✅ Verification job completed successfully');
        } catch (error) {
            console.error('❌ Verification job error:', error.message);
            results.verification.error = error.message;
        }

        // Run expiration job
        try {
            console.log('\n📍 Running payment expiration job...');
            await checkAndExpirePayments();
            results.expiration.success = true;
            console.log('✅ Expiration job completed successfully');
        } catch (error) {
            console.error('❌ Expiration job error:', error.message);
            results.expiration.error = error.message;
        }

        // Determine overall success
        const allSuccess = results.verification.success && results.expiration.success;
        const anySuccess = results.verification.success || results.expiration.success;

        if (allSuccess) {
            return res.status(200).json({
                success: true,
                message: 'Both verification and expiration jobs executed successfully',
                details: results
            });
        } else if (anySuccess) {
            return res.status(207).json({
                success: true,
                message: 'Jobs executed with partial success',
                details: results
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Both jobs failed to execute',
                details: results
            });
        }

    } catch (error) {
        console.error('❌ Admin manual cron job error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to execute payment jobs',
            error: error.message
        });
    }
}

module.exports = {
    getAllPaymentsAdmin,
    approvePayment,
    rejectPayment,
    triggerManualCronJob
};
