const express = require('express');
const router = express.Router();
const {
    getAllPaymentsAdmin,
    approvePayment,
    rejectPayment
} = require('../services/adminService');

// Get all payments for admin
router.get('/payments', getAllPaymentsAdmin);

// Approve payment
router.post('/payments/:payId/approve', approvePayment);

// Reject payment
router.post('/payments/:payId/reject', rejectPayment);

module.exports = router;
