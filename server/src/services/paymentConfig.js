const { PaymentConfiguration } = require('../models/PaymentConfiguration');
const { User } = require('../models/User');

// GET payment configuration
async function getPaymentConfig(req, res) {
    try {
        const { userId } = req.params;

        //console.log(`📋 Getting payment config for user: ${userId}`);

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID required'
            });
        }

        // Find payment configuration
        let config = await PaymentConfiguration.findOne({ userId });

        // If no config exists, create one
        if (!config) {
            //console.log('No config found, creating new one');
            config = new PaymentConfiguration({
                userId,
                wallets: {}
            });
            await config.save();
        }

        //console.log(`✅ Payment config retrieved`);

        return res.status(200).json({
            success: true,
            config: {
                userId: config.userId,
                wallets: Object.fromEntries(config.wallets || new Map())
            }
        });

    } catch (error) {
        console.error('❌ Get payment config error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get payment configuration'
        });
    }
}

// UPDATE payment configuration
async function updatePaymentConfig(req, res) {
    try {
        const { userId } = req.params;
        const { wallets } = req.body;

        //console.log(`💰 Updating payment config for user: ${userId}`);

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID required'
            });
        }

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Find or create payment configuration
        let config = await PaymentConfiguration.findOne({ userId });

        if (!config) {
            config = new PaymentConfiguration({
                userId,
                wallets: wallets || {}
            });
        } else {
            // Update wallets
            if (wallets) {
                config.wallets = new Map(Object.entries(wallets));
            }
        }

        await config.save();
        //console.log(`✅ Payment config updated for: ${user.email}`);

        return res.status(200).json({
            success: true,
            message: 'Payment configuration updated successfully',
            config: {
                userId: config.userId,
                wallets: Object.fromEntries(config.wallets || new Map())
            }
        });

    } catch (error) {
        console.error('❌ Update payment config error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update payment configuration'
        });
    }
}

// UPDATE single wallet address
async function updateWalletAddress(req, res) {
    try {
        const { userId } = req.params;
        const { currency, address } = req.body;

        //console.log(`🪙 Updating wallet for ${currency}: ${userId}`);

        if (!userId || !currency) {
            return res.status(400).json({
                success: false,
                message: 'User ID and currency are required'
            });
        }

        // Find or create payment configuration
        let config = await PaymentConfiguration.findOne({ userId });

        if (!config) {
            config = new PaymentConfiguration({
                userId,
                wallets: new Map()
            });
        }

        // Update specific wallet
        if (address && address.trim()) {
            config.wallets.set(currency, address.trim());
        } else {
            // Remove wallet if address is empty
            config.wallets.delete(currency);
        }

        await config.save();
        //console.log(`✅ Wallet updated for ${currency}`);

        return res.status(200).json({
            success: true,
            message: `${currency} wallet updated successfully`,
            config: {
                userId: config.userId,
                wallets: Object.fromEntries(config.wallets || new Map())
            }
        });

    } catch (error) {
        console.error('❌ Update wallet error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update wallet address'
        });
    }
}

module.exports = {
    getPaymentConfig,
    updatePaymentConfig,
    updateWalletAddress
};
