const { Payment } = require('../models/Payment');
const { Product } = require('../models/Product');
const { BusinessAPI } = require('../models/BusinessAPI');
const { PaymentConfiguration } = require('../models/PaymentConfiguration');
const { User } = require('../models/User');
const crypto = require('crypto');

// Import the new currency converter utility
const { getExchangeRate, usdToCrypto } = require('../utils/currencyConverter');

// Generate unique payment ID
const generatePayId = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `PAY_${timestamp}_${random}`;
};

// Generate a small random offset for amount uniqueness (max 0.01 USD)
const generateAmountOffset = (payId, baseAmount) => {
    // Create a hash from payId to ensure consistency
    const hash = crypto.createHash('sha256').update(payId).digest('hex');
    
    // Extract first 8 characters and convert to number between 0 and 1
    const hashValue = parseInt(hash.substring(0, 8), 16);
    const normalized = hashValue / 0xFFFFFFFF; // Normalize to 0-1
    
    // Generate offset between 0.001 and 0.010 (3 decimal places)
    const offset = 0.001 + (normalized * 0.009);
    
    // Round to 3 decimal places
    return Math.round(offset * 1000) / 1000;
};

// VALIDATE PAYMENT REQUEST
async function validatePayment(req, res) {
    try {
        const { api, order_id } = req.query;

        //console.log(`🔍 Validating payment: API=${api?.substring(0, 10)}..., ProductID=${order_id}`);

        // Check required params
        if (!api || !order_id) {
            return res.status(400).json({
                success: false,
                message: 'API key and order ID are required',
                errorCode: 'MISSING_PARAMS'
            });
        }

        // 1. Find and validate API key
        const apiKey = await BusinessAPI.findOne({ key: api });
        if (!apiKey) {
            return res.status(404).json({
                success: false,
                message: 'Invalid API key',
                errorCode: 'INVALID_API_KEY'
            });
        }

        // Check if API key is active
        if (!apiKey.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Payment processing is paused. Please contact the merchant.',
                errorCode: 'API_PAUSED'
            });
        }

        // 2. Find and validate product
        const product = await Product.findOne({ productId: order_id });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
                errorCode: 'PRODUCT_NOT_FOUND'
            });
        }

        // Check if product belongs to API key owner
        if (product.userId.toString() !== apiKey.userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Product does not belong to this API key',
                errorCode: 'PRODUCT_MISMATCH'
            });
        }

        // Check if product is active
        if (!product.isActive) {
            return res.status(403).json({
                success: false,
                message: 'This product has been deactivated',
                errorCode: 'ORDER_DEACTIVATED'
            });
        }

        // 3. Get payment configuration (enabled wallets)
        const paymentConfig = await PaymentConfiguration.findOne({ userId: apiKey.userId });
        
        if (!paymentConfig || !paymentConfig.wallets || paymentConfig.wallets.size === 0) {
            return res.status(400).json({
                success: false,
                message: 'No payment methods configured by merchant',
                errorCode: 'NO_PAYMENT_METHODS'
            });
        }

        // Build list of enabled cryptocurrencies
        const enabledCryptos = [];
        const wallets = paymentConfig.wallets instanceof Map 
            ? Object.fromEntries(paymentConfig.wallets) 
            : paymentConfig.wallets;

        for (const [cryptoId, address] of Object.entries(wallets)) {
            if (address && address.trim()) {
                // Parse crypto ID (e.g., "USDT_ETHEREUM" -> coinType: USDT, network: Ethereum)
                const parts = cryptoId.split('_');
                const coinType = parts[0];
                const network = parts[1] || coinType; // For native coins like BTC, network = coinType

                enabledCryptos.push({
                    id: cryptoId,
                    coinType,
                    network,
                    name: getCryptoName(coinType),
                    address
                });
            }
        }

        if (enabledCryptos.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No payment methods are currently enabled',
                errorCode: 'NO_ENABLED_CRYPTOS'
            });
        }

        // Update API key usage
        apiKey.usageCount = (apiKey.usageCount || 0) + 1;
        apiKey.lastUsed = new Date();
        await apiKey.save();

        //console.log(`✅ Payment validated: ${enabledCryptos.length} payment methods available`);

        return res.status(200).json({
            success: true,
            order: {
                productId: product.productId,
                productName: product.productName,
                description: product.description,
                amount: product.amountUSD,
                isActive: product.isActive
            },
            enabledCryptos,
            apiStatus: {
                isActive: apiKey.isActive
            }
        });

    } catch (error) {
        console.error('❌ Validate payment error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to validate payment request'
        });
    }
}

