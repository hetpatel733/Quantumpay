const express = require('express');
const router = express.Router();
const { Order } = require('../models/Order');
const { BusinessAPI } = require('../models/BusinessAPI');
const { authenticateUser, validateApiKey } = require('../services/auth');
const crypto = require('crypto');

// Generate a unique order ID
const generateOrderId = () => {
  return 'ORD-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
};

// Public product creation endpoint with API key validation
router.post('/public', validateApiKey, async (req, res) => {
  try {
    const { productName, amountUSD, customerEmail, description, metadata } = req.body;

    if (!productName || !amountUSD) {
      return res.status(400).json({
        success: false,
        message: 'Product name and amount are required'
      });
    }

    // Check if API key is active
    if (!req.apiKey.isActive) {
      return res.status(403).json({
        success: false,
        message: "Payment processing is currently paused. Products cannot be created at this time.",
        errorCode: "API_PAUSED"
      });
    }

    const orderId = generateOrderId();

    const order = new Order({
      orderId,
      businessEmail: req.apiKey.businessEmail,
      productName,
      amountUSD,
      customerEmail: customerEmail || '',
      description: description || '',
      isActive: true, // Only isActive field, no status
      metadata: metadata || {}
    });

    await order.save();

    res.status(201).json({
      success: true,
      order,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Error creating public product:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all orders for the authenticated business
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { isActive, limit = 20, skip = 0, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build filter object
    const filter = { businessEmail: req.user.email };
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const orders = await Order.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    res.status(200).json({ 
      success: true, 
      orders,
      count: orders.length
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get a specific order
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify the user owns this order
    if (order.businessEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new order
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { productName, amountUSD, description, category, isActive } = req.body;

    console.log('🔄 Creating new order for:', req.user.email);
    console.log('📦 Order data:', { productName, amountUSD, description, category, isActive });

    // Validate required fields
    if (!productName || !productName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required'
      });
    }

    if (!amountUSD || amountUSD <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount in USD is required'
      });
    }

    // Generate unique order ID
    const orderId = generateOrderId();

    // Create order object (no crypto-specific fields)
    const orderData = {
      orderId,
      businessEmail: req.user.email,
      productName: productName.trim(),
      amountUSD: parseFloat(amountUSD),
      description: description ? description.trim() : '',
      category: category ? category.trim() : '',
      isActive: isActive !== undefined ? isActive : true
    };

    const order = new Order(orderData);
    await order.save();

    console.log('✅ Order created successfully:', order.orderId);

    res.status(201).json({
      success: true,
      order,
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// Update an order
router.put('/:orderId', authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { productName, description, amountUSD, isActive } = req.body;
    
    console.log('🔄 Updating order:', orderId, 'for user:', req.user.email);
    
    // Find the order and ensure it belongs to the authenticated user
    const order = await Order.findOne({
      _id: orderId,
      businessEmail: req.user.email
    });
    
    if (!order) {
      console.log('❌ Order not found or access denied:', orderId);
      return res.status(404).json({
        success: false,
        message: 'Order not found or access denied'
      });
    }
    
    // Update fields if provided
    if (productName !== undefined) order.productName = productName;
    if (description !== undefined) order.description = description;
    if (amountUSD !== undefined) order.amountUSD = amountUSD;
    if (isActive !== undefined) order.isActive = isActive;
    
    await order.save();
    
    console.log('✅ Order updated successfully:', order.orderId);
    
    res.status(200).json({
      success: true,
      order,
      message: 'Order updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Deactivate a product
router.post('/:id/deactivate', authenticateUser, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Verify the user owns this product
    if (order.businessEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Deactivate the product
    order.isActive = false;
    await order.save();

    res.status(200).json({
      success: true,
      order,
      message: 'Product deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating product:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete an order
router.delete('/:orderId', authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    console.log('🗑️ Deleting order:', orderId, 'for user:', req.user.email);
    
    // Find and delete the order, ensuring it belongs to the authenticated user
    const order = await Order.findOneAndDelete({
      _id: orderId,
      businessEmail: req.user.email
    });
    
    if (!order) {
      console.log('❌ Order not found or access denied:', orderId);
      return res.status(404).json({
        success: false,
        message: 'Order not found or access denied'
      });
    }
    
    console.log('✅ Order deleted successfully:', order.orderId);
    
    res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Toggle product active status - Simplified
router.put('/:orderId/toggle', authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log('🔄 Toggling product status for orderId:', orderId, 'user:', req.user.email);

    const order = await Order.findOne({
      orderId,
      businessEmail: req.user.email
    });

    if (!order) {
      console.log('❌ Product not found:', orderId);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    console.log('📋 Current product isActive:', order.isActive);

    // Toggle the active status
    order.isActive = !order.isActive;
    await order.save();

    console.log('✅ Product status toggled to:', order.isActive);

    res.status(200).json({
      success: true,
      order: {
        _id: order._id,
        orderId: order.orderId,
        productName: order.productName,
        amountUSD: order.amountUSD,
        isActive: order.isActive,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      },
      message: `Product ${order.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('❌ Error toggling product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});


module.exports = router;
