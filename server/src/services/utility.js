const { login, validateToken, getUserData } = require('./login');
const { signup } = require('./signup');
const { contact } = require('./contact');
const {
    paymentFunction,
    CoinselectFunction,
    FinalpayFunction,
    checkstatus,
    getPaymentDetails,
    validateApiAndOrder
} = require("./payment");
const { authenticateUser } = require('./auth');
const { paymentinfo } = require('./paymentinfo');
const { User } = require("../models/User");
const { NotificationSettings } = require("../models/NotificationSettings");
const { createNotification, createPaymentNotification } = require('./notificationService');

// Add updateUser service
const updateUser = async (req, res) => {
    try {
        console.log("🔍 REQUEST RECEIVED: Update user for ID:", req.params.id);
        
        const userId = req.params.id;
        const updateData = req.body;
        
        // Remove any potentially harmful fields that could affect order status
        delete updateData.orders;
        delete updateData.orderStatus;
        delete updateData.completedOrders;
        
        // Validate user ID format
        if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
            console.log("📤 RESPONSE SENT: Invalid user ID format - Status: 400");
            return res.status(400).json({
                success: false,
                message: "Invalid user ID format"
            });
        }

        // Find and update user
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-passwordHash -token');

        if (!user) {
            console.log("📤 RESPONSE SENT: User not found - Status: 404");
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        console.log("User updated successfully:", userId);
        console.log("📤 RESPONSE SENT: User updated - Status: 200");

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: user
        });

    } catch (error) {
        console.error("Update user error:", error);
        console.log("📤 RESPONSE SENT: Update failed - Status: 500");
        return res.status(500).json({
            success: false,
            message: "Failed to update profile: " + error.message
        });
    }
};

// Add notification settings utilities
const getNotificationSettings = async (req, res) => {
    try {
        console.log("🔍 REQUEST RECEIVED: Get notification settings for:", req.user.email);
        
        let settings = await NotificationSettings.findOne({
            businessEmail: req.user.email
        });

        // If no settings exist, create default ones
        if (!settings) {
            console.log('🏗️ Creating default notification settings');
            
            settings = new NotificationSettings({
                businessEmail: req.user.email,
                emailNotifications: {
                    paymentReceived: false,
                    paymentFailed: false,
                    dailySummary: false,
                    weeklySummary: false,
                    securityAlerts: false,
                    systemUpdates: false,
                    marketingEmails: false
                },
                pushNotifications: {
                    enabled: false,
                    paymentAlerts: false,
                    securityAlerts: false,
                    systemAlerts: false
                }
            });

            await settings.save();
            console.log('✅ Default notification settings created');
        }

        console.log("📤 RESPONSE SENT: Notification settings retrieved - Status: 200");
        return res.status(200).json({
            success: true,
            settings
        });

    } catch (error) {
        console.error("Get notification settings error:", error);
        console.log("📤 RESPONSE SENT: Get settings failed - Status: 500");
        return res.status(500).json({
            success: false,
            message: "Failed to get notification settings: " + error.message
        });
    }
};

const updateNotificationSettings = async (req, res) => {
    try {
        console.log("🔍 REQUEST RECEIVED: Update notification settings for:", req.user.email);
        
        const { emailNotifications, pushNotifications } = req.body;

        let settings = await NotificationSettings.findOne({
            businessEmail: req.user.email
        });

        if (!settings) {
            // Create new settings if they don't exist
            settings = new NotificationSettings({
                businessEmail: req.user.email,
                emailNotifications: emailNotifications || {},
                pushNotifications: pushNotifications || {}
            });
        } else {
            // Update existing settings
            if (emailNotifications) {
                settings.emailNotifications = {
                    ...settings.emailNotifications,
                    ...emailNotifications
                };
            }
            
            if (pushNotifications) {
                settings.pushNotifications = {
                    ...settings.pushNotifications,
                    ...pushNotifications
                };
            }
        }

        await settings.save();
        console.log('✅ Notification settings updated successfully');

        console.log("📤 RESPONSE SENT: Notification settings updated - Status: 200");
        return res.status(200).json({
            success: true,
            settings,
            message: 'Notification settings updated successfully'
        });

    } catch (error) {
        console.error("Update notification settings error:", error);
        console.log("📤 RESPONSE SENT: Update failed - Status: 500");
        return res.status(500).json({
            success: false,
            message: "Failed to update notification settings: " + error.message
        });
    }
};

module.exports = {
    login, 
    validateToken, 
    getUserData, 
    signup, 
    contact,
    paymentFunction,
    CoinselectFunction,
    FinalpayFunction,
    checkstatus,
    getPaymentDetails,
    validateApiAndOrder,
    authenticateUser, 
    paymentinfo,
    updateUser,
    createNotification,
    createPaymentNotification,
    getNotificationSettings,
    updateNotificationSettings
};