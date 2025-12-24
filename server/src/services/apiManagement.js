const { BusinessAPI } = require('../models/BusinessAPI');
const { User } = require('../models/User');
const crypto = require('crypto');

// GET ALL API KEYS FOR USER
async function getAllApiKeys(req, res) {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        console.log(`📋 Fetching API keys for user: ${userId}`);

        const apiKeys = await BusinessAPI.find({ userId }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            apiKeys: apiKeys.map(key => ({
                id: key._id,
                label: key.label || `${key.type} API Key`,
                key: key.key,
                secret: key.secret,
                type: key.type,
                isActive: key.isActive,
                permissions: key.permissions || ['read'],
                usageCount: key.usageCount || 0,
                createdAt: key.createdAt,
                lastUsed: key.lastUsed
            })),
            isEmpty: apiKeys.length === 0
        });

    } catch (error) {
        console.error('❌ Get API keys error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch API keys'
        });
    }
}

// CREATE NEW API KEY
async function createApiKey(req, res) {
    try {
        const { userId, label, type, permissions } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        console.log(`🔑 Creating new API key for user: ${userId}`);

        // Verify user exists and is a business user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.role !== 'business') {
            return res.status(403).json({
                success: false,
                message: 'Only business users can create API keys'
            });
        }

        // Generate API key and secret
        const keyType = type || 'live';
        const apiKey = `qp_${keyType}_${crypto.randomBytes(16).toString('hex')}`;
        const apiSecret = `qps_${crypto.randomBytes(24).toString('hex')}`;

        // Create new API key
        const newApiKey = new BusinessAPI({
            userId,
            label: label || `${keyType} API Key`,
            key: apiKey,
            secret: apiSecret,
            type: keyType,
            isActive: true,
            permissions: permissions || ['read'],
            usageCount: 0
        });

        await newApiKey.save();

        console.log(`✅ API key created: ${apiKey}`);

        return res.status(201).json({
            success: true,
            message: 'API key created successfully',
            apiKey: {
                id: newApiKey._id,
                label: newApiKey.label,
                key: newApiKey.key,
                secret: newApiKey.secret,
                type: newApiKey.type,
                isActive: newApiKey.isActive,
                permissions: newApiKey.permissions,
                usageCount: newApiKey.usageCount,
                createdAt: newApiKey.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Create API key error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create API key'
        });
    }
}

// UPDATE API KEY (Toggle active/inactive, change type, update permissions)
async function updateApiKey(req, res) {
    try {
        const { keyId } = req.params;
        const { isActive, type, label, permissions } = req.body;

        if (!keyId) {
            return res.status(400).json({
                success: false,
                message: 'API Key ID is required'
            });
        }

        console.log(`📝 Updating API key: ${keyId}`);

        const apiKey = await BusinessAPI.findById(keyId);
        if (!apiKey) {
            return res.status(404).json({
                success: false,
                message: 'API key not found'
            });
        }

        // Update fields
        if (isActive !== undefined) {
            apiKey.isActive = isActive;
            console.log(`🔄 API key ${isActive ? 'activated' : 'paused'}`);
        }

        if (type !== undefined) {
            apiKey.type = type;
            console.log(`🔄 API key type changed to: ${type}`);
        }

        if (label !== undefined) {
            apiKey.label = label;
        }

        if (permissions !== undefined) {
            apiKey.permissions = permissions;
        }

        await apiKey.save();

        console.log(`✅ API key updated: ${keyId}`);

        return res.status(200).json({
            success: true,
            message: 'API key updated successfully',
            apiKey: {
                id: apiKey._id,
                label: apiKey.label,
                key: apiKey.key,
                type: apiKey.type,
                isActive: apiKey.isActive,
                permissions: apiKey.permissions,
                usageCount: apiKey.usageCount,
                createdAt: apiKey.createdAt,
                lastUsed: apiKey.lastUsed
            }
        });

    } catch (error) {
        console.error('❌ Update API key error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update API key'
        });
    }
}

// PAUSE/RESUME API KEY
async function toggleApiKey(req, res) {
    try {
        const { keyId } = req.params;

        if (!keyId) {
            return res.status(400).json({
                success: false,
                message: 'API Key ID is required'
            });
        }

        console.log(`⏯️ Toggling API key: ${keyId}`);

        const apiKey = await BusinessAPI.findById(keyId);
        if (!apiKey) {
            return res.status(404).json({
                success: false,
                message: 'API key not found'
            });
        }

        // Toggle active status
        apiKey.isActive = !apiKey.isActive;
        await apiKey.save();

        console.log(`✅ API key ${apiKey.isActive ? 'activated' : 'paused'}`);

        return res.status(200).json({
            success: true,
            message: `API key ${apiKey.isActive ? 'activated' : 'paused'} successfully`,
            apiKey: {
                id: apiKey._id,
                isActive: apiKey.isActive
            }
        });

    } catch (error) {
        console.error('❌ Toggle API key error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to toggle API key status'
        });
    }
}

// DELETE API KEY
async function deleteApiKey(req, res) {
    try {
        const { keyId } = req.params;

        if (!keyId) {
            return res.status(400).json({
                success: false,
                message: 'API Key ID is required'
            });
        }

        console.log(`🗑️ Deleting API key: ${keyId}`);

        const apiKey = await BusinessAPI.findByIdAndDelete(keyId);
        if (!apiKey) {
            return res.status(404).json({
                success: false,
                message: 'API key not found'
            });
        }

        console.log(`✅ API key deleted: ${keyId}`);

        return res.status(200).json({
            success: true,
            message: 'API key deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete API key error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete API key'
        });
    }
}

// GET API KEY USAGE STATISTICS
async function getApiKeyStats(req, res) {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        console.log(`📊 Fetching API key stats for user: ${userId}`);

        const apiKeys = await BusinessAPI.find({ userId });

        const stats = {
            totalKeys: apiKeys.length,
            activeKeys: apiKeys.filter(key => key.isActive).length,
            inactiveKeys: apiKeys.filter(key => !key.isActive).length,
            totalUsage: apiKeys.reduce((sum, key) => sum + (key.usageCount || 0), 0),
            keysByType: {
                live: apiKeys.filter(key => key.type === 'live').length,
                test: apiKeys.filter(key => key.type === 'test').length
            }
        };

        return res.status(200).json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('❌ Get API key stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch API key statistics'
        });
    }
}

module.exports = {
    getAllApiKeys,
    createApiKey,
    updateApiKey,
    toggleApiKey,
    deleteApiKey,
    getApiKeyStats
};
