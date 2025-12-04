const { User } = require("../models/User");
const { Notification } = require("../models/Notification");
const { BusinessAPI } = require("../models/BusinessAPI");
const { PaymentConfiguration } = require("../models/PaymentConfiguration");
const { DashboardDailyMetric } = require("../models/DashboardDailyMetric");
const crypto = require('crypto');
const { initializeBusinessMetrics } = require('./dashboardMetricsService');

// Function to create default payment configurations for business users
const createDefaultPaymentConfigurations = async (businessEmail) => {
    try {
        const defaultCryptoConfigs = [
            // USDT configurations for multiple networks
            {
                coinType: 'USDT',
                enabled: false,
                address: '',
                label: 'USDT on Polygon',
                network: 'Polygon',
                isDefault: false,
                networkConfig: {
                    contractAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
                    decimals: 6,
                    chainId: 137,
                    explorerUrl: 'https://polygonscan.com'
                }
            },
            {
                coinType: 'USDT',
                enabled: false,
                address: '',
                label: 'USDT on Ethereum',
                network: 'Ethereum',
                isDefault: false,
                networkConfig: {
                    contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                    decimals: 6,
                    chainId: 1,
                    explorerUrl: 'https://etherscan.io'
                }
            },
            {
                coinType: 'USDT',
                enabled: false,
                address: '',
                label: 'USDT on BSC',
                network: 'BSC',
                isDefault: false,
                networkConfig: {
                    contractAddress: '0x55d398326f99059fF775485246999027B3197955',
                    decimals: 18,
                    chainId: 56,
                    explorerUrl: 'https://bscscan.com'
                }
            },
            // USDC configurations for multiple networks
            {
                coinType: 'USDC',
                enabled: false,
                address: '',
                label: 'USDC on Polygon',
                network: 'Polygon',
                isDefault: false,
                networkConfig: {
                    contractAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                    decimals: 6,
                    chainId: 137,
                    explorerUrl: 'https://polygonscan.com'
                }
            },
            {
                coinType: 'USDC',
                enabled: false,
                address: '',
                label: 'USDC on Ethereum',
                network: 'Ethereum',
                isDefault: false,
                networkConfig: {
                    contractAddress: '0xA0b86a33E6c8d8e7aB1C3F0F8D0c5E6f8d4eC7b3',
                    decimals: 6,
                    chainId: 1,
                    explorerUrl: 'https://etherscan.io'
                }
            },
            {
                coinType: 'USDC',
                enabled: false,
                address: '',
                label: 'USDC on BSC',
                network: 'BSC',
                isDefault: false,
                networkConfig: {
                    contractAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
                    decimals: 18,
                    chainId: 56,
                    explorerUrl: 'https://bscscan.com'
                }
            },
            // Bitcoin
            {
                coinType: 'BTC',
                enabled: false,
                address: '',
                label: 'Bitcoin',
                network: 'Bitcoin',
                isDefault: false,
                networkConfig: {
                    contractAddress: '',
                    decimals: 8,
                    chainId: null,
                    explorerUrl: 'https://blockstream.info'
                }
            },
            // Ethereum
            {
                coinType: 'ETH',
                enabled: false,
                address: '',
                label: 'Ethereum',
                network: 'Ethereum',
                isDefault: false,
                networkConfig: {
                    contractAddress: '',
                    decimals: 18,
                    chainId: 1,
                    explorerUrl: 'https://etherscan.io'
                }
            }
        ];

        // Default API providers configuration - unified approach
        const defaultApiProviders = [
            {
                name: 'Etherscan',
                apiKey: process.env.ETHERSCAN_API_KEY || 'Y1EGDU1IS7CK8YN2MFFAGY75KWXZMP94C2',
                network: 'EVM', // Unified for all EVM chains
                baseUrl: 'https://api.etherscan.io/v2/api',
                isActive: true,
                rateLimit: {
                    requestsPerSecond: 5,
                    requestsPerDay: 100000
                },
                supportedChains: ['Ethereum', 'Polygon', 'BSC']
            },
            {
                name: 'Blockstream',
                apiKey: 'not-required', // Blockstream API doesn't require API key for basic usage
                network: 'Bitcoin',
                baseUrl: 'https://blockstream.info/api',
                isActive: true,
                rateLimit: {
                    requestsPerSecond: 10,
                    requestsPerDay: 1000000
                }
            },
            {
                name: 'Solscan',
                apiKey: process.env.SOLSCAN_API_KEY || 'YourSolscanAPIKey',
                network: 'Solana',
                baseUrl: 'https://api.solscan.io',
                isActive: true,
                rateLimit: {
                    requestsPerSecond: 5,
                    requestsPerDay: 100000
                }
            }
        ];

        const paymentConfig = new PaymentConfiguration({
            businessEmail,
            cryptoConfigurations: defaultCryptoConfigs,
            apiProviders: defaultApiProviders,
            conversionSettings: {
                autoConvert: false,
                baseCurrency: 'USD',
                conversionRate: 'real-time',
                slippageTolerance: 1.0
            },
            transactionLimits: {
                minAmount: 10,
                maxAmount: 50000,
                dailyLimit: 100000,
                monthlyLimit: 1000000
            }
        });

        await paymentConfig.save();
        console.log('✅ Default payment configuration created for:', businessEmail);
    } catch (error) {
        console.error('❌ Error creating default payment configuration:', error);
        // Don't throw error to prevent signup failure
    }
};

