const express = require('express');
const router = express.Router();
const { getAuthenticationParameters, uploadImage } = require('../utils/imagekit');

// Add CORS headers to all imagekit routes
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Get auth parameters for client-side upload (keeping for compatibility)
router.get('/auth', (req, res) => {
    try {
        const authParams = getAuthenticationParameters();
        res.status(200).json(authParams);
    } catch (error) {
        console.error('ImageKit auth error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get authentication parameters'
        });
    }
});

// Server-side upload endpoint
router.post('/upload', async (req, res) => {
    try {
        const { file, fileName, folder } = req.body;

        console.log(`📤 Upload request received for: ${fileName}`);

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No file provided'
            });
        }

        // Validate ImageKit configuration
        if (!process.env.IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY || !process.env.IMAGEKIT_URL_ENDPOINT) {
            console.error('❌ ImageKit configuration missing');
            return res.status(500).json({
                success: false,
                message: 'ImageKit is not configured properly',
                error: 'Missing environment variables'
            });
        }

        const uploadResult = await uploadImage(file, fileName, folder);

        if (uploadResult.success) {
            console.log(`✅ Image uploaded successfully: ${uploadResult.url}`);
            return res.status(200).json(uploadResult);
        } else {
            console.error(`❌ Upload failed: ${uploadResult.error}`);
            return res.status(500).json({
                success: false,
                message: 'Failed to upload image',
                error: uploadResult.error
            });
        }
    } catch (error) {
        console.error('❌ ImageKit upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload image',
            error: error.message
        });
    }
});

module.exports = router;
