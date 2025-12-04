const express = require('express');
const router = express.Router();
const { Notification } = require('../models/Notification');
const { authenticateUser } = require('../services/auth');

// Get all notifications for the authenticated business
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { limit = 20, skip = 0, unreadOnly = false } = req.query;
    
    console.log('🔍 Fetching notifications for user:', req.user.email);
    
    const userNotifications = await Notification.findOne({ 
      businessEmail: req.user.email 
    });
    
    if (!userNotifications) {
      return res.status(200).json({
        success: true,
        notifications: [],
        pagination: {
          total: 0,
          unreadCount: 0,
          skip: Number(skip),
          limit: Number(limit)
        }
      });
    }

    let notifications = userNotifications.notifications;
    
    // Filter unread only if requested
    if (unreadOnly === 'true') {
      notifications = notifications.filter(n => !n.isRead);
    }
    
    // Apply pagination
    const total = notifications.length;
    const paginatedNotifications = notifications
      .slice(Number(skip), Number(skip) + Number(limit));
    
    console.log('📬 Found notifications:', paginatedNotifications.length, 'Unread:', userNotifications.unreadCount);
    
    res.status(200).json({
      success: true,
      notifications: paginatedNotifications,
      pagination: {
        total,
        unreadCount: userNotifications.unreadCount,
        skip: Number(skip),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Mark a notification as read
router.patch('/:id/read', authenticateUser, async (req, res) => {
  try {
    const userNotifications = await Notification.findOne({ 
      businessEmail: req.user.email 
    });
    
    if (!userNotifications) {
      return res.status(404).json({ success: false, message: 'Notifications not found' });
    }
    
    await userNotifications.markAsRead(req.params.id);
    
    res.status(200).json({ 
      success: true, 
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Mark all notifications as read
router.post('/mark-all-read', authenticateUser, async (req, res) => {
  try {
    const userNotifications = await Notification.findOne({ 
      businessEmail: req.user.email 
    });
    
    if (!userNotifications) {
      return res.status(404).json({ success: false, message: 'Notifications not found' });
    }
    
    await userNotifications.markAllAsRead();
    
    res.status(200).json({ 
      success: true, 
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete a notification
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const userNotifications = await Notification.findOne({ 
      businessEmail: req.user.email 
    });
    
    if (!userNotifications) {
      return res.status(404).json({ success: false, message: 'Notifications not found' });
    }
    
    const notification = userNotifications.notifications.id(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    // Decrease unread count if notification was unread
    if (!notification.isRead) {
      userNotifications.unreadCount = Math.max(0, userNotifications.unreadCount - 1);
    }
    
    notification.remove();
    await userNotifications.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'Notification deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Clear all notifications
router.delete('/', authenticateUser, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { businessEmail: req.user.email },
      { 
        $set: { 
          notifications: [], 
          unreadCount: 0 
        } 
      }
    );
    
    res.status(200).json({ 
      success: true, 
      message: 'All notifications cleared successfully' 
    });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
