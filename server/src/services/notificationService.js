const { Notification } = require('../models/Notification');

const createNotification = async (data) => {
    try {
        const { businessEmail, ...notificationData } = data;
        
        // Find or create notification document for user
        let userNotifications = await Notification.findOne({ businessEmail });
        
        if (!userNotifications) {
            userNotifications = new Notification({
                businessEmail,
                notifications: [],
                unreadCount: 0
            });
        }

        await userNotifications.addNotification(notificationData);
        console.log('✅ Notification created:', data.type, 'for', businessEmail);
        return userNotifications;
    } catch (error) {
        console.error('❌ Error creating notification:', error);
        throw error;
    }
};

const createPaymentNotification = async (businessEmail, paymentData, type) => {
    const messages = {
        payment_completed: `Payment of $${paymentData.amountUSD} has been completed successfully. Transaction ID: ${paymentData.payId}`,
        payment_failed: `Payment of $${paymentData.amountUSD} has failed. Please check the payment details. Transaction ID: ${paymentData.payId}`,
        payment_pending: `Payment of $${paymentData.amountUSD} is being processed. Transaction ID: ${paymentData.payId}`
    };

    const priorities = {
        payment_completed: 'high',
        payment_failed: 'high',
        payment_pending: 'medium'
    };

    return await createNotification({
        businessEmail,
        message: messages[type] || 'Payment status updated',
        orderId: paymentData.orderId || 'UNKNOWN',
        type,
        isRead: false,
        priority: priorities[type] || 'medium',
        metadata: {
            paymentId: paymentData.payId,
            amount: paymentData.amountUSD,
            cryptoType: paymentData.cryptoType,
            source: 'payment_system'
        }
    });
};

const createOrderNotification = async (businessEmail, orderData) => {
    return await createNotification({
        businessEmail,
        message: `New product created: ${orderData.productName} - $${orderData.amountUSD}`,
        orderId: orderData.orderId,
        type: 'product_created', // Updated from 'order_created' to reflect product concept
        isRead: false,
        priority: 'medium',
        metadata: {
            orderId: orderData.orderId,
            productName: orderData.productName,
            amount: orderData.amountUSD,
            source: 'product_system' // Updated from 'order_system'
        }
    });
};

const markNotificationAsRead = async (notificationId, businessEmail) => {
    try {
        const userNotifications = await Notification.findOne({ businessEmail });
        if (!userNotifications) {
            throw new Error('User notifications not found');
        }
        
        return await userNotifications.markAsRead(notificationId);
    } catch (error) {
        console.error('❌ Error marking notification as read:', error);
        throw error;
    }
};

const getUnreadCount = async (businessEmail) => {
    try {
        const userNotifications = await Notification.findOne({ businessEmail });
        return userNotifications ? userNotifications.unreadCount : 0;
    } catch (error) {
        console.error('❌ Error getting unread count:', error);
        return 0;
    }
};

module.exports = {
    createNotification,
    createPaymentNotification,
    createOrderNotification,
    markNotificationAsRead,
    getUnreadCount
};
