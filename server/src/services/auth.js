const { User } = require('../models/User');
const { BusinessAPI } = require('../models/BusinessAPI');
const { Notification } = require('../models/Notification');
const { DashboardDailyMetric } = require('../models/DashboardDailyMetric');
const { PaymentConfiguration } = require('../models/PaymentConfiguration');
const { Otp } = require('../models/Otp');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { uploadImage } = require('../utils/imagekit');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const OTP_TTL_MINUTES = 10;
const OTP_PURPOSES = {
    SIGNUP: 'signup',
    LOGIN: 'login'
};

function normalizeEmail(email) {
    return (email || '').trim().toLowerCase();
}

function generateOtpCode() {
    return crypto.randomInt(100000, 1000000).toString();
}

function hashOtpCode(code) {
    return crypto.createHash('sha256').update(String(code)).digest('hex');
}

async function issueOtpForUser(user, purpose = OTP_PURPOSES.SIGNUP) {
    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await Otp.updateMany(
        { userId: user._id, purpose, status: 'pending' },
        { $set: { status: 'expired' } }
    );

    const otp = new Otp({
        userId: user._id,
        email: user.email,
        codeHash: hashOtpCode(otpCode),
        ...(process.env.NODE_ENV !== 'production' ? { code: otpCode } : {}),
        purpose,
        status: 'pending',
        attempts: 0,
        expiresAt
    });

    await otp.save();

    return {
        otp,
        otpCode,
        expiresAt
    };
}

