const express = require('express');
const router = express.Router();
const { BusinessAPI } = require('../models/BusinessAPI');
const { authenticateUser } = require('../services/auth');
const crypto = require('crypto');

// Get all API keys for authenticated user
router.get('/', authenticateUser, async (req, res) => {
  try {
    console.log('🔍 Fetching API keys for:', req.user.email);

    const apiKeys = await BusinessAPI.find({
      businessEmail: req.user.email
    });

    console.log('📤 Found API keys:', apiKeys.length);

    // Transform the data to include safe fields with proper field mapping
    const safeApiKeys = apiKeys.map(key => ({
      _id: key._id,
      label: key.label,
      key: key.key,
      secret: key.secret ? `${key.secret.substring(0, 20)}...` : '',
      permissions: key.permissions,
      isActive: key.isActive,
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
      usageCount: key.usageCount || 0
    }));

    res.status(200).json({
      success: true,
      apiKeys: safeApiKeys,
      isEmpty: safeApiKeys.length === 0
    });
  } catch (error) {
    console.error('❌ Error fetching API keys:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Create new API key
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { label, permissions } = req.body;

    if (!label || !permissions) {
      return res.status(400).json({
        success: false,
        message: 'Label and permissions are required'
      });
    }

    console.log('🔄 Creating API key for:', req.user.email, 'Label:', label);

    // Generate unique API key and secret
    const apiKey = `qp_${crypto.randomBytes(16).toString('hex')}`;
    const apiSecret = `qpsec_${crypto.randomBytes(32).toString('hex')}`;

    const newApiKey = new BusinessAPI({
      businessEmail: req.user.email,
      label,
      key: apiKey,
      secret: apiSecret,
      permissions: Array.isArray(permissions) ? permissions : [permissions],
      isActive: true,
      usageCount: 0,
      lastUsed: null
    });

    await newApiKey.save();
    console.log('✅ API key created successfully');

    // Return the new API key with full details (including secret for initial display)
    res.status(201).json({
      success: true,
      apiKey: {
        _id: newApiKey._id,
        label: newApiKey.label,
        key: newApiKey.key,
        secret: newApiKey.secret, // Return full secret only on creation
        permissions: newApiKey.permissions,
        isActive: newApiKey.isActive,
        createdAt: newApiKey.createdAt,
        lastUsed: newApiKey.lastUsed,
        usageCount: newApiKey.usageCount || 0
      },
      message: 'API key created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating API key:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Update API key
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { label, permissions, isActive } = req.body;

    console.log('🔄 Updating API key:', id, 'for:', req.user.email);

    const apiKey = await BusinessAPI.findOne({
      _id: id,
      businessEmail: req.user.email
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    // Update fields
    if (label !== undefined) apiKey.label = label;
    if (permissions !== undefined) apiKey.permissions = Array.isArray(permissions) ? permissions : [permissions];
    if (isActive !== undefined) {
      apiKey.isActive = isActive;
      
      // Add validation message when API is being paused/activated
      if (!isActive) {
        console.log('⚠️ API key being paused:', id, '- Payment processing will be disabled');
      } else {
        console.log('✅ API key being activated:', id, '- Payment processing will be enabled');
      }
    }

    await apiKey.save();
    console.log('✅ API key updated successfully');

    res.status(200).json({
      success: true,
      apiKey: {
        _id: apiKey._id,
        label: apiKey.label,
        key: apiKey.key,
        permissions: apiKey.permissions,
        isActive: apiKey.isActive,
        createdAt: apiKey.createdAt,
        lastUsed: apiKey.lastUsed,
        usageCount: apiKey.usageCount || 0
      },
      message: `API key updated successfully${!isActive ? ' - Payment processing is now paused' : isActive ? ' - Payment processing is now active' : ''}`
    });
  } catch (error) {
    console.error('❌ Error updating API key:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Delete API key
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔄 Deleting API key:', id, 'for:', req.user.email);

    const result = await BusinessAPI.findOneAndDelete({
      _id: id,
      businessEmail: req.user.email
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    console.log('✅ API key deleted successfully');

    res.status(200).json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting API key:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

module.exports = router;
