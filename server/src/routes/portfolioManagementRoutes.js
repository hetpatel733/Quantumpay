const express = require('express');
const router = express.Router();
const {
    getAllPortfolioItems,
    getPortfolioItemById,
    createPortfolioItem,
    updatePortfolioItem,
    deletePortfolioItem,
    togglePortfolioItemStatus,
    getPortfolioStats
} = require('../services/portfolioManagement');

// Get portfolio statistics (must be before /:itemId)
router.get('/stats', getPortfolioStats);

// Get all portfolio items for a user
router.get('/', getAllPortfolioItems);

// Get single portfolio item by ID
router.get('/:itemId', getPortfolioItemById);

// Create new portfolio item
router.post('/', createPortfolioItem);

// Update portfolio item
router.put('/:itemId', updatePortfolioItem);

// Toggle portfolio item status
router.patch('/:itemId/toggle', togglePortfolioItemStatus);

// Delete portfolio item
router.delete('/:itemId', deletePortfolioItem);

module.exports = router;
