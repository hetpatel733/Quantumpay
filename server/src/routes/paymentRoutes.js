const express = require('express');
const router = express.Router();
const {
    validatePayment,
    processCoinSelection,
    getPaymentDetails,
    checkPaymentStatus,
    getAllPayments,
    getPaymentById,
    retryPayment
} = require('../services/paymentService');

// Validate payment request (check API key, product, enabled cryptos)
router.get('/validate-payment', validatePayment);

// Process coin selection and create payment
router.post('/coinselect', processCoinSelection);

// Get payment details for final payment page
router.get('/payment-details', getPaymentDetails);

// Check payment status (for polling)
router.get('/check-status', checkPaymentStatus);

// Get all payments for a user (dashboard)
router.get('/', getAllPayments);

// Get single payment by ID
router.get('/:paymentId', getPaymentById);

// Retry failed payment
router.post('/retry', retryPayment);

module.exports = router;
