const express = require('express');
const router = express.Router();
const {
    getAllApiKeys,
    createApiKey,
    updateApiKey,
    toggleApiKey,
    deleteApiKey,
    getApiKeyStats
} = require('../services/apiManagement');

// Get all API keys for a user
router.get('/', getAllApiKeys);

// Get API key statistics
router.get('/stats', getApiKeyStats);

// Create new API key
router.post('/', createApiKey);

// Update API key (change type, permissions, label)
router.put('/:keyId', updateApiKey);

// Toggle API key active status
router.patch('/:keyId/toggle', toggleApiKey);

// Delete API key
router.delete('/:keyId', deleteApiKey);

module.exports = router;