function buildAuthToken(user) {
    return jwt.sign(
        { id: user._id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// Helper to get today's date in YYYY-MM-DD format
function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Initialize user data after signup
async function initializeUserData(userId, email, role) {
    try {
        //console.log(`📦 Initializing data for user: ${email}`);

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
            //console.log('✅ Default API key created');
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
        //console.log('✅ Welcome notification created');

        // 3. Create Payment Configuration
        const paymentConfig = new PaymentConfiguration({
            userId: userId,
            wallets: {}
        });
        await paymentConfig.save();
        //console.log('✅ Payment configuration created');

        //console.log(`✅ User initialization completed for: ${email}`);
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
        const normalizedEmail = normalizeEmail(email);

        //console.log(`🔐 Signup attempt: ${email}, Type: ${type}`);

        // Check if user exists
        const existingUser = await User.findOne({ email: normalizedEmail });
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
            email: normalizedEmail,
            password, // Store password directly (in production, hash it!)
            role,
            status: 'active',
            verified: false,
            twoFactorEnabled: false,
            businessName: role === 'business' ? (businessName || name) : ''
        });

        await user.save();
        //console.log(`✅ User created: ${email}`);

        const { otpCode, expiresAt } = await issueOtpForUser(user, OTP_PURPOSES.SIGNUP);

        // Initialize user data
        await initializeUserData(user._id, email, role);

        return res.status(201).json({
            success: true,
            message: 'Account created successfully! Verify your account to continue.',
            userType: role,
            userId: user._id,
            verificationRequired: true,
            verified: false,
            ...(process.env.NODE_ENV !== 'production' ? {
                verificationCode: otpCode,
                otpExpiresAt: expiresAt
            } : {})
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
        const normalizedEmail = normalizeEmail(email);

        //console.log(`🔐 Login attempt: ${email}`);

        // Find user
        const user = await User.findOne({ email: normalizedEmail });
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

        if (!user.verified) {
            return res.status(403).json({
                success: false,
                message: 'Account is not verified. Please verify your OTP first.',
                verificationRequired: true,
                verified: false,
                userId: user._id,
                email: user.email
            });
        }

        if (user.twoFactorEnabled) {
            const { otpCode, expiresAt } = await issueOtpForUser(user, OTP_PURPOSES.LOGIN);

            return res.status(200).json({
                success: false,
                twoFactorRequired: true,
                purpose: OTP_PURPOSES.LOGIN,
                message: 'Two-factor verification required. Enter the OTP sent to your email.',
                userId: user._id,
                email: user.email,
                ...(process.env.NODE_ENV !== 'production' ? {
                    verificationCode: otpCode,
                    otpExpiresAt: expiresAt
                } : {})
            });
        }

        // Generate token
        const token = buildAuthToken(user);

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });

        //console.log(`✅ Login successful: ${email}`);

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                verified: user.verified,
                twoFactorEnabled: user.twoFactorEnabled
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
        const user = await User.findById(decoded.id).select('email verified name role twoFactorEnabled');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.verified) {
            return res.status(403).json({
                success: false,
                message: 'Account is not verified',
                verificationRequired: true,
                verified: false
            });
        }

        return res.status(200).json({
            success: true,
            user: {
                id: decoded.id,
                email: user.email,
                name: user.name,
                role: user.role,
                verified: user.verified,
                twoFactorEnabled: user.twoFactorEnabled
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
                twoFactorEnabled: user.twoFactorEnabled,
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

        //console.log(`📝 Updating profile for user ID: ${id}`);

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
                //console.log('✅ Profile image uploaded to ImageKit:', uploadResult.url);
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
        //console.log(`✅ Profile updated for: ${user.email}`);

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
                twoFactorEnabled: user.twoFactorEnabled,
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

        //console.log(`🔐 Password change request for user ID: ${id}`);

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

        //console.log(`✅ Password updated for: ${user.email}`);

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

// UPDATE TWO-FACTOR AUTHENTICATION SETTING
async function updateTwoFactorSettings(req, res) {
    try {
        const { id } = req.params;
        const { enabled } = req.body;

        if (!id || typeof enabled !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'User ID and boolean enabled flag are required'
            });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.twoFactorEnabled = enabled;
        await user.save();

        if (!enabled) {
            await Otp.updateMany(
                { userId: user._id, purpose: OTP_PURPOSES.LOGIN, status: 'pending' },
                { $set: { status: 'expired' } }
            );
        }

        return res.status(200).json({
            success: true,
            message: enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled',
            twoFactorEnabled: user.twoFactorEnabled,
            userData: {
                id: user._id,
                email: user.email,
                verified: user.verified,
                twoFactorEnabled: user.twoFactorEnabled
            }
        });
    } catch (error) {
        console.error('❌ Update 2FA setting error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update 2FA setting'
        });
    }
}

// VERIFY OTP
async function verifyOtp(req, res) {
    try {
        const { email, otp, purpose = OTP_PURPOSES.SIGNUP } = req.body;
        const normalizedEmail = normalizeEmail(email);
        const normalizedPurpose = [OTP_PURPOSES.SIGNUP, OTP_PURPOSES.LOGIN].includes(purpose)
            ? purpose
            : null;

        if (!normalizedEmail || !otp || !normalizedPurpose) {
            return res.status(400).json({
                success: false,
                message: 'Email, OTP, and valid purpose are required'
            });
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (normalizedPurpose === OTP_PURPOSES.SIGNUP && user.verified) {
            return res.status(200).json({
                success: true,
                message: 'Account is already verified',
                verified: true
            });
        }

        if (normalizedPurpose === OTP_PURPOSES.LOGIN && !user.verified) {
            return res.status(403).json({
                success: false,
                message: 'Account is not verified. Please verify signup OTP first.',
                verificationRequired: true,
                verified: false
            });
        }

        if (normalizedPurpose === OTP_PURPOSES.LOGIN && !user.twoFactorEnabled) {
            return res.status(400).json({
                success: false,
                message: 'Two-factor authentication is not enabled for this account'
            });
        }

        const otpRecord = await Otp.findOne({
            userId: user._id,
            email: normalizedEmail,
            purpose: normalizedPurpose,
            status: 'pending'
        }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return res.status(404).json({
                success: false,
                message: 'No active OTP found. Please request a new one.',
                verificationRequired: normalizedPurpose === OTP_PURPOSES.SIGNUP,
                twoFactorRequired: normalizedPurpose === OTP_PURPOSES.LOGIN
            });
        }

        if (otpRecord.expiresAt.getTime() < Date.now()) {
            otpRecord.status = 'expired';
            await otpRecord.save();

            return res.status(410).json({
                success: false,
                message: 'OTP has expired. Please request a new one.',
                verificationRequired: normalizedPurpose === OTP_PURPOSES.SIGNUP,
                twoFactorRequired: normalizedPurpose === OTP_PURPOSES.LOGIN
            });
        }

        if (otpRecord.attempts >= 5) {
            otpRecord.status = 'expired';
            await otpRecord.save();

            return res.status(429).json({
                success: false,
                message: 'Too many invalid attempts. Please request a new OTP.',
                verificationRequired: normalizedPurpose === OTP_PURPOSES.SIGNUP,
                twoFactorRequired: normalizedPurpose === OTP_PURPOSES.LOGIN
            });
        }

        otpRecord.attempts += 1;
        const isValid = otpRecord.codeHash === hashOtpCode(otp);

        if (!isValid) {
            await otpRecord.save();
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP',
                verificationRequired: normalizedPurpose === OTP_PURPOSES.SIGNUP,
                twoFactorRequired: normalizedPurpose === OTP_PURPOSES.LOGIN
            });
        }

        otpRecord.status = 'verified';
        otpRecord.verifiedAt = new Date();
        await otpRecord.save();

        if (normalizedPurpose === OTP_PURPOSES.SIGNUP) {
            user.verified = true;
            await user.save();

            return res.status(200).json({
                success: true,
                message: 'Account verified successfully',
                verified: true,
                purpose: OTP_PURPOSES.SIGNUP
            });
        }

        const token = buildAuthToken(user);

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });

        return res.status(200).json({
            success: true,
            message: 'Two-factor verification successful',
            purpose: OTP_PURPOSES.LOGIN,
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                verified: user.verified,
                twoFactorEnabled: user.twoFactorEnabled
            }
        });
    } catch (error) {
        console.error('❌ Verify OTP error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to verify OTP'
        });
    }
}

