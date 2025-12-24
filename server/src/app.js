// const alchemyDocs = require("@api/alchemy-docs"); // Removed as it was unused
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();

// ----------------------------------
//      INITIALIZATION & SETUP
// ----------------------------------
const app = express();
const port = process.env.PORT || 8000;

// Connect to the database
require("./db/conn");

// Import all models ONCE in specific order
try {
    require("./models/User");
    require("./models/LoginToken");
    require("./models/Notification");
    require("./models/DashboardDailyMetric");
    require("./models/Product");
    require("./models/Payment");
    require("./models/CurrencyDetails");
    require("./models/PaymentConfiguration");
    require("./models/BusinessAPI");
    require("./models/TransactionExport");
    console.log('✅ All models loaded successfully');

    // --- FIX: Drop old/unused indexes on startup ---
    const mongoose = require('mongoose');
    mongoose.connection.once('open', async () => {
        try {
            const Payment = mongoose.model('Payment');
            const indexes = await Payment.collection.indexes();
            console.log('📋 Current Payment indexes:', indexes.map(i => i.name));

            // Drop old transactionId index if it exists
            const hasOldIndex = indexes.some(i => i.name === 'transactionId_1');
            if (hasOldIndex) {
                await Payment.collection.dropIndex('transactionId_1');
                console.log('🗑️ Dropped old transactionId_1 index');
            }

            // --- Initialize Payment Expiration Job ---
            const { initializePaymentExpirationJob } = require('./jobs/paymentExpirationJob');
            initializePaymentExpirationJob();

            // --- NEW: Initialize Payment Verification Job ---
            const { initializePaymentVerificationJob } = require('./jobs/paymentVerificationJob');
            initializePaymentVerificationJob();

        } catch (err) {
            if (err.code === 27) {
                console.log('ℹ️ Index transactionId_1 does not exist (already dropped)');
                const { initializePaymentExpirationJob } = require('./jobs/paymentExpirationJob');
                initializePaymentExpirationJob();
                
                // --- NEW: Initialize Payment Verification Job ---
                const { initializePaymentVerificationJob } = require('./jobs/paymentVerificationJob');
                initializePaymentVerificationJob();
            } else {
                console.warn('⚠️ Index cleanup warning:', err.message);
                const { initializePaymentExpirationJob } = require('./jobs/paymentExpirationJob');
                initializePaymentExpirationJob();
                
                // --- NEW: Initialize Payment Verification Job ---
                const { initializePaymentVerificationJob } = require('./jobs/paymentVerificationJob');
                initializePaymentVerificationJob();
            }
        }
    });

} catch (error) {
    console.error('❌ Error loading models:', error.message);
    process.exit(1);
}

// Import routes
const authRoutes = require('./routes/authRoutes');
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentConfigRoutes = require('./routes/paymentConfigRoutes');
const apiManagementRoutes = require('./routes/apiManagementRoutes');
const portfolioManagementRoutes = require('./routes/portfolioManagementRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const currencyRoutes = require('./routes/currencyRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const imagekitRoutes = require('./routes/imagekitRoutes');
const exportRoutes = require('./routes/exportRoutes'); // Add new routes

// ----------------------------------
//      MIDDLEWARE CONFIGURATION
// ----------------------------------
// CORS configuration
const corsOptions = {
    origin: [
        'http://localhost:3000', // React dev server
        'http://localhost:9000',
        '13.228.225.19',
        '18.142.128.26',
        '54.254.162.138',
        'https://quantumpayfinance.vercel.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight requests for all routes

// Increase payload size limit for JSON and URL-encoded data
app.use(express.json({ limit: '50mb' })); // Increased from default 100kb
app.use(express.urlencoded({ limit: '50mb', extended: false })); // Increased from default
app.use(cookieParser()); // To parse cookies

// Serve static files for the React app
app.use(express.static(path.join(__dirname, "../../client/dist")));

// ----------------------------------
//         CORE & API ROUTES
// ----------------------------------
// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Server is healthy",
        timestamp: new Date().toISOString()
    });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Contact routes
app.use('/api/contact', contactRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Payment configuration routes
app.use('/api/payment-config', paymentConfigRoutes);

// API management routes
app.use('/api/api-keys', apiManagementRoutes);

// Portfolio management routes
app.use('/api/portfolio', portfolioManagementRoutes);

// Payment routes
app.use('/api/payment', paymentRoutes);
app.use('/api/payments', paymentRoutes);

// Currency conversion routes
app.use('/api/currency', currencyRoutes);

// Dashboard routes
app.use('/api/dashboard', dashboardRoutes);

// ImageKit routes
app.use('/api/imagekit', imagekitRoutes);

// Export routes
app.use('/api/exports', exportRoutes);


// ----------------------------------
//         ERROR & CATCH-ALL
// ----------------------------------
// 404 handler for API routes (if no API route matches)
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});

// Catch-all handler: Forwards all other requests to the React app
// app.get("*", (req, res) => {
//     res.sendFile(path.join(__dirname, "../../client/dist", "index.html"));
// });

// ----------------------------------
//          START SERVER
// ----------------------------------
app.listen(port, () => {
    console.log(`✅ QuantumPay Server running on http://localhost:${port}/`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Database: ${process.env.MONGO_URI ? 'Connected' : 'Not configured'}`);
});