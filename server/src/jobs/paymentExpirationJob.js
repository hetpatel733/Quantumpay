const cron = require('node-cron');
const mongoose = require('mongoose');
const {
    findMatchingTransfer,
    getSupportedNetworks
} = require('../utils/blockchainTransfers');

/**
 * Payment Expiration Job
 * 1. Checks pending payments that are past the 10-minute expiry window
 * 2. For each expired payment, verifies blockchain for matching transfers
 * 3. If transfer found -> mark as completed
 * 4. If no transfer found -> mark as failed (expired)
 */

let cronTask = null;

// Job statistics
let jobStats = {
    totalRuns: 0,
    totalChecked: 0,
    totalVerified: 0,
    totalExpired: 0,
    lastRun: null,
    lastSuccess: null,
    errors: []
};

function initializePaymentExpirationJob() {
    try {
        // Run every 2 minutes
        cronTask = cron.schedule('*/2 * * * *', async () => {
            await checkAndProcessPayments();
        });

        console.log('🕐 Payment expiration & verification cron job initialized (runs every 2 minutes)');

        // Run immediately on startup
        console.log('▶️ Running initial payment check...\n');
        checkAndProcessPayments();

        return cronTask;
    } catch (error) {
        console.error('❌ Failed to initialize payment expiration job:', error);
        return null;
    }
}

/**
 * Main function that handles both verification and expiration
 */
export default async function checkAndProcessPayments() {
    const startTime = Date.now();
    console.log('\n' + '='.repeat(80));
    console.log(`🔄 [PAYMENT CHECK JOB] Starting at ${new Date().toISOString()}`);
    console.log('='.repeat(80));

    try {
        jobStats.totalRuns++;
        jobStats.lastRun = new Date();

        const Payment = mongoose.model('Payment');
        const DashboardDailyMetric = mongoose.model('DashboardDailyMetric');

        // Calculate time 10 minutes ago
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

        // Find all pending payments created more than 10 minutes ago (expired window)
        const expiredWindowPayments = await Payment.find({
            status: 'pending',
            createdAt: { $lt: tenMinutesAgo }
        });

        const totalExpiredWindow = expiredWindowPayments.length;
        console.log(`📋 Found ${totalExpiredWindow} pending payment(s) past expiry window`);

        if (totalExpiredWindow === 0) {
            console.log('✅ No expired payments to process');
            logJobSummary(startTime, 0, 0, 0, 0);
            return;
        }

        const supportedNetworks = getSupportedNetworks();
        console.log(`🌐 Supported networks for verification: ${supportedNetworks.join(', ')}`);

        let verifiedCount = 0;
        let expiredCount = 0;
        let errorCount = 0;
        let unsupportedCount = 0;

        // Process each expired payment
        for (let i = 0; i < expiredWindowPayments.length; i++) {
            const payment = expiredWindowPayments[i];

            console.log(`\n${'─'.repeat(80)}`);
            console.log(`🔎 [${i + 1}/${totalExpiredWindow}] Processing payment: ${payment.payId}`);
            console.log(`${'─'.repeat(80)}`);
            console.log(`   Amount: ${payment.amountCrypto} ${payment.cryptoType}`);
            console.log(`   Network: ${payment.network}`);
            console.log(`   Wallet: ${payment.walletAddress}`);
            console.log(`   Created: ${payment.createdAt.toISOString()}`);
            console.log(`   Age: ${Math.floor((Date.now() - payment.createdAt.getTime()) / 1000 / 60)} minutes`);

            try {
                // Check if network is supported for verification
                const networkSupported = isNetworkSupported(payment.network, supportedNetworks);

                if (networkSupported) {
                    // Try to verify payment on blockchain first
                    console.log(`\n   🔍 Verifying on blockchain before expiring...`);

                    const verified = await verifyPaymentOnBlockchain(payment, DashboardDailyMetric);

                    if (verified) {
                        verifiedCount++;
                        jobStats.totalVerified++;
                        console.log(`   ✅ Payment VERIFIED and marked as completed!`);
                    } else {
                        // No transfer found, mark as expired
                        await markPaymentAsExpired(payment, DashboardDailyMetric);
                        expiredCount++;
                        jobStats.totalExpired++;
                        console.log(`   ⏰ Payment marked as EXPIRED (no transfer found)`);
                    }
                } else {
                    // Network not supported for verification, just expire
                    console.log(`   ⚠️ Network ${payment.network} not supported for verification`);
                    await markPaymentAsExpired(payment, DashboardDailyMetric);
                    expiredCount++;
                    jobStats.totalExpired++;
                    unsupportedCount++;
                    console.log(`   ⏰ Payment marked as EXPIRED (unsupported network)`);
                }

            } catch (err) {
                console.error(`   ❌ Error processing payment ${payment.payId}:`, err.message);
                errorCount++;

                // Track errors
                jobStats.errors.push({
                    payId: payment.payId,
                    error: err.message,
                    timestamp: new Date()
                });

                // Keep only last 50 errors
                if (jobStats.errors.length > 50) {
                    jobStats.errors = jobStats.errors.slice(-50);
                }

                // Still try to expire the payment even if verification failed
                try {
                    await markPaymentAsExpired(payment, DashboardDailyMetric);
                    expiredCount++;
                    console.log(`   ⏰ Payment marked as EXPIRED (after verification error)`);
                } catch (expireErr) {
                    console.error(`   ❌ Failed to expire payment:`, expireErr.message);
                }
            }
        }

        jobStats.totalChecked += totalExpiredWindow;

        if (verifiedCount > 0) {
            jobStats.lastSuccess = new Date();
        }

        logJobSummary(startTime, totalExpiredWindow, verifiedCount, expiredCount, errorCount);

    } catch (error) {
        console.error('\n' + '='.repeat(80));
        console.error('❌ CRITICAL ERROR IN PAYMENT CHECK JOB');
        console.error('='.repeat(80));
        console.error(`Error: ${error.message}`);
        console.error(`Stack: ${error.stack}`);
        console.error('='.repeat(80) + '\n');

        jobStats.errors.push({
            payId: 'JOB_LEVEL_ERROR',
            error: error.message,
            timestamp: new Date()
        });
    }
}

