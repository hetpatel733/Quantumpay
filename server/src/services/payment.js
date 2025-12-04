const { Payment } = require("../models/Payment");
const { Order } = require("../models/Order");
const { BusinessAPI } = require("../models/BusinessAPI");
const { PaymentConfiguration } = require("../models/PaymentConfiguration");
const { createPaymentNotification } = require('./notificationService');
const { updatePaymentMetrics } = require('./dashboardMetricsService');
const crypto = require('crypto');

// Improved payment ID generation - structured and traceable
function generatePaymentId(businessEmail, orderId) {

    const date = new Date();
    const dateStr = date.getFullYear().toString().substr(-2) +
        (date.getMonth() + 1).toString().padStart(2, '0') +
        date.getDate().toString().padStart(2, '0');

    const orderRef = orderId.toString().replace(/[^a-zA-Z0-9]/g, '').substr(0, 4).toUpperCase();

    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();

    const businessHash = crypto.createHash('md5').update(businessEmail).digest('hex').substr(0, 3).toUpperCase();

    return `QP${dateStr}${orderRef}${randomSuffix}${businessHash}`;
}

// Simplified amount generator based on payment2.js approach
function generateUniqueAmount(baseAmount) {
    // Calculate the base amount with first decimal place
    const exchangedAmount = parseFloat(baseAmount.toFixed(1)); // e.g., 2.1

    // Extract the whole and first decimal parts
    const [wholePart, firstDecimal = "0"] = exchangedAmount.toString().split(".");
    const firstDecimalValue = firstDecimal.charAt(0) || "0";

    // Generate random 2 additional decimal places (01-99)
    const randomDecimals = Math.floor(Math.random() * 99) + 1; // 1-99
    const paddedRandomDecimals = randomDecimals.toString().padStart(2, '0');

    // Combine: whole.firstDecimal + randomDecimals
    const finalAmountStr = `${wholePart}.${firstDecimalValue}${paddedRandomDecimals}`;
    const finalAmount = parseFloat(finalAmountStr);

    console.log(`💡 Amount generation: ${baseAmount} -> ${exchangedAmount} -> ${finalAmount}`);

    return finalAmount;
}

// Blockchain network configuration
const blockchainNetworks = {
    'Ethereum': {
        chainId: 1,
        nativeCoin: 'ETH',
        blockExplorer: 'etherscan.io',
        tokenContracts: {
            'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            'USDC': '0xA0b86a33E6c8d8e7aB1C3F0F8D0c5E6f8d4eC7b3'
        },
        decimals: {
            'ETH': 18,
            'USDT': 6,
            'USDC': 6
        }
    },
    'Polygon': {
        chainId: 137,
        nativeCoin: 'MATIC',
        blockExplorer: 'polygonscan.com',
        tokenContracts: {
            'USDT': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
            'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
        },
        decimals: {
            'MATIC': 18,
            'USDT': 6,
            'USDC': 6
        }
    },
    'BSC': {
        chainId: 56,
        nativeCoin: 'BNB',
        blockExplorer: 'bscscan.com',
        tokenContracts: {
            'USDT': '0x55d398326f99059fF775485246999027B3197955',
            'USDC': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
        },
        decimals: {
            'BNB': 18,
            'USDT': 18,
            'USDC': 18
        }
    },
    'Bitcoin': {
        chainId: null,
        nativeCoin: 'BTC',
        blockExplorer: 'blockstream.info',
        apiEndpoint: 'https://blockstream.info/api/address/{address}/txs',
        decimals: {
            'BTC': 8
        }
    },
    'Tron': {
        chainId: null,
        nativeCoin: 'TRX',
        blockExplorer: 'tronscan.org',
        apiEndpoint: 'https://api.trongrid.io/v1/accounts/{address}/transactions',
        tokenContracts: {
            'USDT': 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
            'USDC': 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8'
        },
        decimals: {
            'TRX': 6,
            'USDT': 6,
            'USDC': 6
        }
    },
    'Solana': {
        chainId: null,
        nativeCoin: 'SOL',
        blockExplorer: 'solscan.io',
        apiEndpoint: 'https://api.solscan.io/account/transaction',
        tokenContracts: {
            'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
            'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
        },
        decimals: {
            'SOL': 9,
            'USDT': 6,
            'USDC': 6
        }
    }
};

// Supported payment methods configuration
const paymentMethods = {
    'BTC': {
        name: 'Bitcoin',
        symbol: 'BTC',
        networks: ['Bitcoin'],
        defaultNetwork: 'Bitcoin',
        logo: '/assets/crypto/btc.png'
    },
    'ETH': {
        name: 'Ethereum',
        symbol: 'ETH',
        networks: ['Ethereum'],
        defaultNetwork: 'Ethereum',
        logo: '/assets/crypto/eth.png'
    },
    'USDT': {
        name: 'Tether USD',
        symbol: 'USDT',
        networks: ['Polygon', 'Tron', 'BSC', 'Ethereum', 'Solana'],
        defaultNetwork: 'Polygon',
        logo: '/assets/crypto/usdt.png'
    },
    'USDC': {
        name: 'USD Coin',
        symbol: 'USDC',
        networks: ['Polygon', 'Tron', 'BSC', 'Ethereum', 'Solana'],
        defaultNetwork: 'Polygon',
        logo: '/assets/crypto/usdc.png'
    },
    'MATIC': {
        name: 'Polygon',
        symbol: 'MATIC',
        networks: ['Polygon'],
        defaultNetwork: 'Polygon',
        logo: '/assets/crypto/matic.png'
    },
    'SOL': {
        name: 'Solana',
        symbol: 'SOL',
        networks: ['Solana'],
        defaultNetwork: 'Solana',
        logo: '/assets/crypto/sol.png'
    }
};

