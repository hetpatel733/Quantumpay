const express = require('express');
const router = express.Router();
const {
    createExport,
    getAllExports,
    getExportById,
    deleteExport,
    retryExport
} = require('../services/exportService');

// Create new export job
router.post('/', createExport);

// Get all exports for a user
router.get('/', getAllExports);

// Get single export by ID
router.get('/:exportId', getExportById);

// Delete export
router.delete('/:exportId', deleteExport);

// Retry failed export
router.post('/:exportId/retry', retryExport);

module.exports = router;
