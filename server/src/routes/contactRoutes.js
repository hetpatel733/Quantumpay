const express = require('express');
const router = express.Router();
const { handleContact } = require('../services/contact');

// POST /api/contact - Submit contact form
router.post('/', handleContact);

module.exports = router;
