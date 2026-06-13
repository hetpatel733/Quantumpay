const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../utils/adminAuth');
const {
    getAllPaymentsAdmin,
    approvePayment,
    rejectPayment,
    triggerManualCronJob
} = require('../services/adminService');

// All admin routes require authentication + admin role
router.use(requireAuth, requireAdmin);

// Verify admin access - lightweight endpoint for frontend auth check
router.get('/verify', (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'Admin access verified',
        user: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
        }
    });
});

// Get all payments for admin
router.get('/payments', getAllPaymentsAdmin);

// Approve payment
router.post('/payments/:payId/approve', approvePayment);

// Reject payment
router.post('/payments/:payId/reject', rejectPayment);

// Manual cron job trigger
router.post('/trigger-cron-job', triggerManualCronJob);

module.exports = router;
