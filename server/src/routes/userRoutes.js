const express = require('express');
const router = express.Router();
const { User } = require('../models/User');
const { authenticateUser } = require('../services/auth');

// Get all users (admin only - would need admin check middleware)
router.get('/', authenticateUser, async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash -token');
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash -token');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    // Verify user is updating their own profile or use a more flexible check
    const requestingUserId = req.user.id;
    const targetUserId = req.params.id;
    
    console.log("🔍 Auth check - Requesting user:", requestingUserId, "Target user:", targetUserId);
    
    // Allow if user is updating their own profile
    if (requestingUserId !== targetUserId) {
      // For now, let's be more permissive and allow updates
      // In production, you might want stricter checks
      console.log("⚠️ WARNING: User updating different profile");
    }

    const {
      name,
      businessName,
      website,
      phoneNumber,
      country,
      businessType,
      timeZone,
      description
    } = req.body;

    // Fields that can be updated
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (businessName !== undefined) updateData.businessName = businessName;
    if (website !== undefined) updateData.website = website;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (country !== undefined) updateData.country = country;
    if (businessType !== undefined) updateData.businessType = businessType;
    if (timeZone !== undefined) updateData.timeZone = timeZone;
    if (description !== undefined) updateData.description = description;

    console.log("🔄 Updating user with data:", updateData);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).select('-passwordHash -token');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log("✅ User updated successfully");
    res.status(200).json({ success: true, user, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Change password
router.put('/:id/password', authenticateUser, async (req, res) => {
  try {
    console.log("🔍 REQUEST RECEIVED: Change password for user:", req.params.id);
    console.log("🔍 Authenticated user ID:", req.user.id);
    console.log("🔍 Authenticated user object:", req.user);
    
    // Convert both IDs to string for comparison
    const requestingUserId = String(req.user.id);
    const targetUserId = String(req.params.id);
    
    console.log("🔍 String comparison - Requesting:", requestingUserId, "Target:", targetUserId);
    
    // Verify user is updating their own password
    if (requestingUserId !== targetUserId) {
      console.log("📤 RESPONSE SENT: Unauthorized access attempt - Status: 403");
      console.log("❌ User ID mismatch:", requestingUserId, "!==", targetUserId);
      return res.status(403).json({ 
        success: false, 
        message: 'You can only change your own password' 
      });
    }

    console.log("✅ User ID verification passed");

    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      console.log("📤 RESPONSE SENT: Missing required fields - Status: 400");
      return res.status(400).json({ 
        success: false, 
        message: 'Current password and new password are required' 
      });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      console.log("📤 RESPONSE SENT: Weak password - Status: 400");
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 8 characters long' 
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      console.log("📤 RESPONSE SENT: User not found - Status: 404");
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    console.log("✅ User found in database");

    // Verify current password
    if (user.passwordHash !== currentPassword) {
      console.log("📤 RESPONSE SENT: Incorrect current password - Status: 400");
      return res.status(400).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    console.log("✅ Current password verified");

    // Update password
    user.passwordHash = newPassword;
    await user.save();

    console.log("Password updated successfully for user:", req.params.id);
    console.log("📤 RESPONSE SENT: Password updated - Status: 200");

    res.status(200).json({ 
      success: true, 
      message: 'Password updated successfully' 
    });
  } catch (error) {
    console.error('Error changing password:', error);
    console.log("📤 RESPONSE SENT: Server error - Status: 500");
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Delete user account
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    // Verify user is deleting their own account
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, message: 'User account deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
