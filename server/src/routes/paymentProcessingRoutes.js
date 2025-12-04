const express = require('express');
const router = express.Router();
const { 
  paymentFunction, 
  CoinselectFunction, 
  FinalpayFunction, 
  checkstatus,
  getPaymentDetails,
  validateApiAndOrder 
} = require('../services/payment');

// Coin selection and payment creation (NO AUTHENTICATION - for customer use)
router.post('/coinselect', (req, res) => {
  CoinselectFunction(req, res);
});

// Get payment details for frontend (NO AUTHENTICATION - for customer use)
router.get('/payment-details', async (req, res) => {
  getPaymentDetails(req, res);
});

// Check payment status (NO AUTHENTICATION - for customer use)
router.get('/check-status', async (req, res) => {
  checkstatus(req, res);
});

// Validate payment request for coin selection (NO AUTHENTICATION - for customer use)
router.get('/validate-payment', async (req, res) => {
  validateApiAndOrder(req, res);
});

// Legacy routes for backward compatibility (NO AUTHENTICATION - for customer use)
router.get('/process/:api/:order_id', async (req, res) => {
  const { api, order_id } = req.params;
  paymentFunction(api, order_id, res);
});

// Add missing root route for payment processing (NO AUTHENTICATION - for customer use)
router.get('/:api/:order_id', async (req, res) => {
  const { api, order_id } = req.params;
  paymentFunction(api, order_id, res);
});

// Final payment processing (background) (NO AUTHENTICATION - for customer use)
router.get('/finalize', async (req, res) => {
  FinalpayFunction(req, res);
});

// Payment configuration routes
router.use('/config', require('./paymentConfigRoutes'));

module.exports = router;