// RESEND OTP
async function resendOtp(req, res) {
    try {
        const { email, purpose = OTP_PURPOSES.SIGNUP } = req.body;
        const normalizedEmail = normalizeEmail(email);
        const normalizedPurpose = [OTP_PURPOSES.SIGNUP, OTP_PURPOSES.LOGIN].includes(purpose)
            ? purpose
            : null;

        if (!normalizedEmail || !normalizedPurpose) {
            return res.status(400).json({
                success: false,
                message: 'Email and valid purpose are required'
            });
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (normalizedPurpose === OTP_PURPOSES.SIGNUP && user.verified) {
            return res.status(200).json({
                success: true,
                message: 'Account is already verified',
                verified: true
            });
        }

        if (normalizedPurpose === OTP_PURPOSES.LOGIN && !user.verified) {
            return res.status(403).json({
                success: false,
                message: 'Account is not verified. Please complete signup verification first.',
                verificationRequired: true,
                verified: false
            });
        }

        if (normalizedPurpose === OTP_PURPOSES.LOGIN && !user.twoFactorEnabled) {
            return res.status(400).json({
                success: false,
                message: 'Two-factor authentication is not enabled for this account'
            });
        }

        const { otpCode, expiresAt } = await issueOtpForUser(user, normalizedPurpose);

        return res.status(200).json({
            success: true,
            message: 'A new OTP has been generated',
            purpose: normalizedPurpose,
            verificationRequired: normalizedPurpose === OTP_PURPOSES.SIGNUP,
            twoFactorRequired: normalizedPurpose === OTP_PURPOSES.LOGIN,
            ...(process.env.NODE_ENV !== 'production' ? {
                verificationCode: otpCode,
                otpExpiresAt: expiresAt
            } : {})
        });
    } catch (error) {
        console.error('❌ Resend OTP error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to resend OTP'
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
    changePassword,
    updateTwoFactorSettings,
    verifyOtp,
    resendOtp
};
