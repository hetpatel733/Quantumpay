const express = require('express');
const router = express.Router();
const { PaymentConfiguration } = require('../models/PaymentConfiguration');
const { authenticateUser } = require('../services/auth');

// Supported cryptocurrencies with their network options
const SUPPORTED_CRYPTOS = {
    'BTC': {
        name: 'Bitcoin',
        symbol: 'BTC',
        networks: ['Bitcoin'],
        defaultNetwork: 'Bitcoin',
        logo: '/images/Coins/BTC.webp'
    },
    'ETH': {
        name: 'Ethereum',
        symbol: 'ETH',
        networks: ['Ethereum'],
        defaultNetwork: 'Ethereum',
        logo: '/images/Coins/ETH.webp'
    },
    'USDT': {
        name: 'Tether USD',
        symbol: 'USDT',
        networks: ['Polygon', 'Ethereum', 'BSC', 'Tron', 'Solana'],
        defaultNetwork: 'Polygon',
        logo: '/images/Coins/USDT.webp'
    },
    'USDC': {
        name: 'USD Coin',
        symbol: 'USDC',
        networks: ['Polygon', 'Ethereum', 'BSC', 'Solana'],
        defaultNetwork: 'Polygon',
        logo: '/images/Coins/USDC.png'
    },
    'MATIC': {
        name: 'Polygon',
        symbol: 'MATIC',
        networks: ['Polygon'],
        defaultNetwork: 'Polygon',
        logo: '/images/Coins/MATIC.webp'
    },
    'SOL': {
        name: 'Solana',
        symbol: 'SOL',
        networks: ['Solana'],
        defaultNetwork: 'Solana',
        logo: '/images/Coins/SOL.webp'
    }
};

// Network configurations
const NETWORK_CONFIGS = {
    'Bitcoin': {
        chainId: null,
        decimals: 8,
        explorerUrl: 'https://blockstream.info',
        nativeCoin: 'BTC'
    },
    'Ethereum': {
        chainId: 1,
        decimals: 18,
        explorerUrl: 'https://etherscan.io',
        nativeCoin: 'ETH',
        contractAddresses: {
            'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            'USDC': '0xA0b86a33E6c8d8e7aB1C3F0F8D0c5E6f8d4eC7b3'
        }
    },
    'Polygon': {
        chainId: 137,
        decimals: 18,
        explorerUrl: 'https://polygonscan.com',
        nativeCoin: 'MATIC',
        contractAddresses: {
            'USDT': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
            'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
        }
    },
    'BSC': {
        chainId: 56,
        decimals: 18,
        explorerUrl: 'https://bscscan.com',
        nativeCoin: 'BNB',
        contractAddresses: {
            'USDT': '0x55d398326f99059fF775485246999027B3197955',
            'USDC': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
        }
    },
    'Tron': {
        chainId: null,
        decimals: 6,
        explorerUrl: 'https://tronscan.org',
        nativeCoin: 'TRX',
        contractAddresses: {
            'USDT': 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
            'USDC': 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8'
        }
    },
    'Solana': {
        chainId: null,
        decimals: 9,
        explorerUrl: 'https://solscan.io',
        nativeCoin: 'SOL',
        contractAddresses: {
            'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
            'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
        }
    }
};