// Function to create welcome notification for any user
const createWelcomeNotification = async (businessEmail, userType) => {
    try {
        const message = userType === 'business' 
            ? 'Welcome to QuantumPay! Your business account has been successfully created. Start by configuring your payment settings and creating your first order.'
            : 'Welcome to QuantumPay! Your personal account has been successfully created. Explore our cryptocurrency payment solutions.';

        // Check if notification document exists for this user
        let userNotifications = await Notification.findOne({ businessEmail });
        
        if (!userNotifications) {
            // Create new notification document
            userNotifications = new Notification({
                businessEmail,
                notifications: [],
                unreadCount: 0
            });
        }

        // Add welcome notification
        await userNotifications.addNotification({
            message,
            orderId: 'SYSTEM-WELCOME',
            type: 'welcome',
            isRead: false,
            priority: 'high',
            metadata: {
                source: 'system',
                action: 'signup_complete',
                userType
            }
        });

        console.log('✅ Welcome notification created for:', businessEmail);
        return userNotifications;
    } catch (error) {
        console.error('❌ Error creating welcome notification:', error);
        console.error('Error details:', error.message);
        // Don't throw error to prevent signup failure
        return null;
    }
};

// Function to create additional setup notifications for business users
const createSetupNotifications = async (businessEmail) => {
    try {
        let userNotifications = await Notification.findOne({ businessEmail });
        
        if (!userNotifications) {
            userNotifications = new Notification({
                businessEmail,
                notifications: [],
                unreadCount: 0
            });
        }

        const setupNotificationData = [
            {
                message: 'Next step: Configure your cryptocurrency wallet addresses to start accepting payments.',
                orderId: 'SYSTEM-SETUP-CONFIG',
                type: 'system',
                isRead: false,
                priority: 'medium',
                metadata: {
                    source: 'system',
                    action: 'setup_payment_config'
                }
            },
            {
                message: 'Create your first product to start accepting crypto payments from customers.',
                orderId: 'SYSTEM-SETUP-PRODUCTS',
                type: 'system',
                isRead: false,
                priority: 'medium',
                metadata: {
                    source: 'system',
                    action: 'setup_products'
                }
            }
        ];

        for (const notificationData of setupNotificationData) {
            await userNotifications.addNotification(notificationData);
        }
        
        console.log('✅ All setup notifications created for:', businessEmail);
    } catch (error) {
        console.error('❌ Error creating setup notifications:', error);
        // Don't throw error to prevent signup failure
    }
};

// Function to create default notification settings for any user
const createDefaultNotificationSettings = async (businessEmail) => {
    try {
        const notificationSettings = new NotificationSettings({
            businessEmail,
            emailNotifications: {
                paymentReceived: false,
                paymentFailed: false,
                dailySummary: false,
                weeklySummary: false,
                securityAlerts: false,
                systemUpdates: false,
                marketingEmails: false
            },
            pushNotifications: {
                enabled: false,
                paymentAlerts: false,
                securityAlerts: false,
                systemAlerts: false
            }
        });

        await notificationSettings.save();
        console.log('✅ Default notification settings created for:', businessEmail);
    } catch (error) {
        console.error('❌ Error creating default notification settings:', error);
        // Don't throw error to prevent signup failure
    }
};

