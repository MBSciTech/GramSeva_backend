// routes/businessRoutes.js
const express = require('express');
const router = express.Router();
const {
  createBusiness,
  getBusinesses,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
  getUserBusinesses,
  getBusinessSectors
} = require('../controllers/businessController');
const { authenticateToken, authorizeRoles, authorizeBusinessOwner } = require('../middleware/auth');

// Public routes
router.get('/', getBusinesses); // Get all businesses with filtering
router.get('/sectors', getBusinessSectors); // Get available business sectors
router.get('/:id', getBusinessById); // Get business by ID

// Protected routes
router.use(authenticateToken); // All routes below require authentication

// Business owner routes
router.post('/create', authorizeRoles('business'), createBusiness); // Create new business
router.get('/my/list', authorizeRoles('business'), getUserBusinesses); // Get user's businesses
router.put('/:id', authorizeBusinessOwner, updateBusiness); // Update business
router.delete('/:id', authorizeBusinessOwner, deleteBusiness); // Delete business

module.exports = router;
