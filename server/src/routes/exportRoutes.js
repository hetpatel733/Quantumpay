const express = require('express');
const router = express.Router();
const {
    createDashboardPDFExport,
    createExport,
    getAllExports,
    getExportById,
    deleteExport,
    retryExport
} = require('../services/exportService');

// Upload dashboard PDF and save in export history
router.post('/dashboard-pdf', createDashboardPDFExport);

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