/**
 * Check if a network is supported for blockchain verification
 */
function isNetworkSupported(network, supportedNetworks) {
    if (!network) return false;

    return supportedNetworks.some(net =>
        net.toUpperCase() === network.toUpperCase() ||
        (net === 'Polygon' && network.toUpperCase() === 'POLYGON') ||
        (net === 'Ethereum' && (network.toUpperCase() === 'ETHEREUM' || network.toUpperCase() === 'ETH')) ||
        (net === 'BSC' && (network.toUpperCase() === 'BSC' || network.toUpperCase() === 'BNB'))
    );
}

/**
 * Map network name to Alchemy network name
 */
function mapToAlchemyNetwork(network) {
    if (!network) return null;

    const networkUpper = network.toUpperCase();
    if (networkUpper === 'POLYGON') return 'Polygon';
    if (networkUpper === 'ETHEREUM' || networkUpper === 'ETH') return 'Ethereum';
    if (networkUpper === 'BSC' || networkUpper === 'BNB') return 'BSC';

    return network; // Return as-is if already correct format
}

/**
 * Verify a payment by checking blockchain for matching transfer
 * @returns {boolean} true if payment was verified and marked as completed
 */
async function verifyPaymentOnBlockchain(payment, DashboardDailyMetric) {
    const alchemyNetwork = mapToAlchemyNetwork(payment.network);

    if (!alchemyNetwork) {
        console.log(`   ⚠️ Could not map network: ${payment.network}`);
        return false;
    }

    console.log(`   Network mapping: ${payment.network} → ${alchemyNetwork}`);
    console.log(`   Searching for: ${payment.amountCrypto} ${payment.cryptoType}`);
    console.log(`   To address: ${payment.walletAddress}`);

    // Search for matching transfer with 2% tolerance
    const match = await findMatchingTransfer(
        alchemyNetwork,
        payment.walletAddress,
        payment.amountCrypto,
        payment.cryptoType,
        payment.createdAt,
        2 // 2% tolerance
    );

    if (match) {
        console.log(`\n   ✅ MATCH FOUND!`);
        console.log(`   Transaction Hash: ${match.hash}`);
        console.log(`   From: ${match.from}`);
        console.log(`   Amount: ${match.value} ${match.asset}`);
        console.log(`   Block: ${match.blockNumber}`);
        console.log(`   Timestamp: ${match.timestamp}`);
        console.log(`   Explorer: ${match.explorerUrl}`);

        // Update payment status to completed
        payment.status = 'completed';
        payment.hash = match.hash;
        payment.completedAt = new Date(match.timestamp);
        await payment.save();

        console.log(`\n   💾 Payment ${payment.payId} marked as COMPLETED`);

        // Update dashboard metrics
        await updateDashboardMetricsForCompletion(payment, DashboardDailyMetric);

        return true;
    }

    console.log(`   ⏳ No matching transfer found on blockchain`);
    return false;
}

