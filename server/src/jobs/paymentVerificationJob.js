/**
 * Payment Verification Cron Job
 * Automatically checks pending payments against blockchain transfers
 * Runs every 2 minutes to verify incoming cryptocurrency payments
 */

const cron = require('node-cron');
const { Payment } = require('../models/Payment');
const { DashboardDailyMetric } = require('../models/DashboardDailyMetric');
const {
    findMatchingTransfer,
    checkPendingPayments,
    getSupportedNetworks
} = require('../utils/blockchainTransfers');

// Track job statistics
let jobStats = {
    totalRuns: 0,
    totalChecked: 0,
    totalVerified: 0,
    lastRun: null,
    lastSuccess: null,
    errors: []
};

/**
 * Update dashboard metrics for a completed payment
 * @param {Object} payment - Payment object that was just completed
 */
async function updateDashboardMetrics(payment) {
    try {
        //console.log(`\n   📊 Updating dashboard metrics for payment ${payment.payId}...`);

        const paymentDate = new Date(payment.completedAt || new Date());
        const dateKey = paymentDate.toISOString().split('T')[0]; // YYYY-MM-DD

        // Find or create daily metric for this date
        let dailyMetric = await DashboardDailyMetric.findOne({
            userId: payment.userId,
            date: dateKey
        });

        if (!dailyMetric) {
            //console.log(`   📝 Creating new daily metric for ${dateKey}`);
            dailyMetric = new DashboardDailyMetric({
                userId: payment.userId,
                date: dateKey,
                totalSales: 0,
                transactionCount: 0,
                completedCount: 0,
                failedCount: 0,
                pendingCount: 0,
                cryptoVolume: {}
            });
        }

        // Update metrics
        dailyMetric.totalSales += payment.amountUSD || 0;
        dailyMetric.transactionCount += 1;
        dailyMetric.completedCount += 1;

        // Update crypto volume
        const cryptoKey = payment.cryptoType || payment.cryptoSymbol || 'UNKNOWN';
        if (!dailyMetric.cryptoVolume) {
            dailyMetric.cryptoVolume = {};
        }
        dailyMetric.cryptoVolume[cryptoKey] = (dailyMetric.cryptoVolume[cryptoKey] || 0) + (payment.amountCrypto || 0);

        // Save updated metrics
        await dailyMetric.save();

        //console.log(`   ✅ Dashboard metrics updated successfully`);
        //console.log(`      Total Sales: $${dailyMetric.totalSales.toFixed(2)}`);
        //console.log(`      Completed: ${dailyMetric.completedCount}`);
        //console.log(`      ${cryptoKey} Volume: ${dailyMetric.cryptoVolume[cryptoKey]}`);

    } catch (error) {
        console.error(`   ❌ Error updating dashboard metrics:`, error.message);
        console.error(`   Stack:`, error.stack);
        // Don't throw - we still want the payment to be marked as completed
    }
}

/**
 * Main verification function
 */