// Helper function to get crypto name
function getCryptoName(coinType) {
    const names = {
        'BTC': 'Bitcoin',
        'ETH': 'Ethereum',
        'USDT': 'Tether',
        'USDC': 'USD Coin',
        'BNB': 'Binance Coin',
        'SOL': 'Solana',
        'POL': 'Polygon'
    };
    return names[coinType] || coinType;
}

// PROCESS COIN SELECTION - Create Payment
async function processCoinSelection(req, res) {
    try {
        const { fname, lname, email, type, network, api, order_id } = req.body;

        //console.log(`💰 Processing coin selection:`, { email, type, network, order_id });

        // Validate required fields
        if (!fname || !lname || !email || !type || !api || !order_id) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Find API key
        const apiKey = await BusinessAPI.findOne({ key: api });
        if (!apiKey || !apiKey.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or inactive API key'
            });
        }

        // Find product
        const product = await Product.findOne({ productId: order_id });
        if (!product || !product.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Product not found or inactive'
            });
        }

        // Get wallet address for selected crypto
        const paymentConfig = await PaymentConfiguration.findOne({ userId: apiKey.userId });
        const cryptoId = network ? `${type}_${network}` : type;
        
        const wallets = paymentConfig?.wallets instanceof Map 
            ? Object.fromEntries(paymentConfig.wallets) 
            : (paymentConfig?.wallets || {});
        
        const walletAddress = wallets[cryptoId] || wallets[type];
        
        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                message: 'Selected payment method is not available'
            });
        }

        // Generate unique payment ID
        const payId = generatePayId();

        // Add small random offset to make amount unique
        const amountOffset = generateAmountOffset(payId, product.amountUSD);
        const uniqueAmountUSD = product.amountUSD + amountOffset;

        // Get exchange rate and calculate crypto amount with unique USD amount
        const exchangeRate = await getExchangeRate(type);
        const amountCrypto = (uniqueAmountUSD / exchangeRate).toFixed(8);

        //console.log(`💵 Amount calculation: Base=$${product.amountUSD}, Offset=$${amountOffset.toFixed(3)}, Final=$${uniqueAmountUSD.toFixed(3)}`);

        // Create payment record
        const payment = new Payment({
            payId,
            userId: apiKey.userId,
            productId: product.productId,
            status: 'pending',
            amountUSD: uniqueAmountUSD,
            amountCrypto: parseFloat(amountCrypto),
            cryptoType: type,
            cryptoSymbol: type,
            network: network || type,
            walletAddress,
            customerName: `${fname} ${lname}`,
            customerEmail: email,
            exchangeRate,
            priceTimestamp: new Date()
        });

        await payment.save();

        //console.log(`✅ Payment created: ${payId}`);

        return res.status(201).json({
            success: true,
            message: 'Payment created successfully',
            payid: payId,
            payment: {
                payId,
                amountUSD: uniqueAmountUSD,
                amountCrypto: parseFloat(amountCrypto),
                cryptoType: type,
                network: network || type,
                walletAddress,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('❌ Process coin selection error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to process payment'
        });
    }
}

// GET PAYMENT DETAILS
async function getPaymentDetails(req, res) {
    try {
        const { payid } = req.query;

        if (!payid) {
            return res.status(400).json({
                success: false,
                message: 'Payment ID is required'
            });
        }

        //console.log(`📋 Fetching payment details: ${payid}`);

        const payment = await Payment.findOne({ payId: payid });
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        // Get product info
        const product = await Product.findOne({ productId: payment.productId });

        return res.status(200).json({
            success: true,
            payment: {
                payId: payment.payId,
                status: payment.status,
                amountUSD: payment.amountUSD,
                amountCrypto: payment.amountCrypto,
                cryptoType: payment.cryptoType,
                cryptoSymbol: payment.cryptoSymbol,
                network: payment.network,
                walletAddress: payment.walletAddress,
                customerName: payment.customerName,
                customerEmail: payment.customerEmail,
                exchangeRate: payment.exchangeRate,
                createdAt: payment.createdAt,
                productName: product?.productName,
                orderIsActive: product?.isActive,
                // --- NEW: include failure reason for UI display ---
                failureReason: payment.failureReason || null
            }
        });

    } catch (error) {
        console.error('❌ Get payment details error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch payment details'
        });
    }
}