// Simplified API provider configuration - easily replaceable
const apiProviders = {
    // Primary EVM chain provider (BSC, Polygon, Ethereum)
    evmChains: {
        baseUrl: 'https://api.etherscan.io/v2/api',
        apiKey: process.env.ETHERSCAN_API_KEY || 'YOUR_ETHERSCAN_API_KEY',
        endpointPattern: '{baseUrl}?chainid={chainId}&module={module}&action={action}&address={address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey={apiKey}'
    },
    // Bitcoin provider
    bitcoin: {
        baseUrl: 'https://blockstream.info/api',
        endpointPattern: '{baseUrl}/address/{address}/txs'
    },
    // Tron provider (infrastructure ready)
    tron: {
        baseUrl: 'https://api.trongrid.io',
        apiKey: process.env.TRON_API_KEY || 'YOUR_TRON_API_KEY',
        endpointPattern: '{baseUrl}/v1/accounts/{address}/transactions?limit=20'
    }
};

// Helper to get network for crypto type and network combination
function getNetworkForCrypto(cryptoType, network = null) {
    if (network) return network;

    const paymentMethod = paymentMethods[cryptoType];
    return paymentMethod ? paymentMethod.defaultNetwork : 'Ethereum';
}

// Helper to get decimals for crypto type and network
function getDecimalsForCrypto(cryptoType, network = null) {
    const cryptoNetwork = network || getNetworkForCrypto(cryptoType);
    const networkConfig = blockchainNetworks[cryptoNetwork];
    
    if (networkConfig && networkConfig.decimals && networkConfig.decimals[cryptoType]) {
        return networkConfig.decimals[cryptoType];
    }
    
    // Fallback decimals
    const fallbackDecimals = {
        'BTC': 8,
        'ETH': 18,
        'USDT': 6,
        'USDC': 6,
        'MATIC': 18,
        'TRX': 6
    };
    
    return fallbackDecimals[cryptoType] || 18;
}

// Convert amount to proper decimal representation
function toWei(amountStr, decimals = 18) {
    const [whole, fraction = ""] = amountStr.split(".");
    const paddedFraction = (fraction + "0".repeat(decimals)).slice(0, decimals);
    return BigInt(whole + paddedFraction);
}

// Convert from Wei to decimal representation
function fromWei(weiAmount, decimals = 18) {
    const weiStr = weiAmount.toString();
    const isNegative = weiStr.startsWith('-');
    const positiveWeiStr = isNegative ? weiStr.slice(1) : weiStr;

    if (positiveWeiStr.length <= decimals) {
        const paddedStr = '0'.repeat(decimals - positiveWeiStr.length + 1) + positiveWeiStr;
        const result = paddedStr.slice(0, -decimals) + '.' + paddedStr.slice(-decimals);
        return isNegative ? '-' + result : result;
    } else {
        const integerPart = positiveWeiStr.slice(0, -decimals);
        const fractionalPart = positiveWeiStr.slice(-decimals);
        const result = integerPart + '.' + fractionalPart;
        return isNegative ? '-' + result : result;
    }
}