// Function to create default API key for business users
const createDefaultApiKey = async (businessEmail) => {
    try {
        // Generate unique API key and secret
        const apiKey = `qp_${crypto.randomBytes(16).toString('hex')}`;
        const apiSecret = `qpsec_${crypto.randomBytes(32).toString('hex')}`;

        const defaultApiKey = new BusinessAPI({
            businessEmail,
            label: 'Default API Key',
            key: apiKey,
            secret: apiSecret,
            permissions: ['read', 'write'],
            isActive: true,
            usageCount: 0,
            lastUsed: null
        });

        await defaultApiKey.save();
        console.log('✅ Default API key created for:', businessEmail);
        return defaultApiKey;
    } catch (error) {
        console.error('❌ Error creating default API key:', error);
        // Don't throw error to prevent signup failure
        return null;
    }
};

// Function to create initial dashboard metrics for new users
const createInitialDashboardMetrics = async (businessEmail, userType) => {
    try {
        // Only create dashboard metrics for business users
        if (userType !== 'business') {
            return;
        }

        await initializeBusinessMetrics(businessEmail);
        console.log('✅ Initial dashboard metrics created for:', businessEmail);
    } catch (error) {
        console.error('❌ Error creating initial dashboard metrics:', error);
        // Don't throw error to prevent signup failure
    }
};

const signup = async (req, res, app) => {
    try {
        let verified = false;
        const { name, email, password, type, businessName } = req.body;

        console.log('🚀 Signup attempt for:', email, 'Type:', type);

        const emailExists = await User.findOne({ email });

        if (emailExists) {
            console.log('❌ Email already exists:', email);
            return res.status(409).json({
                success: false,
                message: "Email already in use"
            });
        } else {
            // Normalize the type field - handle both "Business"/"Personal" and "business"/"customer"
            let normalizedType = 'customer'; // default
            if (type) {
                if (type.toLowerCase() === 'business' || type.toLowerCase() === 'b') {
                    normalizedType = 'business';
                } else if (type.toLowerCase() === 'personal' || type.toLowerCase() === 'customer') {
                    normalizedType = 'customer';
                }
            }

            console.log('📝 Creating user with type:', normalizedType);

            const registerdata = new User({
                name, 
                email, 
                passwordHash: password, 
                type: normalizedType,
                verified,
                businessName: normalizedType === 'business' ? (businessName || name) : undefined
            });
            
            const savedUser = await registerdata.save();
            console.log('✅ User registered successfully:', email, 'ID:', savedUser._id);

            // Create default notification settings for all users
            await createDefaultNotificationSettings(email);

            // Create welcome notification for all users
            const welcomeNotification = await createWelcomeNotification(email, normalizedType);
            console.log('📬 Welcome notification result:', welcomeNotification ? 'Created' : 'Failed');

            // If this is a business user, create additional configurations
            if (normalizedType === 'business') {
                try {
                    console.log('🏢 Setting up business configurations...');
                    
                    // Create default API key first
                    const defaultApi = await createDefaultApiKey(email);
                    console.log('✅ Default API key created for:', email);
                    
                    // Create payment configurations
                    await createDefaultPaymentConfigurations(email);
                    console.log('✅ Payment configurations created for:', email);
                    
                    // Create setup notifications
                    await createSetupNotifications(email);
                    console.log('✅ Setup notifications created for:', email);
                    
                    // Create initial dashboard metrics
                    await createInitialDashboardMetrics(email, normalizedType);
                    console.log('✅ Initial dashboard metrics created for:', email);
                    
                    console.log('✅ Business setup completed for:', email);
                } catch (setupError) {
                    console.error('❌ Error setting up business defaults:', setupError);
                    console.error('Setup error details:', setupError.message);
                }
            }

            // Respond with JSON success
            return res.status(201).json({
                success: true,
                message: normalizedType === 'business' 
                    ? "Business account created successfully! Your payment configurations have been set up. Please login to continue."
                    : "Signup successful. Please login to continue.",
                notificationCreated: !!welcomeNotification,
                userType: normalizedType
            });
        }
    } catch (error) {
        console.error('❌ Signup error:', error);
        console.error('Error details:', error.message);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error: " + error.message
        });
    }
};

module.exports = {
    signup
};