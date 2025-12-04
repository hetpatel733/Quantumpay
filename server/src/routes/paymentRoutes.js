const express = require('express');
const router = express.Router();
const { Payment } = require('../models/Payment');
const { Order } = require('../models/Order');
const { PaymentConfiguration } = require('../models/PaymentConfiguration');
const { authenticateUser } = require('../services/auth');
const crypto = require('crypto');
const { updatePaymentMetrics } = require('../services/dashboardMetricsService');

// Generate a unique payment ID
const generatePaymentId = () => {
  return 'PAY-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
};

// Get all payments for the authenticated business
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { status, limit = 20, skip = 0, sortBy = 'createdAt', sortOrder = 'desc', cryptoType, network } = req.query;
    
    console.log('🔍 Fetching payments for:', req.user.email);
    console.log('🔍 Query params:', { status, limit, skip, sortBy, sortOrder, cryptoType, network });
    
    // First, let's check if any payments exist at all
    const totalPaymentsInDB = await Payment.countDocuments({});
    console.log('💾 Total payments in database:', totalPaymentsInDB);
    
    // Check payments for this specific business
    const businessPaymentsCount = await Payment.countDocuments({ businessEmail: req.user.email });
    console.log('🏢 Payments for this business:', businessPaymentsCount);
    
    // Build query - fix the status filter issue
    const query = { businessEmail: req.user.email };
    
    // Only add status filter if it's a valid status value
    if (status && status !== 'all' && status !== 'undefined' && status !== undefined && status !== 'null') {
      query.status = status;
      console.log('🔍 Adding status filter:', status);
    } else {
      console.log('🔍 No status filter applied (showing all payments)');
    }

    // Add crypto type filter
    if (cryptoType && cryptoType !== 'all') {
      query.cryptoType = cryptoType;
      console.log('🔍 Adding crypto type filter:', cryptoType);
    }

    // Add network filter
    if (network && network !== 'all') {
      query.network = network;
      console.log('🔍 Adding network filter:', network);
    }
    
    console.log('🔍 Final query:', query);
    
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Get payments with detailed logging
    const payments = await Payment.find(query)
      .sort(sort)
      .skip(Number(skip))
      .limit(Number(limit))
      .lean(); // Use lean for better performance
    
    const total = await Payment.countDocuments(query);
    
    console.log('📦 Found payments:', payments.length, 'Total:', total);
    
    // If no payments found, let's get some sample data for debugging
    if (payments.length === 0 && businessPaymentsCount > 0) {
      console.log('🔍 No payments found with current query. Checking sample payments in DB...');
      const samplePayments = await Payment.find({ businessEmail: req.user.email }).limit(3).lean();
      console.log('📋 Sample payments for this business:', samplePayments.map(p => ({
        payId: p.payId,
        businessEmail: p.businessEmail,
        status: p.status,
        cryptoType: p.cryptoType,
        network: p.network,
        createdAt: p.createdAt
      })));
    }
    
    // Transform payments to ensure consistent data structure
    const transformedPayments = payments.map(payment => ({
      payId: payment.payId,
      id: payment.payId, // Add id for compatibility
      orderId: payment.orderId,
      businessEmail: payment.businessEmail,
      customerEmail: payment.customerEmail,
      customerName: payment.customerName,
      amountUSD: payment.amountUSD,
      amountCrypto: payment.amountCrypto,
      cryptoType: payment.cryptoType,
      cryptoSymbol: payment.cryptoSymbol || payment.cryptoType,
      network: payment.network || 'Unknown',
      status: payment.status,
      hash: payment.hash,
      createdAt: payment.createdAt,
      completedAt: payment.completedAt,
      exchangeRate: payment.exchangeRate
    }));
    
    console.log('✅ Returning transformed payments:', transformedPayments.length);
    
    res.status(200).json({
      success: true,
      payments: transformedPayments,
      pagination: {
        total,
        skip: Number(skip),
        limit: Number(limit),
        hasMore: Number(skip) + Number(limit) < total
      },
      debug: {
        totalInDB: totalPaymentsInDB,
        businessCount: businessPaymentsCount,
        queryUsed: query,
        originalStatus: req.query.status
      }
    });
  } catch (error) {
    console.error('❌ Error fetching payments:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Get payments for a specific order
router.get('/order/:orderId', authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Verify the product belongs to this business
    const order = await Order.findOne({ 
      orderId,
      businessEmail: req.user.email
    });
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    const payments = await Payment.find({ 
      orderId,
      businessEmail: req.user.email
    }).sort({ createdAt: -1 });
    
    res.status(200).json({ success: true, payments });
  } catch (error) {
    console.error('Error fetching payments for product:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get a specific payment
router.get('/:payId', authenticateUser, async (req, res) => {
  try {
    const { payId } = req.params;
    
    console.log('🔍 Fetching payment:', payId, 'for user:', req.user.email);
    
    const payment = await Payment.findOne({ payId });
    
    if (!payment) {
      console.log('❌ Payment not found:', payId);
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    
    // Verify the payment belongs to this business
    if (payment.businessEmail !== req.user.email) {
      console.log('❌ Unauthorized access attempt:', req.user.email, 'tried to access payment for:', payment.businessEmail);
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Check associated order (product availability)
    const order = await Order.findOne({ orderId: payment.orderId });
    if (order) {
      // Add order info to payment data for reference
      payment.productName = order.productName;
      payment.productIsActive = order.isActive;
    }
    
    // Get payment configuration to include wallet address with network support
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

    const enrichedPayment = {
      ...payment.toObject(),
      walletAddress: walletAddress,
      network: payment.network || 'Unknown'
    };
    
    console.log('✅ Payment found and enriched:', payId);
    res.status(200).json({ success: true, payment: enrichedPayment });
  } catch (error) {
    console.error('❌ Error fetching payment:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Update payment status (manually) - Remove order status updates
router.put('/:payId/status', authenticateUser, async (req, res) => {
  try {
    const { payId } = req.params;
    const { status, hash } = req.body;
    
    if (!status || !['pending', 'completed', 'failed', 'cancelled'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status'
      });
    }
    
    const payment = await Payment.findOne({ payId });
    
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    
    // Verify the payment belongs to this business
    if (payment.businessEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    // Store previous status for metrics update
    const previousStatus = payment.status;
    
    // Update payment status
    payment.status = status;
    
    if (status === 'completed') {
      payment.completedAt = new Date();
      if (hash) payment.hash = hash;
    } else if (status === 'failed') {
      payment.failureReason = req.body.failureReason || 'Manual status update';
    }
    
    await payment.save();
    
    // Update dashboard metrics
    try {
      await updatePaymentMetrics(payment, previousStatus);
      console.log('📊 Dashboard metrics updated for manual status change');
    } catch (metricsError) {
      console.error('❌ Error updating dashboard metrics:', metricsError);
    }
    
    // DO NOT update order status - orders are products that can be purchased multiple times
    // Payment completion/failure doesn't affect product availability
    
    res.status(200).json({ 
      success: true, 
      payment,
      message: `Payment status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Cancel a payment
router.post('/:payId/cancel', authenticateUser, async (req, res) => {
  try {
    const { payId } = req.params;
    
    const payment = await Payment.findOne({ payId });
    
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    
    // Verify the payment belongs to this business
    if (payment.businessEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    // Only pending payments can be cancelled
    if (payment.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Payment cannot be cancelled in ${payment.status} status` 
      });
    }
    
    payment.status = 'cancelled';
    await payment.save();
    
    res.status(200).json({ 
      success: true, 
      payment,
      message: 'Payment cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling payment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Debug endpoint to create a test payment (only for development)
router.post('/debug/create-test', authenticateUser, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'Not available in production' });
    }
    
    console.log('🧪 Creating test payment for:', req.user.email);
    
    const testPayment = new Payment({
      payId: 'TEST-' + Date.now(),
      orderId: 'ORDER-TEST-' + Date.now(),
      businessEmail: req.user.email,
      customerEmail: 'test@customer.com',
      customerName: 'Test Customer',
      amountUSD: 100,
      amountCrypto: 100.01,
      cryptoType: 'USDT',
      cryptoSymbol: 'USDT',
      network: 'Polygon',
      exchangeRate: 1.0,
      status: 'pending'
    });
    
    await testPayment.save();
    console.log('✅ Test payment created:', testPayment.payId);
    
    res.json({
      success: true,
      payment: testPayment,
      message: 'Test payment created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating test payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new endpoint to get payment statistics by network
router.get('/stats/networks', authenticateUser, async (req, res) => {
  try {
    const networkStats = await Payment.getNetworkStats(req.user.email);
    
    res.status(200).json({
      success: true,
      networkStats
    });
  } catch (error) {
    console.error('❌ Error fetching network stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Add the missing payment details endpoint (NO AUTHENTICATION - for customer use)
router.get('/payment-details', async (req, res) => {
  try {
    const { payid } = req.query;
    
    if (!payid) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required'
      });
    }

    console.log('🔍 Fetching payment details for payid:', payid);

    const payment = await Payment.findOne({ payId: payid });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Get order details to check if it's still active
    const { Order } = require('../models/Order');
    const order = await Order.findOne({ orderId: payment.orderId });
    
    // Get business API status
    const { BusinessAPI } = require('../models/BusinessAPI');
    const businessAPI = await BusinessAPI.findOne({ businessEmail: payment.businessEmail });

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

    return res.status(200).json({
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
        address: walletAddress,
        // Add order and API status information
        orderStatus: order?.status,
        orderIsActive: order?.isActive,
        apiStatus: businessAPI ? { isActive: businessAPI.isActive } : null,
        apiIsActive: businessAPI?.isActive
      }
    });

  } catch (error) {
    console.error("❌ Error fetching payment details:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Add the missing payment status check endpoint (NO AUTHENTICATION - for customer use)
router.get('/check-status', async (req, res) => {
  try {
    const { payid } = req.query;

    if (!payid) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing payid" 
      });
    }

    console.log('🔍 Checking payment status for payid:', payid);

    const payment = await Payment.findOne({ payId: payid });

    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: "Payment ID not found" 
      });
    }

    // Get order details to check if it's still active
    const { Order } = require('../models/Order');
    const order = await Order.findOne({ orderId: payment.orderId });
    
    // Get business API status
    const { BusinessAPI } = require('../models/BusinessAPI');
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
});

module.exports = router;
