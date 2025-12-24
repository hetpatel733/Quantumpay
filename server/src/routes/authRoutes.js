const express = require('express');
const router = express.Router();
const { signup, login, logout, validateToken, getUserData, updateProfile, changePassword } = require('../services/auth');

// Signup
router.post('/signup', signup);

// Login
router.post('/login', login);

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

module.exports = router;
