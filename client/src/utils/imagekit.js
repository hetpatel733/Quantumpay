const API_BASE_URL = import.meta.env.VITE_SERVER_URL || '';

/**
 * Upload image to ImageKit via server endpoint
 * @param {File} file - File object from input
 * @param {string} folder - Folder path in ImageKit
 * @returns {Promise} Upload result with URL
 */
export const uploadImageToImageKit = async (file, folder = 'QuantumPay/products') => {
    try {
        console.log('📤 Starting image upload to server...');
        
        // Validate API URL
        if (!API_BASE_URL) {
            throw new Error('Server URL not configured. Please check your environment variables.');
        }
        
        // Convert file to base64
        const base64File = await fileToBase64(file);
        
        console.log(`📦 Uploading to: ${API_BASE_URL}/api/imagekit/upload`);
        
        // Upload via server endpoint
        const uploadResponse = await fetch(`${API_BASE_URL}/api/imagekit/upload`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                file: base64File,
                fileName: `${Date.now()}_${file.name}`,
                folder: folder
            })
        });
        
        console.log(`📡 Upload response status: ${uploadResponse.status}`);
        
        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { message: errorText };
            }
            throw new Error(errorData.message || `Upload failed with status ${uploadResponse.status}`);
        }
        
        const result = await uploadResponse.json();
        
        if (result.success) {
            console.log('✅ Image uploaded successfully:', result.url);
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
        console.error('❌ ImageKit upload error:', error);
        
        // Provide user-friendly error messages
        let errorMessage = error.message;
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Cannot connect to server. Please check your internet connection.';
        } else if (error.message.includes('CORS')) {
            errorMessage = 'Server configuration error. Please contact support.';
        }
        
        return {
            success: false,
            error: errorMessage
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
