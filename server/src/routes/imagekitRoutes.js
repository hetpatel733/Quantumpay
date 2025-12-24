const express = require('express');
const router = express.Router();
const { getAuthenticationParameters, uploadImage } = require('../utils/imagekit');

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

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No file provided'
            });
        }

        console.log(`📤 Server uploading to ImageKit: ${fileName} to ${folder}`);

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
        console.error('ImageKit upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload image',
            error: error.message
        });
    }
});

module.exports = router;
