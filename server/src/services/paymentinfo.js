const { Payment } = require("../models/Payment");
const { Order } = require("../models/Order");
const { BusinessAPI } = require("../models/BusinessAPI");
const { PaymentConfiguration } = require("../models/PaymentConfiguration");

// Simple in-memory cache for payment status
const paymentStatusCache = new Map();
const CACHE_DURATION = 30000; // 30 seconds

const paymentinfo = async (req, res) => {
    const { id, payid } = req.query;
    
    if (!id && !payid) {
        return res.status(400).json({
            success: false,
            message: "Payment ID or PayID is required"
        });
    }

    const requestedId = id || payid;
    
    // Check cache first for recent requests
    const cacheKey = `payment_${requestedId}`;
    const cachedData = paymentStatusCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
        console.log('📋 Returning cached payment data for:', requestedId);
        return res.status(200).json(cachedData.data);
    }

    try {
        // Find payment by either _id or payId
        const payment = await Payment.findOne({
            $or: [
                { _id: id },
                { payId: payid || id }
            ]
        });

        if (!payment) {
            console.log("❌ Payment not found for ID:", requestedId);
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        // Get associated order
        const order = await Order.findOne({ orderId: payment.orderId });
        
        if (!order) {
            console.log("❌ Associated product not found for payment:", payment.payId);
            return res.status(404).json({
                success: false,
                message: "Associated product not found"
            });
        }

        if (!order.isActive) {
            console.log("❌ Product is deactivated:", order.orderId);
            return res.status(403).json({
                success: false,
                message: "This product has been deactivated and is no longer available for purchase",
                errorCode: "PRODUCT_DEACTIVATED"
            });
        }

        // Validate API key status
        const apiKey = await BusinessAPI.findOne({ businessEmail: payment.businessEmail });
        if (!apiKey || !apiKey.isActive) {
            console.log("❌ API key is inactive for business:", payment.businessEmail);
            return res.status(403).json({
                success: false,
                message: "Payment processing is currently paused. Please contact the merchant.",
                errorCode: "API_PAUSED"
            });
        }

        // Get payment configuration to find the correct wallet address with network support
        const paymentConfig = await PaymentConfiguration.findOne({
            businessEmail: payment.businessEmail
        });

        let walletAddress = payment.businessEmail; // fallback

        if (paymentConfig && paymentConfig.cryptoConfigurations) {
            const cryptoConfig = paymentConfig.cryptoConfigurations.find(
                crypto => crypto.coinType === payment.cryptoType && 
                         crypto.network === payment.network &&
                         crypto.enabled
            );
            if (cryptoConfig && cryptoConfig.address) {
                walletAddress = cryptoConfig.address;
            }
        }

        // Return enriched payment data
        const enrichedPayment = {
            ...payment.toObject(),
            walletAddress: walletAddress,
            orderStatus: order.status,
            orderIsActive: order.isActive,
            apiIsActive: apiKey.isActive
        };

        const response = {
            success: true,
            payment: enrichedPayment
        };

        // Cache the response only for completed or failed payments (they don't change)
        if (payment.status === 'completed' || payment.status === 'failed') {
            paymentStatusCache.set(cacheKey, {
                data: response,
                timestamp: Date.now()
            });
        }

        console.log('📦 Payment info retrieved for:', payment.payId, 'Status:', payment.status);
        res.status(200).json(response);

    } catch (error) {
        console.error("❌ Error in paymentinfo:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error: " + error.message
        });
    }
};

// Clear cache periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of paymentStatusCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            paymentStatusCache.delete(key);
        }
    }
}, CACHE_DURATION);

module.exports = { paymentinfo };