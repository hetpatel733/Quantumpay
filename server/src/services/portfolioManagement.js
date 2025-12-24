const { Product } = require('../models/Product');
const { User } = require('../models/User');
const { BusinessAPI } = require('../models/BusinessAPI');
const crypto = require('crypto');
const { uploadImage } = require('../utils/imagekit');

// GET ALL PORTFOLIO ITEMS (ORDERS)
async function getAllPortfolioItems(req, res) {
    try {
        const { userId, limit = 100, sortBy = 'createdAt', sortOrder = 'desc', status } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        console.log(`📋 Fetching portfolio items for user: ${userId}`);

        // Build query
        const query = { userId };
        if (status && status !== 'all') {
            query.isActive = status === 'active';
        }

        // Build sort object
        const sortObject = {};
        sortObject[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const products = await Product.find(query)
            .sort(sortObject)
            .limit(parseInt(limit));

        console.log(`✅ Found ${products.length} portfolio items`);
        return res.status(200).json({
            success: true,
            products: products.map(product => ({
                _id: product._id,
                productId: product.productId,
                productName: product.productName,
                description: product.description,
                amountUSD: product.amountUSD,
                image: product.image,
                isActive: product.isActive,
                businessEmail: product.businessEmail,
                salesCount: product.salesCount || 0,
                totalVolume: product.totalVolume || 0,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt
            })),
            isEmpty: products.length === 0
        });

    } catch (error) {
        console.error('❌ Get portfolio items error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch portfolio items'
        });
    }
}

// GET SINGLE PORTFOLIO ITEM BY ID
async function getPortfolioItemById(req, res) {
    try {
        const { itemId } = req.params;

        if (!itemId) {
            return res.status(400).json({
                success: false,
                message: 'Item ID is required'
            });
        }

        console.log(`📋 Fetching portfolio item: ${itemId}`);

        const product = await Product.findById(itemId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio item not found'
            });
        }

        return res.status(200).json({
            success: true,
            product: {
                _id: product._id,
                productId: product.productId,
                productName: product.productName,
                description: product.description,
                amountUSD: product.amountUSD,
                image: product.image,
                isActive: product.isActive,
                businessEmail: product.businessEmail,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt
            }
        });

    } catch (error) {
        console.error('❌ Get portfolio item error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch portfolio item'
        });
    }
}

