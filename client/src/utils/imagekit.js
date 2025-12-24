const API_BASE_URL = import.meta.env.VITE_SERVER_URL || '';

/**
 * Upload image to ImageKit via server endpoint
 * @param {File} file - File object from input
 * @param {string} folder - Folder path in ImageKit
 * @returns {Promise} Upload result with URL
 */
export const uploadImageToImageKit = async (file, folder = 'QuantumPay/products') => {
    try {
        console.log('📤 Converting file to base64 for server upload...');
        
        // Convert file to base64
        const base64File = await fileToBase64(file);
        
        // Remove data URL prefix to get pure base64
        const base64Data = base64File.split(',')[1] || base64File;
        
        // Upload via server endpoint
        const uploadResponse = await fetch(`${API_BASE_URL}/api/imagekit/upload`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file: base64File, // Send full data URL for server to parse
                fileName: file.name,
                folder: folder
            })
        });
        
        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.message || 'Failed to upload image');
        }
        
        const result = await uploadResponse.json();
        
        if (result.success) {
            return {
                success: true,
                url: result.url,
                fileId: result.fileId,
                name: result.name
            };
        } else {
            throw new Error(result.error || 'Upload failed');
        }
    } catch (error) {
        console.error('ImageKit upload error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Convert file to base64 for preview
 * @param {File} file - File object
 * @returns {Promise<string>} Base64 string
 */
export const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

/**
 * Get optimized ImageKit URL
 * @param {string} url - Original ImageKit URL
 * @param {Object} transformations - Transformation parameters
 * @returns {string} Optimized URL
 */
export const getOptimizedImageUrl = (url, transformations = {}) => {
    if (!url || !url.includes('ik.imagekit.io')) return url;
    
    const defaultTransformations = {
        quality: 80,
        format: 'webp',
        ...transformations
    };
    
    const transformString = Object.entries(defaultTransformations)
        .map(([key, value]) => `${key}-${value}`)
        .join(',');
    
    // Insert transformations into URL
    return url.replace('/quantumpay/', `/quantumpay/tr:${transformString}/`);
};

/**
 * Validate file before upload
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export const validateImageFile = (file, options = {}) => {
    const {
        maxSize = 10 * 1024 * 1024, // 10MB default
        allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    } = options;

    // Check if file exists
    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
        return { 
            valid: false, 
            error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` 
        };
    }

    // Check file size
    if (file.size > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        return { 
            valid: false, 
            error: `File too large (${fileSizeMB}MB). Maximum size: ${maxSizeMB}MB` 
        };
    }

    return { valid: true };
};