// Improved blockchain transaction verification with unified API approach
async function verifyBlockchainTransaction(walletAddress, expectedAmount, cryptoType, network, apiKey) {
    // Get network configuration
    const networkConfig = blockchainNetworks[network];
    if (!networkConfig) {
        throw new Error(`Unsupported network: ${network}`);
    }

    const decimals = getDecimalsForCrypto(cryptoType, network);
    let verificationEndpoint;
    let contractAddress = null;

    // Handle EVM compatible chains (Ethereum, Polygon, BSC) with unified approach
    if (networkConfig.chainId) {
        // Get contract address for token transactions
        if (cryptoType !== networkConfig.nativeCoin) {
            contractAddress = networkConfig.tokenContracts[cryptoType];
            if (!contractAddress) {
                throw new Error(`Contract address not configured for ${cryptoType} on ${network}`);
            }
        }

        // Build the verification endpoint using the unified API pattern
        const module = 'account';
        const action = contractAddress ? 'tokentx' : 'txlist';

        // Replace parameters in the endpoint pattern
        verificationEndpoint = apiProviders.evmChains.endpointPattern
            .replace('{baseUrl}', apiProviders.evmChains.baseUrl)
            .replace('{chainId}', networkConfig.chainId)
            .replace('{module}', module)
            .replace('{action}', action)
            .replace('{address}', walletAddress)
            .replace('{apiKey}', apiKey || apiProviders.evmChains.apiKey);

        // Add contract address if needed
        if (contractAddress) {
            verificationEndpoint += `&contractaddress=${contractAddress}`;
        }
    }
    // Handle Bitcoin
    else if (network === 'Bitcoin') {
        verificationEndpoint = apiProviders.bitcoin.endpointPattern
            .replace('{baseUrl}', apiProviders.bitcoin.baseUrl)
            .replace('{address}', walletAddress);
    }
    // Handle Tron (infrastructure ready)
    else if (network === 'Tron') {
        verificationEndpoint = apiProviders.tron.endpointPattern
            .replace('{baseUrl}', apiProviders.tron.baseUrl)
            .replace('{address}', walletAddress);
        
        // Add API key if available for Tron
        if (apiKey || apiProviders.tron.apiKey) {
            verificationEndpoint += `&api_key=${apiKey || apiProviders.tron.apiKey}`;
        }
    }
    // Handle Solana
    else if (network === 'Solana') {
        verificationEndpoint = apiProviders.solana.endpointPattern
            .replace('{baseUrl}', apiProviders.solana.baseUrl)
            .replace('{address}', walletAddress);
    }
    else {
        throw new Error(`API endpoint not configured for ${network}`);
    }

    // Add retry logic with exponential backoff
    let attempts = 0;
    const maxAttempts = 3;
    let delay = 1000;

    while (attempts < maxAttempts) {
        try {
            console.log(`🔍 Checking transactions with endpoint: ${verificationEndpoint}`);
            const response = await fetch(verificationEndpoint);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Handle different API response formats based on network type
            let transactions = parseTransactionResponse(data, network);

            // Find matching transaction
            const matchingTx = findMatchingTransaction(transactions, walletAddress, expectedAmount, cryptoType, network, decimals);

            if (matchingTx) {
                return {
                    success: true,
                    transaction: matchingTx
                };
            }

            return { success: false };
        } catch (error) {
            attempts++;
            console.error(`API attempt ${attempts} failed:`, error.message);
            if (attempts >= maxAttempts) {
                throw error;
            }

            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
}

// Helper to parse transaction responses from different blockchain APIs
function parseTransactionResponse(data, network) {
    const networkConfig = blockchainNetworks[network];

    if (!networkConfig) {
        console.log('❌ Invalid network configuration');
        return [];
    }

    // Handle Bitcoin
    if (network === 'Bitcoin') {
        return data || [];
    }
    // Handle Tron (infrastructure ready)
    else if (network === 'Tron') {
        return data.data || [];
    }
    // Handle Solana
    else if (network === 'Solana') {
        return data.data || [];
    }
    // Handle EVM chains (unified API format)
    else if (networkConfig.chainId) {
        if (data.status !== "1" && !data.result) {
            console.log(`❌ API error: ${data.message || 'Unknown error'}`);
            return [];
        }
        return data.result || [];
    }

    return [];
}

// Enhanced transaction finding with proper decimal handling
function findMatchingTransaction(transactions, walletAddress, expectedAmount, cryptoType, network, decimals) {
    if (!transactions || !Array.isArray(transactions)) {
        console.log('❌ No transactions found or invalid transaction data');
        return null;
    }

    try {
        const expectedValue = toWei(expectedAmount.toString(), decimals);
        const networkConfig = blockchainNetworks[network];

        console.log(`🔍 Looking for transaction of ${expectedAmount} ${cryptoType} on ${network} to ${walletAddress}`);
        console.log(`🔍 Expected value in smallest unit: ${expectedValue.toString()}`);

        // Process only the 10 most recent transactions for efficiency
        for (const tx of transactions.slice(0, 10)) {
            let txAmount = BigInt(0);
            let isToCorrectAddress = false;

            // Bitcoin transaction structure
            if (network === 'Bitcoin') {
                const output = tx.vout?.find(vout =>
                    vout.scriptpubkey_address === walletAddress
                );
                if (output) {
                    txAmount = BigInt(output.value);
                    isToCorrectAddress = true;
                }
            }
            // Tron transaction structure (infrastructure ready)
            else if (network === 'Tron') {
                // Tron transaction parsing will be implemented when needed
                console.log('🚧 Tron transaction verification not fully implemented yet');
                return null;
            }
            // Solana transaction structure
            else if (network === 'Solana') {
                const isToAddress = tx.to && tx.to.toLowerCase() === walletAddress.toLowerCase();
                const isFromAddress = tx.from && tx.from.toLowerCase() === walletAddress.toLowerCase();

                // Check if the transaction involves the wallet address as the sender or receiver
                if (isToAddress || isFromAddress) {
                    txAmount = BigInt(tx.amount || '0');
                    isToCorrectAddress = true;
                }
            }
            // EVM-based networks (Ethereum, Polygon, BSC)
            else if (networkConfig?.chainId) {
                const isNativeCoin = cryptoType === networkConfig.nativeCoin;

                // Check if this is the right type of transaction
                if (isNativeCoin) {
                    // Native coin transfer
                    if (tx.to && tx.to.toLowerCase() === walletAddress.toLowerCase()) {
                        txAmount = BigInt(tx.value || '0');
                        isToCorrectAddress = true;
                    }
                } else {
                    // Token transfer - handle ERC20/BEP20 tokens
                    if (tx.to && tx.to.toLowerCase() === walletAddress.toLowerCase()) {
                        txAmount = BigInt(tx.value || '0');
                        isToCorrectAddress = true;
                    }
                }
            }

            if (isToCorrectAddress && txAmount === expectedValue) {
                console.log(`✅ Found exact amount match: ${txAmount.toString()} (${fromWei(txAmount, decimals)} ${cryptoType})`);
                return tx;
            }
        }

        console.log('❌ No matching transaction found');
        return null;
    } catch (error) {
        console.error('❌ Error in findMatchingTransaction:', error);
        return null;
    }
}

// Helper to get available payment methods for a business
function getAvailablePaymentMethods(paymentConfig) {
    const availableMethods = [];

    if (!paymentConfig || !paymentConfig.cryptoConfigurations) {
        return availableMethods;
    }

    // Group configurations by crypto type
    const cryptoGroups = {};
    paymentConfig.cryptoConfigurations.forEach(config => {
        if (config.enabled && config.address && config.address.trim() !== '') {
            if (!cryptoGroups[config.coinType]) {
                cryptoGroups[config.coinType] = [];
            }
            cryptoGroups[config.coinType].push(config);
        }
    });

    // Build available methods with network options
    Object.keys(cryptoGroups).forEach(cryptoType => {
        const paymentMethod = paymentMethods[cryptoType];
        if (paymentMethod) {
            const networks = cryptoGroups[cryptoType].map(config => ({
                network: config.network,
                address: config.address,
                label: config.label || config.network
            }));

            availableMethods.push({
                coinType: cryptoType,
                name: paymentMethod.name,
                symbol: paymentMethod.symbol,
                logo: paymentMethod.logo,
                networks: networks,
                defaultNetwork: paymentMethod.defaultNetwork
            });
        }
    });

    return availableMethods;
}

// Updated exchange rates function with Binance API integration
async function getExchangeRates() {
    try {
        // Binance API symbol mappings
        const binanceSymbols = {
            'BTC': 'BTCUSDT',
            'ETH': 'ETHUSDT', 
            'USDT': 'USDCUSDT', // This will be 1.0 (fallback)
            'USDC': 'USDCUSDT',
            'MATIC': 'MATICUSDT',
            'SOL': 'SOLUSDT'
        };

        const rates = {};
        
        // Fetch prices from Binance API for all supported cryptocurrencies
        const promises = Object.entries(binanceSymbols).map(async ([crypto, symbol]) => {
            try {
                if (crypto === 'USDT' || crypto === 'USDC') {
                    // Stablecoins are always 1.0
                    rates[crypto] = 1.0;
                    return;
                }

                console.log(`🔄 Fetching ${crypto} price from Binance...`);
                const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                const price = parseFloat(data.price);
                
                if (isNaN(price) || price <= 0) {
                    throw new Error(`Invalid price received: ${data.price}`);
                }
                
                rates[crypto] = price;
                console.log(`✅ ${crypto}: $${price.toFixed(2)}`);
                
            } catch (error) {
                console.error(`❌ Error fetching ${crypto} price:`, error.message);
                // Fallback to default rates if API fails
                const fallbackRates = {
                    'BTC': 42000.00,
                    'ETH': 2500.00,
                    'MATIC': 0.85,
                    'SOL': 65.00
                };
                rates[crypto] = fallbackRates[crypto] || 1.0;
                console.log(`🔄 Using fallback rate for ${crypto}: $${rates[crypto]}`);
            }
        });

        await Promise.all(promises);
        
        console.log('💰 Final exchange rates:', rates);
        return rates;
        
    } catch (error) {
        console.error('❌ Error in getExchangeRates:', error);
        // Return fallback rates if everything fails
        return {
            'BTC': 42000.00,
            'ETH': 2500.00,
            'USDT': 1.0,
            'USDC': 1.0,
            'MATIC': 0.85,
            'SOL': 65.00
        };
    }
}

// Cache exchange rates to avoid too many API calls
let cachedRates = null;
let lastRateUpdate = 0;
const RATE_CACHE_DURATION = 60000; // 1 minute

async function getCachedExchangeRates() {
    const now = Date.now();
    
    if (!cachedRates || (now - lastRateUpdate) > RATE_CACHE_DURATION) {
        console.log('🔄 Refreshing exchange rates from Binance API...');
        cachedRates = await getExchangeRates();
        lastRateUpdate = now;
    } else {
        console.log('📊 Using cached exchange rates');
    }
    
    return cachedRates;
}

// Helper to validate required fields
function validatePaymentRequest(fname, lname, email, type, network, api, order_id) {
    const errors = [];
    
    if (!fname || fname.trim() === '') errors.push('First name is required');
    if (!lname || lname.trim() === '') errors.push('Last name is required');
    if (!email || email.trim() === '') errors.push('Email is required');
    if (!email.includes('@')) errors.push('Valid email address is required');
    if (!type || type.trim() === '') errors.push('Cryptocurrency type is required');
    if (!network || network.trim() === '') errors.push('Network is required');
    if (!api || api.trim() === '') errors.push('API key is required');
    if (!order_id || order_id.toString().trim() === '') errors.push('Order ID is required');
    
    return errors;
}

// Improved payment creation function with real-time pricing
const CoinselectFunction = async (req, res) => {
    const { fname, lname, email, type, network, api, order_id } = req.body;

    console.log('💰 Processing payment request:', { type, network, api, order_id });

    try {
        // Validate all required input fields
        const validationErrors = validatePaymentRequest(fname, lname, email, type, network, api, order_id);
        if (validationErrors.length > 0) {
            console.log('❌ Validation errors:', validationErrors);
            return res.status(400).json({
                success: false,
                message: validationErrors[0], // Return first error
                errors: validationErrors
            });
        }

        // Validate API key and order ID
        const addressfound = await BusinessAPI.findOne({ key: api });
        const orderfound = await Order.findOne({ orderId: order_id });

        if (!addressfound) {
            console.log('❌ API not found:', api);
            return res.status(400).json({
                success: false,
                message: "Invalid API key"
            });
        }

        if (!addressfound.isActive) {
            console.log('❌ API is disabled:', api);
            return res.status(403).json({
                success: false,
                message: "Payment processing is currently paused by the merchant. Please contact support.",
                errorCode: "API_PAUSED"
            });
        }

        if (!orderfound) {
            console.log('❌ Order not found:', order_id);
            return res.status(400).json({
                success: false,
                message: "Invalid Order ID"
            });
        }

        if (!orderfound.isActive) {
            console.log('❌ Product is deactivated:', order_id);
            return res.status(403).json({
                success: false,
                message: "This product/service has been deactivated and is no longer available for purchase.",
                errorCode: "PRODUCT_DEACTIVATED"
            });
        }

        // Get business email and update API usage
        const businessEmail = addressfound.businessEmail;

        await BusinessAPI.updateOne(
            { key: api },
            {
                $inc: { usageCount: 1 },
                $set: { lastUsed: new Date() }
            }
        );

        // Verify cryptocurrency configuration
        const paymentConfig = await PaymentConfiguration.findOne({
            businessEmail: businessEmail
        });

        if (!paymentConfig) {
            console.log('❌ No payment configuration found for:', businessEmail);
            return res.status(400).json({
                success: false,
                message: "Payment configuration not found. Please contact the merchant."
            });
        }

        // Determine the network to use
        const selectedNetwork = network || getNetworkForCrypto(type);

        // Find the specific crypto configuration for the selected network
        const cryptoConfig = paymentConfig.cryptoConfigurations.find(c => 
            c.coinType === type && 
            c.network === selectedNetwork && 
            c.enabled
        );

        if (!cryptoConfig || !cryptoConfig.address || cryptoConfig.address.trim() === '') {
            console.log('❌ Cryptocurrency not properly configured:', type, selectedNetwork);
            return res.status(400).json({
                success: false,
                message: `${type} on ${selectedNetwork} network is not available for payment. Please select a different option.`
            });
        }

        // Check if the selected network is functional
        const functionalNetworks = ['Ethereum', 'Polygon', 'BSC', 'Solana'];
        if (!functionalNetworks.includes(selectedNetwork)) {
            console.log('❌ Network not yet functional:', selectedNetwork);
            return res.status(400).json({
                success: false,
                message: `${selectedNetwork} network is not yet available. Please select Ethereum, Polygon, BSC, or Solana.`
            });
        }

        // Calculate payment amounts using real-time pricing
        const amountUSD = orderfound.amountUSD;
        console.log('💰 Fetching real-time exchange rates...');
        const exchangeRates = await getCachedExchangeRates();
        const exchangeRate = exchangeRates[type] || 1;
        const baseAmount = amountUSD / exchangeRate;

        console.log(`💱 Exchange calculation: $${amountUSD} / $${exchangeRate} = ${baseAmount.toFixed(6)} ${type}`);

        // Generate unique amount
        let uniqueAmount;
        let isUnique = false;
        const maxAttempts = 10;
        let attempt = 0;

        while (!isUnique && attempt < maxAttempts) {
            attempt++;
            uniqueAmount = generateUniqueAmount(baseAmount);

            // Check if this amount is already used for pending payments
            const existing = await Payment.findOne({
                amountCrypto: uniqueAmount,
                status: "pending",
                orderId: order_id,
                cryptoType: type,
                network: selectedNetwork
            });

            if (!existing) isUnique = true;
        }

        if (!isUnique) {
            return res.status(500).json({
                success: false,
                message: "Couldn't generate unique payment amount. Please try again."
            });
        }

        // Generate structured payment ID
        const payid = generatePaymentId(businessEmail, order_id);

        // Create payment record with network information and real-time exchange rate
        const paymentData = {
            payId: payid,
            orderId: order_id,
            businessEmail: businessEmail,
            customerEmail: email,
            customerName: `${fname} ${lname}`.trim() || email.split('@')[0],
            amountUSD: amountUSD,
            amountCrypto: uniqueAmount,
            cryptoType: type,
            cryptoSymbol: type,
            network: selectedNetwork,
            exchangeRate: exchangeRate, // Store the real-time rate used
            status: "pending",
            hash: null,
            priceSource: 'binance', // Track price source
            priceTimestamp: new Date() // Track when price was fetched
        };

        // Save payment to database
        const payment = new Payment(paymentData);
        await payment.save();

        console.log('✅ Payment created:', payment.payId, 
                   'Amount:', uniqueAmount, type, 
                   'Network:', selectedNetwork,
                   'Rate:', exchangeRate);

        // Update dashboard metrics
        try {
            await updatePaymentMetrics(payment);
            console.log('📊 Dashboard metrics updated for new payment');
        } catch (metricsError) {
            console.error('❌ Error updating dashboard metrics:', metricsError);
        }

        // Start payment monitoring
        startPaymentMonitoring(payment.payId);

        // Return success with payment details
        return res.status(200).json({
            success: true,
            payid: payid,
            amount: uniqueAmount,
            cryptoType: type,
            network: selectedNetwork,
            walletAddress: cryptoConfig.address,
            exchangeRate: exchangeRate,
            usdAmount: amountUSD,
            message: "Payment created successfully"
        });
    } catch (error) {
        console.error('❌ Payment processing error:', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error: " + error.message
        });
    }
};

// Start payment monitoring in the background
async function startPaymentMonitoring(payid) {
    // Start monitoring in background without response dependency
    FinalpayFunction({ query: { payid } });
}

// Enhanced payment verification function with multi-network support
const FinalpayFunction = async (req, res) => {
    const { payid } = req.query;

    try {
        const payment = await Payment.findOne({ payId: payid });

        if (!payment) {
            console.log('❌ Payment not found:', payid);
            return res && !res.headersSent ? res.status(404).json({
                success: false,
                message: "Payment not found"
            }) : null;
        }

        const { businessEmail, cryptoType } = payment;

        // Get payment configuration including API providers
        const paymentConfig = await PaymentConfiguration.findOne({
            businessEmail: businessEmail
        });

        if (!paymentConfig) {
            console.log('❌ No payment configuration found for:', businessEmail);
            return;
        }

        // Find the specific crypto configuration 
        const cryptoConfig = paymentConfig.cryptoConfigurations.find(
            crypto => crypto.coinType === cryptoType && crypto.enabled
        );

        if (!cryptoConfig) {
            console.log('❌ No enabled crypto configuration found for:', cryptoType);
            return;
        }

        const network = cryptoConfig.network || getNetworkForCrypto(cryptoType);
        const walletAddress = cryptoConfig.address;

        if (!walletAddress || walletAddress.trim() === '') {
            console.log('❌ Invalid wallet address for:', cryptoType, network);
            setTimeout(async () => {
                const currentPayment = await Payment.findOne({ payId: payid });
                if (currentPayment && currentPayment.status === 'pending') {
                    await Payment.updateOne(
                        { payId: payid },
                        {
                            $set: {
                                status: "failed",
                                failureReason: `No valid wallet address configured for ${cryptoType} on ${network}`
                            }
                        }
                    );
                }
            }, 10 * 60 * 1000);
            return;
        }

        // Use the configured API key or the default one
        let apiKey;
        if (['Ethereum', 'Polygon', 'BSC'].includes(network)) {
            // Always use Etherscan API key for all EVM chains
            apiKey = process.env.ETHERSCAN_API_KEY || apiProviders.evmChains.apiKey;
        } else {
            // For non-EVM, try to get the network-specific API key
            apiKey = paymentConfig.apiProviders?.find(p => p.network === network)?.apiKey;
        }

        console.log(`🎯 Verifying payment using ${network} network for ${cryptoType}:`, walletAddress.substring(0, 10) + '...');

        let attempt = 0;
        const maxAttempts = 30;
        const delay = 60000; // 1 minute

        const checkPayment = async () => {
            attempt++;

            try {
                const currentPayment = await Payment.findOne({ payId: payid });
                if (!currentPayment || currentPayment.status !== 'pending') {
                    console.log('🛑 Payment no longer pending, stopping verification:', payid);
                    return;
                }

                const amountCrypto = currentPayment.amountCrypto;
                console.log(`🔄 Retry ${attempt}: Checking for ${amountCrypto} ${cryptoType} on ${network}`);

                // Verify transaction using the enhanced function
                const verificationResult = await verifyBlockchainTransaction(
                    walletAddress,
                    amountCrypto,
                    cryptoType,
                    network,
                    apiKey
                );

                if (verificationResult.success) {
                    console.log('✅ Payment verified on blockchain:', payid);

                    const previousStatus = currentPayment.status;

                    await Payment.updateOne(
                        { payId: payid },
                        {
                            $set: {
                                status: "completed",
                                hash: verificationResult.transaction.hash || verificationResult.transaction.txid,
                                completedAt: new Date()
                            }
                        }
                    );

                    const completedPayment = await Payment.findOne({ payId: payid });
                    await updatePaymentMetrics(completedPayment, previousStatus);
                    await createPaymentNotification(businessEmail, completedPayment, 'payment_completed');

                    return;
                }

                if (attempt < maxAttempts) {
                    console.log(`⏱️ Payment check attempt ${attempt}/${maxAttempts}, next check in ${delay / 1000}s`);
                    setTimeout(checkPayment, delay);
                } else {
                    console.log(`❌ Payment verification timed out after ${maxAttempts} attempts:`, payid);

                    const currentPayment = await Payment.findOne({ payId: payid });
                    if (currentPayment && currentPayment.status === 'pending') {
                        const previousStatus = currentPayment.status;

                        await Payment.updateOne(
                            { payId: payid },
                            {
                                $set: {
                                    status: "failed",
                                    failureReason: "Payment verification timeout"
                                }
                            }
                        );

                        const failedPayment = await Payment.findOne({ payId: payid });
                        await updatePaymentMetrics(failedPayment, previousStatus);
                        await createPaymentNotification(businessEmail, failedPayment, 'payment_failed');
                    }
                }

            } catch (error) {
                console.error(`❌ Payment verification error (attempt ${attempt}):`, error.message);

                if (attempt < maxAttempts) {
                    const retryDelay = delay * 1.5;
                    console.log(`⏱️ Network error, retrying in ${retryDelay / 1000}s. Attempt ${attempt}/${maxAttempts}`);
                    setTimeout(checkPayment, retryDelay);
                } else {
                    console.log(`❌ All retry attempts exhausted for payment: ${payid}`);
                    await Payment.updateOne(
                        { payId: payid },
                        { $set: { status: "failed", failureReason: "Verification error after multiple retries" } }
                    );
                }
            }
        };

        checkPayment();

    } catch (error) {
        console.error('❌ Fatal error in payment monitoring:', error);
        if (res && !res.headersSent) {
            return res.status(500).json({
                success: false,
                message: "Internal server error: " + error.message
            });
        }
    }
};

// Keep existing endpoint functions but use new logic
const paymentFunction = async (api, order_id, res) => {
    const apifound = await BusinessAPI.findOne({ key: api });
    const orderfound = await Order.findOne({ orderId: order_id });

    if (!apifound) {
        return res.status(404).json({
            success: false,
            message: "API key is invalid or not found"
        });
    } else if (!apifound.isActive) {
        return res.status(403).json({
            success: false,
            message: "Payment processing is currently paused by the merchant. Please contact support.",
            errorCode: "API_PAUSED"
        });
    } else if (!orderfound) {
        return res.status(404).json({
            success: false,
            message: "Order ID is invalid or not found"
        });
    } else if (!orderfound.isActive) {
        return res.status(403).json({
            success: false,
            message: "This product/service has been deactivated and is no longer available for purchase.",
            errorCode: "ORDER_DEACTIVATED"
        });
    } else {
        // Update API usage
        await BusinessAPI.updateOne(
            { key: api },
            {
                $inc: { usageCount: 1 },
                $set: { lastUsed: new Date() }
            }
        );

        // Return success response
        return res.status(200).json({
            success: true,
            message: "Payment request validated",
            redirectUrl: `/payment/coinselect?api=${api}&order_id=${order_id}`
        });
    }
}

const getPaymentDetails = async (req, res) => {
    try {
        const { payid } = req.query;

        console.log('🔍 Payment details request for payid:', payid);

        if (!payid) {
            return res.status(400).json({
                success: false,
                message: "Payment ID is required"
            });
        }

        const payment = await Payment.findOne({ payId: payid });

        if (!payment) {
            console.log('❌ Payment not found:', payid);
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        console.log('✅ Payment found:', payment.payId, 'Status:', payment.status);

        // Get order details to check if it's still active
        const order = await Order.findOne({ orderId: payment.orderId });
        
        // Get business API status
        const businessAPI = await BusinessAPI.findOne({ businessEmail: payment.businessEmail });

        // Check for deactivated order or paused API
        if (order && !order.isActive) {
            return res.status(400).json({
                success: false,
                message: "This product/service has been deactivated and is no longer available for payment.",
                errorCode: "ORDER_DEACTIVATED"
            });
        }
        
        if (businessAPI && !businessAPI.isActive) {
            return res.status(400).json({
                success: false,
                message: "Payment processing is currently paused by the merchant. Please contact support.",
                errorCode: "API_PAUSED"
            });
        }

        // Get payment configuration to find the correct wallet address
        const paymentConfig = await PaymentConfiguration.findOne({
            businessEmail: payment.businessEmail
        });

        let walletAddress = payment.businessEmail; // fallback to email

        if (paymentConfig && paymentConfig.cryptoConfigurations) {
            const cryptoConfig = paymentConfig.cryptoConfigurations.find(
                crypto => crypto.coinType === payment.cryptoType && 
                         crypto.network === payment.network &&
                         crypto.enabled
            );
            if (cryptoConfig && cryptoConfig.address) {
                walletAddress = cryptoConfig.address;
            }
        }

        const responseData = {
            success: true,
            payment: {
                payid: payment.payId,
                payId: payment.payId,
                id: payment.payId,
                order_id: payment.orderId,
                orderId: payment.orderId,
                amountUSD: payment.amountUSD,
                amountCrypto: payment.amountCrypto,
                amount: payment.amountCrypto,
                businessEmail: payment.businessEmail,
                customerEmail: payment.customerEmail,
                customerName: payment.customerName,
                cryptoType: payment.cryptoType,
                cryptoSymbol: payment.cryptoSymbol,
                type: payment.cryptoType,
                network: payment.network,
                status: payment.status,
                hash: payment.hash,
                timestamp: payment.createdAt,
                createdAt: payment.createdAt,
                completedAt: payment.completedAt,
                walletAddress: walletAddress,
                address: walletAddress
            }
        };

        console.log('📤 Returning payment details for:', payment.payId);
        return res.status(200).json(responseData);

    } catch (error) {
        console.error("❌ Error fetching payment details:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error: " + error.message
        });
    }
};

const checkstatus = async (req, res) => {
    try {
        const { payid } = req.query;

        console.log('🔍 Payment status check for payid:', payid);

        if (!payid) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing payid" 
            });
        }

        const payment = await Payment.findOne({ payId: payid });

        if (!payment) {
            console.log('❌ Payment not found:', payid);
            return res.status(404).json({ 
                success: false, 
                message: "Payment ID not found" 
            });
        }

        console.log('✅ Payment status found:', payment.payId, 'Status:', payment.status);

        // Get order details to check if it's still active
        const order = await Order.findOne({ orderId: payment.orderId });
        
        // Get business API status
        const businessAPI = await BusinessAPI.findOne({ businessEmail: payment.businessEmail });

        // Check for deactivated order or paused API
        if (order && !order.isActive) {
            return res.status(400).json({
                success: false,
                message: "This product/service has been deactivated and is no longer available for payment.",
                errorCode: "ORDER_DEACTIVATED"
            });
        }
        
        if (businessAPI && !businessAPI.isActive) {
            return res.status(400).json({
                success: false,
                message: "Payment processing is currently paused by the merchant. Please contact support.",
                errorCode: "API_PAUSED"
            });
        }

        // Get payment configuration to find the correct wallet address
        const paymentConfig = await PaymentConfiguration.findOne({
            businessEmail: payment.businessEmail
        });

        let walletAddress = payment.businessEmail; // fallback

        if (paymentConfig && paymentConfig.cryptoConfigurations) {
            const cryptoConfig = paymentConfig.cryptoConfigurations.find(
                crypto => crypto.coinType === payment.cryptoType && 
                         crypto.network === payment.network &&
                         crypto.enabled
            );
            if (cryptoConfig && cryptoConfig.address) {
                walletAddress = cryptoConfig.address;
            }
        }

        return res.status(200).json({
            success: true,
            payid: payment.payId,
            status: payment.status,
            order_id: payment.orderId,
            businessEmail: payment.businessEmail,
            cryptoType: payment.cryptoType,
            type: payment.cryptoType,
            amount: payment.amountCrypto,
            network: payment.network,
            address: walletAddress,
            timestamp: payment.createdAt || null
        });

    } catch (err) {
        console.error("❌ Error fetching payment status:", err);
        return res.status(500).json({ 
            success: false, 
            message: "Internal server error" 
        });
    }
};