// CREATE NEW PORTFOLIO ITEM
async function createPortfolioItem(req, res) {
    try {
        const { userId, productName, description, amountUSD, image, isActive = true } = req.body;

        console.log(`➕ Creating new portfolio item for user: ${userId}`);
        console.log(`📦 Product data:`, { productName, amountUSD, hasImage: !!image });
        console.log(`📏 Image data length:`, image ? image.length : 0);

        // Validate required fields
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        if (!productName || !productName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Product name is required'
            });
        }

        if (!amountUSD || isNaN(amountUSD) || amountUSD <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid price is required'
            });
        }

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get user's active API key to use in product
        const apiKey = await BusinessAPI.findOne({ userId, isActive: true });
        if (!apiKey) {
            return res.status(400).json({
                success: false,
                message: 'No active API key found. Please create an API key first.'
            });
        }

        // Generate unique product ID
        const productId = `PRD_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

        let imageUrl = '';
        let imageFileId = '';

        // Upload image to ImageKit if provided
        if (image) {
            // Check if image is base64 (shouldn't be, but handle gracefully)
            if (image.startsWith('data:image')) {
                console.warn('⚠️ Received base64 image, uploading to ImageKit...');
                const fileName = `${productId}_${Date.now()}`;
                const uploadResult = await uploadImage(image, fileName, 'QuantumPay/products');

                if (uploadResult.success) {
                    imageUrl = uploadResult.url;
                    imageFileId = uploadResult.fileId;
                    console.log('✅ Base64 image uploaded to ImageKit');
                } else {
                    console.error('❌ Failed to upload base64 image:', uploadResult.error);
                    return res.status(400).json({
                        success: false,
                        message: 'Failed to upload image. Please try again with a smaller image.',
                        errorCode: 'IMAGE_UPLOAD_FAILED'
                    });
                }
            } else if (image.startsWith('http')) {
                // Image is already uploaded to ImageKit
                imageUrl = image;
                console.log('✅ Using existing ImageKit URL');
            } else {
                console.warn('⚠️ Unknown image format');
                imageUrl = '';
            }
        }

        // Create new product
        const newProduct = new Product({
            userId,
            productId,
            productName: productName.trim(),
            description: description?.trim() || '',
            amountUSD: parseFloat(amountUSD),
            image: imageUrl,
            imageFileId: imageFileId || null,
            isActive: isActive !== false
        });

        await newProduct.save();

        console.log(`✅ Portfolio item created with product ID: ${productId}`);

        return res.status(201).json({
            success: true,
            message: 'Portfolio item created successfully',
            product: {
                _id: newProduct._id,
                productId: newProduct.productId,
                productName: newProduct.productName,
                description: newProduct.description,
                amountUSD: newProduct.amountUSD,
                image: newProduct.image,
                isActive: newProduct.isActive,
                createdAt: newProduct.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Create portfolio item error:', error);
        
        // Handle specific MongoDB errors
        if (error.name === 'DocumentTooLargeError' || error.message?.includes('too large')) {
            return res.status(413).json({
                success: false,
                message: 'Product data too large. Please use smaller images.',
                errorCode: 'PAYLOAD_TOO_LARGE'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Failed to create portfolio item'
        });
    }
}

// UPDATE PORTFOLIO ITEM
async function updatePortfolioItem(req, res) {
    try {
        const { itemId } = req.params;
        const { productName, description, amountUSD, image, isActive } = req.body;

        console.log(`📝 Updating portfolio item: ${itemId}`);
        console.log(`📦 Update data:`, { productName, amountUSD, isActive });

        if (!itemId) {
            return res.status(400).json({
                success: false,
                message: 'Item ID is required'
            });
        }

        // Find product
        const product = await Product.findById(itemId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio item not found'
            });
        }

        // Update fields
        if (productName !== undefined && productName.trim()) {
            product.productName = productName.trim();
        }

        if (description !== undefined) {
            product.description = description.trim();
        }

        if (amountUSD !== undefined) {
            if (isNaN(amountUSD) || amountUSD <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid price is required'
                });
            }
            product.amountUSD = parseFloat(amountUSD);
        }

        if (image !== undefined) {
            product.image = image;
        }

        if (isActive !== undefined) {
            product.isActive = isActive;
            console.log(`🔄 Product status changed to: ${isActive ? 'active' : 'inactive'}`);
        }

        await product.save();

        console.log(`✅ Portfolio item updated: ${itemId}`);

        return res.status(200).json({
            success: true,
            message: 'Portfolio item updated successfully',
            product: {
                _id: product._id,
                productId: product.productId,
                productName: product.productName,
                description: product.description,
                amountUSD: product.amountUSD,
                image: product.image,
                isActive: product.isActive,
                updatedAt: product.updatedAt
            }
        });

    } catch (error) {
        console.error('❌ Update portfolio item error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update portfolio item'
        });
    }
}

// DELETE PORTFOLIO ITEM
async function deletePortfolioItem(req, res) {
    try {
        const { itemId } = req.params;

        if (!itemId) {
            return res.status(400).json({
                success: false,
                message: 'Item ID is required'
            });
        }

        console.log(`🗑️ Deleting portfolio item: ${itemId}`);

        const product = await Product.findById(itemId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio item not found'
            });
        }

        // Check if there are associated payments
        const { Payment } = require('../models/Payment');
        const paymentCount = await Payment.countDocuments({ productId: product.productId });

        if (paymentCount > 0) {
            // Don't delete, just deactivate
            product.isActive = false;
            await product.save();

            console.log(`⚠️ Portfolio item has ${paymentCount} payments, deactivated instead of deleted`);

            return res.status(200).json({
                success: true,
                message: 'Portfolio item deactivated (has associated payments)',
                deactivated: true
            });
        }

        // Safe to delete
        await Product.findByIdAndDelete(itemId);

        console.log(`✅ Portfolio item deleted: ${itemId}`);

        return res.status(200).json({
            success: true,
            message: 'Portfolio item deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete portfolio item error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete portfolio item'
        });
    }
}

// TOGGLE PORTFOLIO ITEM STATUS
async function togglePortfolioItemStatus(req, res) {
    try {
        const { itemId } = req.params;

        if (!itemId) {
            return res.status(400).json({
                success: false,
                message: 'Item ID is required'
            });
        }

        console.log(`⏯️ Toggling portfolio item status: ${itemId}`);

        const product = await Product.findById(itemId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio item not found'
            });
        }

        // Toggle active status
        product.isActive = !product.isActive;
        await product.save();

        console.log(`✅ Portfolio item ${product.isActive ? 'activated' : 'deactivated'}`);

        return res.status(200).json({
            success: true,
            message: `Portfolio item ${product.isActive ? 'activated' : 'deactivated'} successfully`,
            product: {
                _id: product._id,
                isActive: product.isActive
            }
        });

    } catch (error) {
        console.error('❌ Toggle portfolio item error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to toggle portfolio item status'
        });
    }
}

// GET PORTFOLIO STATISTICS
async function getPortfolioStats(req, res) {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        console.log(`📊 Fetching portfolio stats for user: ${userId}`);

        const products = await Product.find({ userId });

        const stats = {
            totalItems: products.length,
            activeItems: products.filter(p => p.isActive).length,
            inactiveItems: products.filter(p => !p.isActive).length,
            totalRevenue: 0,
            totalSales: 0
        };

        // Calculate total revenue and sales from products directly
        products.forEach(product => {
            stats.totalRevenue += product.totalVolume || 0;
            stats.totalSales += product.salesCount || 0;
        });

        console.log(`✅ Portfolio stats calculated:`, stats);

        return res.status(200).json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('❌ Get portfolio stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch portfolio statistics'
        });
    }
}

module.exports = {
    getAllPortfolioItems,
    getPortfolioItemById,
    createPortfolioItem,
    updatePortfolioItem,
    deletePortfolioItem,
    togglePortfolioItemStatus,
    getPortfolioStats
};
