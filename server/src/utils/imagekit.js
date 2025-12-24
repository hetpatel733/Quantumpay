const ImageKit = require('imagekit');

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

/**
 * Upload image to ImageKit
 * @param {string} file - Base64 encoded file or file buffer
 * @param {string} fileName - Name for the file
 * @param {string} folder - Folder path in ImageKit
 * @returns {Promise} ImageKit upload response
 */
const uploadImage = async (file, fileName, folder = '/') => {
    try {
        const result = await imagekit.upload({
            file,
            fileName,
            folder
        });
        return {
            success: true,
            url: result.url,
            fileId: result.fileId,
            name: result.name
        };
    } catch (error) {
        console.error('ImageKit upload error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Delete image from ImageKit
 * @param {string} fileId - ImageKit file ID
 * @returns {Promise} Deletion result
 */
const deleteImage = async (fileId) => {
    try {
        await imagekit.deleteFile(fileId);
        return { success: true };
    } catch (error) {
        console.error('ImageKit delete error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get authentication parameters for client-side upload
 * @returns {Object} Authentication parameters
 */
const getAuthenticationParameters = () => {
    const authenticationParameters = imagekit.getAuthenticationParameters();
    return authenticationParameters;
};

module.exports = {
    imagekit,
    uploadImage,
    deleteImage,
    getAuthenticationParameters
};