// CHECK PAYMENT STATUS
async function checkPaymentStatus(req, res) {
    try {
        const { payid } = req.query;

        if (!payid) {
            return res.status(400).json({
                success: false,
                message: 'Payment ID is required'
            });
        }

        const payment = await Payment.findOne({ payId: payid });
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        return res.status(200).json({
            success: true,
            status: payment.status,
            completedAt: payment.completedAt,
            hash: payment.hash,
            // --- NEW: include failureReason in status checks ---
            failureReason: payment.failureReason || null
        });

    } catch (error) {
        console.error('❌ Check payment status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to check payment status'
        });
    }
}

// GET ALL PAYMENTS (for dashboard)
async function getAllPayments(req, res) {
    try {
        const { 
            userId, 
            status, 
            cryptoType, 
            network,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            skip = 0,
            limit = 50,
            amountMin,  // Add amount range support
            amountMax   // Add amount range support
        } = req.query;

        //console.log(`📋 Fetching payments for user: ${userId}`);

        // Build query
        const query = {};
        
        if (userId) {
            query.userId = userId;
        }

        if (status && status !== 'all') {
            query.status = status;
        }

        if (cryptoType && cryptoType !== 'all') {
            query.cryptoType = cryptoType;
        }

        if (network && network !== 'all') {
            query.network = network;
        }

        // Add amount range filtering
        if (amountMin || amountMax) {
            query.amountUSD = {};
            if (amountMin) {
                query.amountUSD.$gte = parseFloat(amountMin);
            }
            if (amountMax) {
                query.amountUSD.$lte = parseFloat(amountMax);
            }
        }

        // Build sort
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const payments = await Payment.find(query)
            .sort(sort)
            .skip(parseInt(skip))
            .limit(parseInt(limit));

        const total = await Payment.countDocuments(query);

        return res.status(200).json({
            success: true,
            payments,
            pagination: {
                total,
                skip: parseInt(skip),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('❌ Get all payments error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch payments'
        });
    }
}

// GET PAYMENT BY ID
async function getPaymentById(req, res) {
    try {
        const { paymentId } = req.params;

        //console.log('🔍 Fetching payment by ID:', paymentId);

        if (!paymentId) {
            return res.status(400).json({
                success: false,
                message: 'Payment ID is required'
            });
        }

        let payment = null;

        // Try to find by payId first (custom string ID)
        payment = await Payment.findOne({ payId: paymentId });

        // If not found by payId, try by MongoDB _id (only if it looks like a valid ObjectId)
        if (!payment && paymentId.match(/^[0-9a-f]{24}$/i)) {
            try {
                payment = await Payment.findById(paymentId);
            } catch (err) {
                // ObjectId casting failed, continue
                //console.log('⚠️ ObjectId lookup failed, payment not found');
            }
        }

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        // Get product info to include productName
        const product = await Product.findOne({ productId: payment.productId });

        // Convert to plain object
        const paymentObj = payment.toObject ? payment.toObject() : JSON.parse(JSON.stringify(payment));

        return res.status(200).json({
            success: true,
            payment: {
                payId: paymentObj.payId || payment.payId,
                _id: paymentObj._id || payment._id,
                status: paymentObj.status || payment.status,
                amountUSD: paymentObj.amountUSD || payment.amountUSD,
                amountCrypto: paymentObj.amountCrypto || payment.amountCrypto,
                cryptoType: paymentObj.cryptoType || payment.cryptoType,
                cryptoSymbol: paymentObj.cryptoSymbol || payment.cryptoSymbol,
                network: paymentObj.network || payment.network,
                walletAddress: paymentObj.walletAddress || payment.walletAddress,
                customerName: paymentObj.customerName || payment.customerName,
                customerEmail: paymentObj.customerEmail || payment.customerEmail,
                productId: paymentObj.productId || payment.productId,
                productName: product?.productName || 'Unknown Product',
                exchangeRate: paymentObj.exchangeRate || payment.exchangeRate,
                hash: paymentObj.hash || payment.hash || null,
                completedAt: paymentObj.completedAt || payment.completedAt || null,
                failureReason: paymentObj.failureReason || payment.failureReason || null,
                createdAt: paymentObj.createdAt || payment.createdAt,
                updatedAt: paymentObj.updatedAt || payment.updatedAt
            }
        });

    } catch (error) {
        console.error('❌ Get payment by ID error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch payment',
            error: error.message
        });
    }
}

// RETRY FAILED PAYMENT
async function retryPayment(req, res) {
    try {
        const { oldPayId, customerName, customerEmail, cryptoType, network, productId } = req.body;

        //console.log(`🔄 Retrying payment: ${oldPayId}`);

        // Basic presence of oldPayId checked below after fetching oldPayment

        // Find old payment
        const oldPayment = await Payment.findOne({ payId: oldPayId });
        if (!oldPayment) {
            return res.status(404).json({
                success: false,
                message: 'Original payment not found'
            });
        }

        // Use fallbacks from old payment when request body omitted fields
        const finalProductId = productId || oldPayment.productId;
        const finalCustomerName = customerName || oldPayment.customerName;
        const finalCustomerEmail = customerEmail || oldPayment.customerEmail;
        const finalCryptoType = cryptoType || oldPayment.cryptoType;
        const finalNetwork = network || oldPayment.network;

        // Validate required fields AFTER applying fallbacks
        if (!finalProductId || !finalCustomerName || !finalCustomerEmail || !finalCryptoType) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields for retry (productId/customerName/customerEmail/cryptoType)'
            });
        }

        // Verify old payment is failed
        if (oldPayment.status !== 'failed') {
            return res.status(400).json({
                success: false,
                message: 'Can only retry failed payments'
            });
        }

        // Find product to get current price
        const product = await Product.findOne({ productId: finalProductId });
        if (!product || !product.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Product not found or inactive'
            });
        }

        // Get wallet address from payment config
        const paymentConfig = await PaymentConfiguration.findOne({ userId: oldPayment.userId });
        const cryptoId = finalNetwork ? `${finalCryptoType}_${finalNetwork}` : finalCryptoType;
        
        const wallets = paymentConfig?.wallets instanceof Map 
            ? Object.fromEntries(paymentConfig.wallets) 
            : (paymentConfig?.wallets || {});
        
        const walletAddress = wallets[cryptoId] || wallets[finalCryptoType];
        
        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                message: 'Selected payment method is not available'
            });
        }

        // Generate new payment ID
        const newPayId = generatePayId();

        // Add small random offset to make amount unique
        const amountOffset = generateAmountOffset(newPayId, product.amountUSD);
        const uniqueAmountUSD = product.amountUSD + amountOffset;

        // Get current exchange rate
        const exchangeRate = await getExchangeRate(finalCryptoType);
        const amountCrypto = (uniqueAmountUSD / exchangeRate).toFixed(8);

        //console.log(`💵 Retry amount calculation: Base=$${product.amountUSD}, Offset=$${amountOffset.toFixed(3)}, Final=$${uniqueAmountUSD.toFixed(3)}`);

        // Create new payment record
        const newPayment = new Payment({
            payId: newPayId,
            userId: oldPayment.userId,
            productId: product.productId,
            status: 'pending',
            amountUSD: uniqueAmountUSD,
            amountCrypto: parseFloat(amountCrypto),
            cryptoType: finalCryptoType,
            cryptoSymbol: finalCryptoType,
            network: finalNetwork || finalCryptoType,
            walletAddress,
            customerName: finalCustomerName,
            customerEmail: finalCustomerEmail,
            exchangeRate,
            priceTimestamp: new Date()
        });

        await newPayment.save();

        //console.log(`✅ Retry payment created: ${newPayId} (from ${oldPayId})`);

        return res.status(201).json({
            success: true,
            message: 'New payment created successfully',
            newPayId,
            payment: {
                payId: newPayId,
                amountUSD: uniqueAmountUSD,
                amountCrypto: parseFloat(amountCrypto),
                cryptoType: finalCryptoType,
                network: finalNetwork || finalCryptoType,
                walletAddress,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('❌ Retry payment error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retry payment'
        });
    }
}

module.exports = {
    validatePayment,
    processCoinSelection,
    getPaymentDetails,
    checkPaymentStatus,
    getAllPayments,
    getPaymentById,
    retryPayment
};
