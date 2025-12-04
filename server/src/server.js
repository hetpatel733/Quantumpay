const express = require('express');
const router = express.Router();
const { Notification } = require('../models/Notification');
const { authenticateUser } = require('../services/auth');

// Get notification settings for the authenticated business
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { email } = req.user;
    
    console.log('🔍 Fetching notification settings for user:', email);
    
    // Find notification document for user
    const userNotifications = await Notification.findOne({ businessEmail: email });
    
    if (!userNotifications) {
      return res.status(200).json({
        success: true,
        settings: {
          emailNotifications: {
            paymentReceived: true,
            paymentFailed: true,
            dailySummary: true,
            weeklySummary: false,
            securityAlerts: true,
            systemUpdates: false,
            marketingEmails: false
          },
          webhookSettings: {
            enabled: true,
            url: 'https://api.acme.com/webhooks/cryptopay',
            secret: 'whsec_1234567890abcdef',
            events: {
              paymentCompleted: true,
              paymentFailed: true,
              paymentPending: false,
              refundProcessed: true,
              disputeCreated: false
            }
          },
          pushNotifications: {
            enabled: true,
            paymentAlerts: true,
            securityAlerts: true,
            systemAlerts: false
          }
        }
      });
    }

    console.log('📤 Returning notification settings');
    res.status(200).json({ success: true, settings: userNotifications });
  } catch (error) {
    console.error('❌ Error fetching notification settings:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Update notification settings
router.put('/', authenticateUser, async (req, res) => {
  try {
    const { email } = req.user;
    const { emailNotifications, webhookSettings, pushNotifications } = req.body;

    console.log('🔄 Updating notification settings for:', email);

    // Find notification document for user
    let userNotifications = await Notification.findOne({ businessEmail: email });
    
    if (!userNotifications) {
      // Create new notification document if it doesn't exist
      userNotifications = new Notification({
        businessEmail: email,
        notifications: [],
        unreadCount: 0
      });
    }

    // Update email notifications settings
    if (emailNotifications) {
      userNotifications.emailNotifications = {
        ...userNotifications.emailNotifications,
        ...emailNotifications
      };
    }

    // Update webhook settings
    if (webhookSettings) {
      userNotifications.webhookSettings = {
        ...userNotifications.webhookSettings,
        ...webhookSettings
      };
    }

    // Update push notifications settings
    if (pushNotifications) {
      userNotifications.pushNotifications = {
        ...userNotifications.pushNotifications,
        ...pushNotifications
      };
    }

    await userNotifications.save();
    console.log('✅ Notification settings updated for:', email);

    res.status(200).json({
      success: true,
      message: 'Notification settings updated successfully',
      settings: userNotifications
    });
  } catch (error) {
    console.error('❌ Error updating notification settings:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

module.exports = router;