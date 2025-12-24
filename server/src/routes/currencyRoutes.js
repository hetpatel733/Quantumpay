const express = require('express');
const router = express.Router();
const {
    getExchangeRate,
    getMultipleRates,
    usdToCrypto,
    cryptoToUsd,
    getCacheStats,
    clearCache
} = require('../utils/currencyConverter');

// Get exchange rate for a single cryptocurrency
router.get('/rate/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const rate = await getExchangeRate(symbol);

        return res.status(200).json({
            success: true,
            symbol: symbol.toUpperCase(),
            rate,
            currency: 'USD',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Get rate error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch exchange rate'
        });
    }
});

// Get multiple exchange rates
router.post('/rates', async (req, res) => {
    try {
        const { symbols } = req.body;

        if (!symbols || !Array.isArray(symbols)) {
            return res.status(400).json({
                success: false,
                message: 'Symbols array is required'
            });
        }

        const rates = await getMultipleRates(symbols);

        return res.status(200).json({
            success: true,
            rates,
            currency: 'USD',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Get multiple rates error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch exchange rates'
        });
    }
});

// Convert USD to crypto
router.get('/convert/usd-to-crypto', async (req, res) => {
    try {
        const { amount, crypto: cryptoType } = req.query;

        if (!amount || !cryptoType) {
            return res.status(400).json({
                success: false,
                message: 'Amount and crypto type are required'
            });
        }

        const result = await usdToCrypto(parseFloat(amount), cryptoType);

        return res.status(200).json({
            success: true,
            from: { amount: parseFloat(amount), currency: 'USD' },
            to: { amount: result.amount, currency: result.symbol },
            rate: result.rate,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ USD to crypto conversion error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to convert USD to crypto'
        });
    }
});

// Convert crypto to USD
router.get('/convert/crypto-to-usd', async (req, res) => {
    try {
        const { amount, crypto: cryptoType } = req.query;

        if (!amount || !cryptoType) {
            return res.status(400).json({
                success: false,
                message: 'Amount and crypto type are required'
            });
        }

        const result = await cryptoToUsd(parseFloat(amount), cryptoType);

        return res.status(200).json({
            success: true,
            from: { amount: parseFloat(amount), currency: cryptoType.toUpperCase() },
            to: { amount: result.amount, currency: 'USD' },
            rate: result.rate,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Crypto to USD conversion error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to convert crypto to USD'
        });
    }
});

// Get cache statistics (for debugging)
router.get('/cache-stats', (req, res) => {
    const stats = getCacheStats();
    return res.status(200).json({
        success: true,
        ...stats
    });
});

// Clear cache (admin only - add auth middleware in production)
router.post('/clear-cache', (req, res) => {
    clearCache();
    return res.status(200).json({
        success: true,
        message: 'Cache cleared successfully'
    });
});

module.exports = router;