const getCryptoDisplayName = (coinType) => {
    const names = {
        'BTC': 'Bitcoin',
        'ETH': 'Ethereum',
        'USDT': 'Tether',
        'USDC': 'USD Coin',
        'MATIC': 'Polygon',
        'PYUSD': 'PayPal USD'
    };
    return names[coinType] || coinType;
};

const validateApiAndOrder = async (req, res) => {
    try {
        const { api, order_id } = req.query;

        if (!api || !order_id) {
            return res.status(400).json({
                success: false,
                message: "API key and Order ID are required"
            });
        }

        const apifound = await BusinessAPI.findOne({ key: api });

        if (!apifound) {
            return res.status(404).json({
                success: false,
                message: "Invalid API key"
            });
        }

        if (!apifound.isActive) {
            return res.status(403).json({
                success: false,
                message: "Payment processing is currently paused by the merchant. Please contact support.",
                errorCode: "API_PAUSED"
            });
        }

        const orderfound = await Order.findOne({ orderId: order_id });

        if (!orderfound) {
            return res.status(404).json({
                success: false,
                message: "Invalid Order ID"
            });
        }

        if (!orderfound.isActive) {
            return res.status(403).json({
                success: false,
                message: "This product/service has been deactivated and is no longer available for purchase.",
                errorCode: "ORDER_DEACTIVATED"
            });
        }

        // Get payment configuration for enabled cryptocurrencies
        const paymentConfig = await PaymentConfiguration.findOne({
            businessEmail: apifound.businessEmail
        });

        const availablePaymentMethods = getAvailablePaymentMethods(paymentConfig);

        // Update API usage for validation calls
        await BusinessAPI.updateOne(
            { key: api },
            {
                $inc: { usageCount: 1 },
                $set: { lastUsed: new Date() }
            }
        );

        console.log(`🔍 Payment validation for ${apifound.businessEmail}: ${availablePaymentMethods.length} available payment methods`);

        return res.status(200).json({
            success: true,
            order: {
                order_id: orderfound.orderId,
                amount: orderfound.amountUSD,
                api: api,
                productName: orderfound.productName,
                description: orderfound.description
            },
            paymentMethods: availablePaymentMethods,
            supportedNetworks: {
                functional: ['Ethereum', 'Polygon', 'BSC'],
                infrastructure: ['Bitcoin', 'Tron']
            }
        });
    } catch (error) {
        console.error("Error validating payment request:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    validateApiAndOrder,
    getPaymentDetails,
    checkstatus,
    FinalpayFunction,
    CoinselectFunction,
    paymentFunction
};