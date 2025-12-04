const express = require('express');
const router = express.Router();
const { BusinessAPI } = require('../models/BusinessAPI');
const { Order } = require('../models/Order');
const { PaymentConfiguration } = require('../models/PaymentConfiguration');

// Validate payment request and return enabled cryptocurrencies (NO AUTHENTICATION - for customer use)
router.get('/validate-payment', async (req, res) => {
  try {
    const { api, order_id } = req.query;
    
    console.log('🔍 Validating payment request:', { api: api?.substring(0, 10) + '...', order_id });
    
    if (!api || !order_id) {
      return res.status(400).json({
        success: false,
        message: 'API key and Order ID are required'
      });
    }

    // Validate API key
    const apiRecord = await BusinessAPI.findOne({ key: api });
    if (!apiRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid API key'
      });
    }

    if (!apiRecord.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Payment processing is currently paused by the merchant. Please contact support.',
        errorCode: 'API_PAUSED'
      });
    }

    // Validate order
    const order = await Order.findOne({ orderId: order_id });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!order.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This product/service has been deactivated and is no longer available for purchase.',
        errorCode: 'ORDER_DEACTIVATED'
      });
    }

    // Get payment configuration for enabled cryptocurrencies
    const paymentConfig = await PaymentConfiguration.findOne({
      businessEmail: apiRecord.businessEmail
    });

    let enabledCryptos = [];
    
    if (paymentConfig && paymentConfig.cryptoConfigurations) {
      enabledCryptos = paymentConfig.cryptoConfigurations
        .filter(crypto => crypto.enabled && crypto.address && crypto.address.trim() !== '')
        .map(crypto => ({
          coinType: crypto.coinType,
          symbol: crypto.coinType,
          name: getCryptoDisplayName(crypto.coinType),
          network: crypto.network,
          address: crypto.address,
          label: crypto.label
        }));
    }

    // Get real-time prices for enabled cryptocurrencies
    let cryptoPrices = {};
    try {
      const pricingService = require('../services/pricingService');
      const enabledSymbols = [...new Set(enabledCryptos.map(c => c.coinType))];
      cryptoPrices = await pricingService.getMultipleCryptoPrices(enabledSymbols);
      console.log('💰 Current crypto prices:', cryptoPrices);
    } catch (error) {
      console.error('❌ Error fetching crypto prices:', error);
      // Continue without prices - will use fallback in payment creation
    }

    console.log(`✅ Found ${enabledCryptos.length} enabled cryptocurrencies for ${apiRecord.businessEmail}`);

    res.status(200).json({
      success: true,
      order: {
        orderId: order.orderId,
        productName: order.productName,
        amount: order.amountUSD,
        isActive: order.isActive
      },
      enabledCryptos,
      cryptoPrices,
      apiStatus: {
        isActive: apiRecord.isActive
      },
      priceTimestamp: new Date()
    });

  } catch (error) {
    console.error('❌ Payment validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});

// Add specific payment details endpoint
router.get('/payment-details', async (req, res) => {
  const { getPaymentDetails } = require('../services/payment');
  getPaymentDetails(req, res);
});

// Add specific payment status endpoint
router.get('/check-status', async (req, res) => {
  const { checkstatus } = require('../services/payment');
  checkstatus(req, res);
});

// Add coinselect endpoint
router.post('/coinselect', async (req, res) => {
  const { CoinselectFunction } = require('../services/payment');
  CoinselectFunction(req, res);
});

// Helper function to get display names including new cryptocurrencies
function getCryptoDisplayName(coinType) {
  const names = {
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'USDT': 'Tether',
    'USDC': 'USD Coin',
    'MATIC': 'Polygon',
    'SOL': 'Solana'
  };
  return names[coinType] || coinType;
}

module.exports = router;
