const express = require('express');
const router = express.Router();
const {
    getRecentActivity,
    getDashboardOverview,
    getCryptoDistribution
} = require('../services/dashboardService');

// Get dashboard overview
router.get('/overview', getDashboardOverview);

// Get recent activity
router.get('/recent-activity', getRecentActivity);

// Get crypto distribution
router.get('/crypto-distribution', getCryptoDistribution);

module.exports = router;
