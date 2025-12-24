const { User } = require('../models/User');
const { BusinessAPI } = require('../models/BusinessAPI');
const { Notification } = require('../models/Notification');
const { DashboardDailyMetric } = require('../models/DashboardDailyMetric');
const { PaymentConfiguration } = require('../models/PaymentConfiguration');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { uploadImage } = require('../utils/imagekit');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Helper to get today's date in YYYY-MM-DD format
function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Initialize user data after signup
async function initializeUserData(userId, email, role) {
    try {
        console.log(`📦 Initializing data for user: ${email}`);

        // 1. Create default BusinessAPI key (for business users)
        if (role === 'business') {
            const apiKey = `qp_live_${crypto.randomBytes(16).toString('hex')}`;
            const apiSecret = `qps_${crypto.randomBytes(24).toString('hex')}`;

            const businessAPI = new BusinessAPI({
                userId: userId,
                label: 'Default Live API Key',
                key: apiKey,
                secret: apiSecret,
                type: 'live',
                isActive: true,
                permissions: ['read', 'write'],
                usageCount: 0
            });
            await businessAPI.save();
            console.log('✅ Default API key created');
        }

        // 2. Create Notification entry
        const notification = new Notification({
            userId: userId,
            title: 'Welcome!',
            message: role === 'business' 
                ? 'Welcome to QuantumPay! Your business account is ready. Start by configuring your payment settings.'
                : 'Welcome to QuantumPay! Your account has been created successfully.',
            isRead: false
        });
        await notification.save();
        console.log('✅ Welcome notification created');

        // 3. Create Payment Configuration
        const paymentConfig = new PaymentConfiguration({
            userId: userId,
            wallets: {}
        });
        await paymentConfig.save();
        console.log('✅ Payment configuration created');

        console.log(`✅ User initialization completed for: ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Error initializing user data:', error);
        throw error;
    }
}

// SIGNUP
async function signup(req, res) {
    try {
        const { name, email, password, type, businessName } = req.body;

        console.log(`🔐 Signup attempt: ${email}, Type: ${type}`);

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Determine role
        const role = (type === 'business' || type === 'Business') ? 'business' : 'customer';

        // Create user
        const user = new User({
            name,
            email,
            password, // Store password directly (in production, hash it!)
            role,
            status: 'active',
            verified: false,
            businessName: role === 'business' ? (businessName || name) : ''
        });

        await user.save();
        console.log(`✅ User created: ${email}`);

        // Initialize user data
        await initializeUserData(user._id, email, role);

        return res.status(201).json({
            success: true,
            message: 'Account created successfully! Please login to continue.',
            userType: role
        });

    } catch (error) {
        console.error('❌ Signup error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
}

// LOGIN
async function login(req, res) {
    try {
        const { email, password } = req.body;

        console.log(`🔐 Login attempt: ${email}`);

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check password
        if (user.password !== password) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate token
        const token = jwt.sign(
            { id: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });

        console.log(`✅ Login successful: ${email}`);

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
}

// LOGOUT
async function logout(req, res) {
    res.clearCookie('token');
    return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
}

// VALIDATE TOKEN
async function validateToken(req, res) {
    try {
        const token = req.cookies.token ||
            (req.headers.authorization?.startsWith('Bearer ')
                ? req.headers.authorization.substring(7) : null);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token found'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        return res.status(200).json({
            success: true,
            user: {
                id: decoded.id,
                email: decoded.email
            }
        });

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
}

// GET USER DATA
async function getUserData(req, res) {
    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'User ID required'
            });
        }

        const user = await User.findById(id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.status(200).json({
            success: true,
            userData: {
                id: user._id,
                email: user.email,
                name: user.name,
                businessName: user.businessName || user.name,
                role: user.role,
                status: user.status,
                verified: user.verified,
                phoneNumber: user.phoneNumber || '',
                website: user.website || '',
                businessType: user.businessType || '',
                country: user.country || '',
                timeZone: user.timeZone || 'America/New_York',
                description: user.description || '',
                profileImage: user.profileImage || ''
            }
        });

    } catch (error) {
        console.error('❌ Get user data error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
}

// UPDATE USER PROFILE
async function updateProfile(req, res) {
    try {
        const { id } = req.params;
        const updateData = req.body;

        console.log(`📝 Updating profile for user ID: ${id}`);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'User ID required'
            });
        }

        // Find user
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Handle profile image upload to ImageKit if provided
        let profileImageUrl = updateData.profileImage;
        if (updateData.profileImage && updateData.profileImage.startsWith('data:image')) {
            const fileName = `profile_${id}_${Date.now()}`;
            const uploadResult = await uploadImage(updateData.profileImage, fileName, 'QuantumPay/profiles');

            if (uploadResult.success) {
                profileImageUrl = uploadResult.url;
                console.log('✅ Profile image uploaded to ImageKit:', uploadResult.url);
            } else {
                console.warn('Failed to upload profile image to ImageKit:', uploadResult.error);
                // Continue with base64 image as fallback
            }
        }

        // Update allowed fields only
        const allowedFields = [
            'name',
            'businessName',
            'website',
            'phoneNumber',
            'country',
            'businessType',
            'timeZone',
            'description'
        ];

        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                user[field] = updateData[field];
            }
        });

        // Update profile image if provided
        if (profileImageUrl) {
            user.profileImage = profileImageUrl;
        }

        await user.save();
        console.log(`✅ Profile updated for: ${user.email}`);

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            userData: {
                id: user._id,
                email: user.email,
                name: user.name,
                businessName: user.businessName || user.name,
                role: user.role,
                status: user.status,
                verified: user.verified,
                phoneNumber: user.phoneNumber || '',
                website: user.website || '',
                businessType: user.businessType || '',
                country: user.country || '',
                timeZone: user.timeZone || 'America/New_York',
                description: user.description || '',
                profileImage: user.profileImage || ''
            }
        });

    } catch (error) {
        console.error('❌ Update profile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
}

// CHANGE PASSWORD
async function changePassword(req, res) {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        console.log(`🔐 Password change request for user ID: ${id}`);

        // Validate input
        if (!id || !currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'User ID, current password, and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }

        // Find user
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        if (user.password !== currentPassword) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        console.log(`✅ Password updated for: ${user.email}`);

        return res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('❌ Change password error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
}

module.exports = {
    signup,
    login,
    logout,
    validateToken,
    getUserData,
    updateProfile,
    changePassword
};
