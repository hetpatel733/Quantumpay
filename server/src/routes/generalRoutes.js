const express = require('express');
const router = express.Router();
const { contact } = require('../services/contact');
const { paymentinfo } = require('../services/paymentinfo');

// Contact form submission
router.post('/contact', async (req, res) => {
  contact(req, res);
});

// Payment info endpoint (for demo/testing purposes)
router.get('/paymentinfo', async (req, res) => {
  paymentinfo(req, res);
});

module.exports = router;
