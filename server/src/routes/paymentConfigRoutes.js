const express = require('express');
const router = express.Router();
const { getPaymentConfig, updatePaymentConfig, updateWalletAddress } = require('../services/paymentConfig');

// Get payment configuration
router.get('/:userId', getPaymentConfig);

// Update payment configuration
router.put('/:userId', updatePaymentConfig);

// Update single wallet address
router.put('/:userId/wallet', updateWalletAddress);

module.exports = router;