/**
 * Mark a payment as expired/failed
 */
async function markPaymentAsExpired(payment, DashboardDailyMetric) {
    payment.status = 'failed';
    payment.failureReason = 'Payment expired - no transaction received within 10 minutes';
    await payment.save();

    // Update daily metrics for expired payment
    await updateDailyMetricsForExpiredPayment(payment, DashboardDailyMetric);
}

/**
 * Update dashboard metrics for a completed payment
 */
async function updateDashboardMetricsForCompletion(payment, DashboardDailyMetric) {
    try {
        console.log(`\n   📊 Updating dashboard metrics for completed payment...`);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

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
                completedCount: 0,
                failedCount: 0,
                pendingCount: 0,
                cryptoVolume: {}
            });
        }

        // Update metrics
        dailyMetric.totalSales = (dailyMetric.totalSales || 0) + (payment.amountUSD || 0);
        dailyMetric.transactionCount = (dailyMetric.transactionCount || 0) + 1;
        dailyMetric.completedCount = (dailyMetric.completedCount || 0) + 1;

        // Update crypto volume
        const cryptoKey = payment.cryptoType || payment.cryptoSymbol || 'UNKNOWN';
        if (!dailyMetric.cryptoVolume) {
            dailyMetric.cryptoVolume = {};
        }
        dailyMetric.cryptoVolume[cryptoKey] = (dailyMetric.cryptoVolume[cryptoKey] || 0) + (payment.amountCrypto || 0);

        await dailyMetric.save();

        console.log(`   ✅ Metrics updated: +$${payment.amountUSD?.toFixed(2) || 0}, completedCount++`);

    } catch (error) {
        console.error(`   ❌ Error updating completion metrics:`, error.message);
    }
}

/**
 * Update daily metrics for expired payment
 */
async function updateDailyMetricsForExpiredPayment(payment, DashboardDailyMetric) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

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
                completedCount: 0,
                failedCount: 0
            });
        }

        dailyMetric.failedCount = (dailyMetric.failedCount || 0) + 1;
        await dailyMetric.save();

        console.log(`   📊 Metrics updated: failedCount++`);

    } catch (error) {
        console.error(`   ❌ Error updating expiration metrics:`, error.message);
    }
}

/**
 * Log job summary
 */
function logJobSummary(startTime, total, verified, expired, errors) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(80));
    console.log('📊 JOB SUMMARY');
    console.log('='.repeat(80));
    console.log(`   Total Processed: ${total}`);
    console.log(`   ✅ Verified (completed): ${verified}`);
    console.log(`   ⏰ Expired (failed): ${expired}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   ⏱️ Duration: ${duration}s`);
    console.log('='.repeat(80));

    console.log('\n📈 OVERALL STATISTICS:');
    console.log(`   Total Runs: ${jobStats.totalRuns}`);
    console.log(`   Total Checked: ${jobStats.totalChecked}`);
    console.log(`   Total Verified: ${jobStats.totalVerified}`);
    console.log(`   Total Expired: ${jobStats.totalExpired}`);
    console.log(`   Last Run: ${jobStats.lastRun?.toISOString()}`);
    console.log(`   Last Verification: ${jobStats.lastSuccess?.toISOString() || 'Never'}`);
    console.log('='.repeat(80) + '\n');
}

function stopPaymentExpirationJob() {
    if (cronTask) {
        cronTask.stop();
        console.log('⏹️ Payment expiration cron job stopped');
    }
}

/**
 * Get job statistics
 */
function getJobStats() {
    return {
        ...jobStats,
        nextRun: jobStats.lastRun
            ? new Date(jobStats.lastRun.getTime() + 2 * 60 * 1000).toISOString()
            : 'Unknown'
    };
}

module.exports = {
    initializePaymentExpirationJob,
    stopPaymentExpirationJob,
    checkAndProcessPayments,
    getJobStats
};