// Get supported cryptocurrencies and networks
router.get('/supported', (req, res) => {
    try {
        res.status(200).json({
            success: true,
            cryptos: SUPPORTED_CRYPTOS,
            networks: NETWORK_CONFIGS
        });
    } catch (error) {
        console.error('❌ Error fetching supported cryptos:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get or create payment configuration for authenticated business
router.get('/', authenticateUser, async (req, res) => {
    try {
        const businessEmail = req.user.email;
        console.log('🔍 Fetching payment configuration for:', businessEmail);

        let config = await PaymentConfiguration.findOne({ businessEmail });

        // If no configuration exists, create one with no currencies enabled
        if (!config) {
            console.log('📝 Creating new payment configuration for:', businessEmail);

            // Initialize all supported cryptos as disabled
            const cryptoConfigurations = [];
            for (const [cryptoType, cryptoData] of Object.entries(SUPPORTED_CRYPTOS)) {
                for (const network of cryptoData.networks) {
                    const networkConfig = NETWORK_CONFIGS[network];
                    cryptoConfigurations.push({
                        coinType: cryptoType,
                        network: network,
                        enabled: false,
                        address: '',
                        label: `${cryptoType} on ${network}`,
                        isDefault: network === cryptoData.defaultNetwork,
                        networkConfig: {
                            chainId: networkConfig.chainId,
                            decimals: networkConfig.decimals,
                            explorerUrl: networkConfig.explorerUrl,
                            contractAddress: networkConfig.contractAddresses?.[cryptoType] || null
                        }
                    });
                }
            }

            config = new PaymentConfiguration({
                businessEmail,
                cryptoConfigurations,
                apiProviders: [],
                settings: {
                    minAmount: 1,
                    maxAmount: 100000,
                    verificationTimeout: 1800000,
                    requireCustomerInfo: true,
                    notifyOnPayment: true,
                    notifyOnComplete: true
                },
                isActive: true
            });

            await config.save();
            console.log('✅ Payment configuration created for:', businessEmail);
        }

        res.status(200).json({
            success: true,
            config: {
                businessEmail: config.businessEmail,
                cryptoConfigurations: config.cryptoConfigurations,
                apiProviders: config.apiProviders,
                settings: config.settings,
                isActive: config.isActive,
                createdAt: config.createdAt,
                updatedAt: config.updatedAt
            }
        });
    } catch (error) {
        console.error('❌ Error fetching payment configuration:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// Update cryptocurrency configuration (enable/disable/update address)
router.put('/crypto/:cryptoType/:network', authenticateUser, async (req, res) => {
    try {
        const businessEmail = req.user.email;
        const { cryptoType, network } = req.params;
        const { enabled, address, label } = req.body;

        console.log('🔧 Updating crypto config:', {
            businessEmail,
            cryptoType,
            network,
            enabled,
            address: address?.substring(0, 10) + '...'
        });

        // Validate input
        if (!SUPPORTED_CRYPTOS[cryptoType]) {
            return res.status(400).json({
                success: false,
                message: `Unsupported cryptocurrency: ${cryptoType}`
            });
        }

        if (!SUPPORTED_CRYPTOS[cryptoType].networks.includes(network)) {
            return res.status(400).json({
                success: false,
                message: `Network ${network} not supported for ${cryptoType}`
            });
        }

        // Validate address if enabling
        if (enabled && (!address || address.trim() === '')) {
            return res.status(400).json({
                success: false,
                message: 'Wallet address is required when enabling cryptocurrency'
            });
        }

        // Validate address format (basic check)
        if (enabled && address) {
            // Basic validation - at least 20 characters and alphanumeric
            if (address.length < 20 || !/^[a-zA-Z0-9]{20,}$/.test(address)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid wallet address format'
                });
            }
        }

        const config = await PaymentConfiguration.findOne({ businessEmail });

        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'Payment configuration not found'
            });
        }

        // Find and update the specific crypto configuration
        const cryptoIndex = config.cryptoConfigurations.findIndex(
            c => c.coinType === cryptoType && c.network === network
        );

        if (cryptoIndex === -1) {
            return res.status(404).json({
                success: false,
                message: `Configuration not found for ${cryptoType} on ${network}`
            });
        }

        // Update the configuration
        config.cryptoConfigurations[cryptoIndex].enabled = enabled;
        if (address) {
            config.cryptoConfigurations[cryptoIndex].address = address;
        }
        if (label) {
            config.cryptoConfigurations[cryptoIndex].label = label;
        }
        config.cryptoConfigurations[cryptoIndex].updatedAt = new Date();

        await config.save();

        console.log('✅ Crypto configuration updated successfully');

        res.status(200).json({
            success: true,
            message: `${cryptoType} on ${network} configuration updated`,
            crypto: config.cryptoConfigurations[cryptoIndex]
        });
    } catch (error) {
        console.error('❌ Error updating crypto configuration:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// Bulk update multiple cryptocurrency configurations
router.post('/bulk-update', authenticateUser, async (req, res) => {
    try {
        const businessEmail = req.user.email;
        const { updates } = req.body; // Array of { cryptoType, network, enabled, address }

        console.log('🔧 Bulk updating crypto configurations');

        if (!Array.isArray(updates)) {
            return res.status(400).json({
                success: false,
                message: 'Updates must be an array'
            });
        }

        const config = await PaymentConfiguration.findOne({ businessEmail });

        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'Payment configuration not found'
            });
        }

        // Validate all updates first
        for (const update of updates) {
            const { cryptoType, network, enabled, address } = update;

            if (!SUPPORTED_CRYPTOS[cryptoType]) {
                return res.status(400).json({
                    success: false,
                    message: `Unsupported cryptocurrency: ${cryptoType}`
                });
            }

            if (!SUPPORTED_CRYPTOS[cryptoType].networks.includes(network)) {
                return res.status(400).json({
                    success: false,
                    message: `Network ${network} not supported for ${cryptoType}`
                });
            }

            if (enabled && (!address || address.trim() === '')) {
                return res.status(400).json({
                    success: false,
                    message: `Wallet address required for ${cryptoType} on ${network}`
                });
            }

            if (enabled && address && address.length < 20) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid wallet address for ${cryptoType} on ${network}`
                });
            }
        }

        // Apply all updates
        for (const update of updates) {
            const { cryptoType, network, enabled, address, label } = update;

            const cryptoIndex = config.cryptoConfigurations.findIndex(
                c => c.coinType === cryptoType && c.network === network
            );

            if (cryptoIndex !== -1) {
                config.cryptoConfigurations[cryptoIndex].enabled = enabled;
                if (address) {
                    config.cryptoConfigurations[cryptoIndex].address = address;
                }
                if (label) {
                    config.cryptoConfigurations[cryptoIndex].label = label;
                }
                config.cryptoConfigurations[cryptoIndex].updatedAt = new Date();
            }
        }

        await config.save();

        console.log('✅ Bulk update completed successfully');

        res.status(200).json({
            success: true,
            message: 'Configurations updated successfully',
            config
        });
    } catch (error) {
        console.error('❌ Error in bulk update:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// Update payment settings
router.put('/settings', authenticateUser, async (req, res) => {
    try {
        const businessEmail = req.user.email;
        const { settings } = req.body;

        console.log('🔧 Updating payment settings');

        const config = await PaymentConfiguration.findOne({ businessEmail });

        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'Payment configuration not found'
            });
        }

        // Update allowed settings
        if (settings.minAmount !== undefined) config.settings.minAmount = settings.minAmount;
        if (settings.maxAmount !== undefined) config.settings.maxAmount = settings.maxAmount;
        if (settings.verificationTimeout !== undefined) config.settings.verificationTimeout = settings.verificationTimeout;
        if (settings.requireCustomerInfo !== undefined) config.settings.requireCustomerInfo = settings.requireCustomerInfo;
        if (settings.notifyOnPayment !== undefined) config.settings.notifyOnPayment = settings.notifyOnPayment;
        if (settings.notifyOnComplete !== undefined) config.settings.notifyOnComplete = settings.notifyOnComplete;

        await config.save();

        console.log('✅ Payment settings updated');

        res.status(200).json({
            success: true,
            message: 'Settings updated successfully',
            settings: config.settings
        });
    } catch (error) {
        console.error('❌ Error updating settings:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// Get enabled currencies summary
router.get('/enabled-summary', authenticateUser, async (req, res) => {
    try {
        const businessEmail = req.user.email;

        const config = await PaymentConfiguration.findOne({ businessEmail });

        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'Payment configuration not found'
            });
        }

        // Get enabled cryptos grouped by crypto type
        const enabledByCrypto = {};
        config.cryptoConfigurations.forEach(crypto => {
            if (crypto.enabled) {
                if (!enabledByCrypto[crypto.coinType]) {
                    enabledByCrypto[crypto.coinType] = [];
                }
                enabledByCrypto[crypto.coinType].push({
                    network: crypto.network,
                    address: crypto.address,
                    label: crypto.label
                });
            }
        });

        res.status(200).json({
            success: true,
            totalEnabled: config.cryptoConfigurations.filter(c => c.enabled).length,
            enabledByCrypto
        });
    } catch (error) {
        console.error('❌ Error fetching enabled summary:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

module.exports = router;
