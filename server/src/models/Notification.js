const mongoose = require('mongoose');

const notificationItemSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true,
        trim: true
    },
    orderId: {
        type: String,
        required: true,
        trim: true,
        ref: 'Order'
    },
    type: {
        type: String,
        enum: ['payment_completed', 'payment_failed', 'product_created', 'system', 'welcome'], // Updated to include 'product_created'
        default: 'system'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true }); // Enable _id for each notification item

const notificationSchema = new mongoose.Schema({
    businessEmail: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        ref: 'User'
    },
    notifications: [notificationItemSchema],
    unreadCount: {
        type: Number,
        default: 0
    },
    lastNotificationAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Add indexes for performance
notificationSchema.index({ businessEmail: 1 });
notificationSchema.index({ 'notifications.isRead': 1 });
notificationSchema.index({ 'notifications.type': 1 });
notificationSchema.index({ 'notifications.createdAt': -1 });

// Method to add notification
notificationSchema.methods.addNotification = function (notificationData) {
    this.notifications.unshift(notificationData); // Add to beginning
    if (!notificationData.isRead) {
        this.unreadCount = (this.unreadCount || 0) + 1;
    }
    this.lastNotificationAt = new Date();
    return this.save();
};

// Method to mark notification as read
notificationSchema.methods.markAsRead = function (notificationId) {
    const notification = this.notifications.id(notificationId);
    if (notification && !notification.isRead) {
        notification.isRead = true;
        this.unreadCount = Math.max(0, (this.unreadCount || 0) - 1);
        return this.save();
    }
    return Promise.resolve(this);
};

// Method to mark all as read
notificationSchema.methods.markAllAsRead = function () {
    this.notifications.forEach(notification => {
        notification.isRead = true;
    });
    this.unreadCount = 0;
    return this.save();
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = { Notification };