async function verifyPendingPayments() {
    const startTime = Date.now();
    //console.log('\n' + '='.repeat(80));
    //console.log(`🔄 [PAYMENT VERIFICATION JOB] Starting at ${new Date().toISOString()}`);
    //console.log('='.repeat(80));

    try {
        jobStats.totalRuns++;
        jobStats.lastRun = new Date();

        // Get all pending payments
        const pendingPayments = await Payment.find({ 
            status: 'pending',
            // Only check payments created in the last 24 hours to avoid checking very old payments
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }).sort({ createdAt: -1 });

        const totalPending = pendingPayments.length;
        //console.log(`📋 Found ${totalPending} pending payment(s) to verify`);

        if (totalPending === 0) {
            //console.log('✅ No pending payments to verify');
            //console.log('='.repeat(80) + '\n');
            return;
        }

        // Log payment details for debugging
        pendingPayments.forEach((payment, index) => {
            //console.log(`\n📄 Payment ${index + 1}/${totalPending}:`);
            //console.log(`   PayID: ${payment.payId}`);
            //console.log(`   Amount: ${payment.amountCrypto} ${payment.cryptoType}`);
            //console.log(`   Network: ${payment.network}`);
            //console.log(`   Wallet: ${payment.walletAddress}`);
            //console.log(`   Created: ${payment.createdAt.toISOString()}`);
            //console.log(`   Age: ${Math.floor((Date.now() - payment.createdAt.getTime()) / 1000 / 60)} minutes`);
        });

        const supportedNetworks = getSupportedNetworks();
        //console.log(`\n🌐 Supported networks: ${supportedNetworks.join(', ')}`);

        // Filter payments to only supported networks
        const supportedPayments = pendingPayments.filter(payment => {
            const networkMatch = supportedNetworks.some(net => 
                net.toUpperCase() === payment.network?.toUpperCase() ||
                (net === 'Polygon' && payment.network?.toUpperCase() === 'POLYGON') ||
                (net === 'Ethereum' && payment.network?.toUpperCase() === 'ETH') ||
                (net === 'BSC' && payment.network?.toUpperCase() === 'BNB')
            );
            
            if (!networkMatch) {
                //console.log(`⚠️ Skipping payment ${payment.payId} - unsupported network: ${payment.network}`);
            }
            
            return networkMatch;
        });

        //console.log(`\n🔍 Checking ${supportedPayments.length} payment(s) on supported networks...`);
        jobStats.totalChecked += supportedPayments.length;

        let verifiedCount = 0;
        let failedCount = 0;

        // Check each payment individually for better error handling and logging
        for (let i = 0; i < supportedPayments.length; i++) {
            const payment = supportedPayments[i];
            
            //console.log(`\n${'─'.repeat(80)}`);
            //console.log(`🔎 [${i + 1}/${supportedPayments.length}] Checking payment: ${payment.payId}`);
            //console.log(`${'─'.repeat(80)}`);

            try {
                // Map network names to Alchemy network names
                let alchemyNetwork = payment.network;
                if (payment.network?.toUpperCase() === 'POLYGON') alchemyNetwork = 'Polygon';
                if (payment.network?.toUpperCase() === 'ETHEREUM' || payment.network?.toUpperCase() === 'ETH') alchemyNetwork = 'Ethereum';
                if (payment.network?.toUpperCase() === 'BSC' || payment.network?.toUpperCase() === 'BNB') alchemyNetwork = 'BSC';

                //console.log(`   Network: ${payment.network} → ${alchemyNetwork}`);
                //console.log(`   Searching for: ${payment.amountCrypto} ${payment.cryptoType}`);
                //console.log(`   To address: ${payment.walletAddress}`);
                //console.log(`   Created at: ${payment.createdAt.toISOString()}`);

                // Search for matching transfer
                const match = await findMatchingTransfer(
                    alchemyNetwork,
                    payment.walletAddress,
                    payment.amountCrypto,
                    payment.cryptoType,
                    payment.createdAt,
                    2 // 2% tolerance
                );

                if (match) {
                    //console.log(`\n   ✅ MATCH FOUND!`);
                    //console.log(`   Transaction Hash: ${match.hash}`);
                    //console.log(`   From: ${match.from}`);
                    //console.log(`   Amount: ${match.value} ${match.asset}`);
                    //console.log(`   Block: ${match.blockNumber}`);
                    //console.log(`   Timestamp: ${match.timestamp}`);
                    //console.log(`   Explorer: ${match.explorerUrl}`);

                    // Update payment status
                    payment.status = 'completed';
                    payment.hash = match.hash;
                    payment.completedAt = new Date(match.timestamp);
                    await payment.save();

                    //console.log(`\n   💾 Payment ${payment.payId} marked as COMPLETED`);

                    // Update dashboard metrics
                    await updateDashboardMetrics(payment);

                    verifiedCount++;
                    jobStats.totalVerified++;
                } else {
                    //console.log(`\n   ⏳ No matching transfer found yet for ${payment.payId}`);
                    //console.log(`   Payment will be checked again in the next run`);
                }

            } catch (error) {
                failedCount++;
                console.error(`\n   ❌ ERROR checking payment ${payment.payId}:`);
                console.error(`   Error: ${error.message}`);
                console.error(`   Stack: ${error.stack}`);
                
                // Track errors
                jobStats.errors.push({
                    payId: payment.payId,
                    error: error.message,
                    timestamp: new Date()
                });

                // Keep only last 50 errors
                if (jobStats.errors.length > 50) {
                    jobStats.errors = jobStats.errors.slice(-50);
                }
            }
        }

        // Summary
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        //console.log('\n' + '='.repeat(80));
        //console.log('📊 JOB SUMMARY');
        //console.log('='.repeat(80));
        //console.log(`   Total Pending: ${totalPending}`);
        //console.log(`   Checked: ${supportedPayments.length}`);
        //console.log(`   ✅ Verified: ${verifiedCount}`);
        //console.log(`   ⏳ Still Pending: ${supportedPayments.length - verifiedCount}`);
        //console.log(`   ❌ Errors: ${failedCount}`);
        //console.log(`   ⏱️ Duration: ${duration}s`);
        //console.log('='.repeat(80));

        if (verifiedCount > 0) {
            jobStats.lastSuccess = new Date();
        }

        // Log overall statistics
        //console.log('\n📈 OVERALL STATISTICS:');
        //console.log(`   Total Runs: ${jobStats.totalRuns}`);
        //console.log(`   Total Checked: ${jobStats.totalChecked}`);
        //console.log(`   Total Verified: ${jobStats.totalVerified}`);
        //console.log(`   Last Run: ${jobStats.lastRun?.toISOString()}`);
        //console.log(`   Last Success: ${jobStats.lastSuccess?.toISOString() || 'Never'}`);
        //console.log(`   Recent Errors: ${jobStats.errors.length}`);
        
        if (jobStats.errors.length > 0) {
            //console.log(`\n⚠️ Recent Errors (last ${Math.min(5, jobStats.errors.length)}):`);
            jobStats.errors.slice(-5).forEach((err, idx) => {
                //console.log(`   ${idx + 1}. [${err.timestamp.toISOString()}] PayID: ${err.payId}`);
                //console.log(`      Error: ${err.error}`);
            });
        }

        //console.log('\n' + '='.repeat(80) + '\n');

    } catch (error) {
        console.error('\n' + '='.repeat(80));
        console.error('❌ CRITICAL ERROR IN PAYMENT VERIFICATION JOB');
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
 * Initialize the payment verification cron job
 * Runs every 2 minutes
 */
function initializePaymentVerificationJob() {
    //console.log('\n' + '🚀'.repeat(40));
    //console.log('🚀 INITIALIZING PAYMENT VERIFICATION JOB');
    //console.log('🚀'.repeat(40));
    //console.log('📅 Schedule: Every 2 minutes');
    //console.log('🌐 Supported Networks: Polygon, Ethereum, BSC');
    //console.log('🔍 Will check pending payments for matching blockchain transfers');
    //console.log('🚀'.repeat(40) + '\n');

    // Run immediately on startup
    //console.log('▶️ Running initial verification check...\n');
    verifyPendingPayments();

    // Schedule to run every 2 minutes
    const job = cron.schedule('*/2 * * * *', () => {
        verifyPendingPayments();
    });

    //console.log('✅ Payment verification job scheduled successfully\n');

    return job;
}

/**
 * Get job statistics
 * @returns {Object} Job statistics
 */
function getJobStats() {
    return {
        ...jobStats,
        nextRun: jobStats.lastRun 
            ? new Date(jobStats.lastRun.getTime() + 2 * 60 * 1000).toISOString()
            : 'Unknown'
    };
}

/**
 * Manual trigger for testing
 */
async function manualVerification() {
    //console.log('\n🔧 MANUAL VERIFICATION TRIGGERED\n');
    await verifyPendingPayments();
}

module.exports = {
    initializePaymentVerificationJob,
    verifyPendingPayments,
    getJobStats,
    manualVerification
};
