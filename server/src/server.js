const express = require('express');
const router = express.Router();

router.use((req, res) => {
  res.status(410).json({
    success: false,
    message: 'Notification settings have been removed.'
  });
});

module.exports = router;