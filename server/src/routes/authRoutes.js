const express = require('express');
const router = express.Router();
const { login, validateToken, getUserData } = require('../services/login');
const { signup } = require('../services/signup');
const { authenticateUser } = require('../services/auth');

// Login endpoint
router.post('/login', async (req, res) => {
  login(req, res);
});

// Signup endpoint
router.post('/signup', async (req, res) => {
  signup(req, res);
});

// Token validation endpoint
router.get('/validate', async (req, res) => {
  validateToken(req, res);
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  console.log("🔍 REQUEST RECEIVED: /api/auth/logout endpoint hit");
  
  // Clear all authentication cookies
  res.clearCookie('token', { 
    httpOnly: true, 
    sameSite: 'none', 
    secure: false,
    path: '/'
  });
  
  res.clearCookie('auth_token', { 
    httpOnly: false, 
    sameSite: 'none', 
    secure: false,
    path: '/'
  });
  
  res.clearCookie('email', { 
    sameSite: 'none', 
    secure: false,
    path: '/'
  });

  console.log("📤 RESPONSE SENT: Logout successful - Status: 200");
  res.status(200).json({ 
    success: true,
    message: "Logged out successfully" 
  });
});

// Get user data endpoint
router.get('/userdata', async (req, res) => {
  console.log("🔍 REQUEST RECEIVED: /api/auth/userdata endpoint hit");
  console.log("Query params:", req.query);
  console.log("Headers:", req.headers);
  getUserData(req, res);
});

module.exports = router;
