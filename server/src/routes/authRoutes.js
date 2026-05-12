const express = require('express');
const router = express.Router();
const { signup, login, logout, validateToken, getUserData, updateProfile, changePassword, updateTwoFactorSettings, verifyOtp, resendOtp } = require('../services/auth');

// Signup
router.post('/signup', signup);

// Login
router.post('/login', login);

// Verify OTP
router.post('/verify-otp', verifyOtp);

// Resend OTP
router.post('/resend-otp', resendOtp);

// Logout
router.post('/logout', logout);

// Validate token
router.get('/validate', validateToken);

// Get user data
router.get('/userdata', getUserData);

// Update user profile
router.put('/profile/:id', updateProfile);

// Change password
router.put('/password/:id', changePassword);

// Update two-factor setting
router.put('/2fa/:id', updateTwoFactorSettings);

module.exports = router;
