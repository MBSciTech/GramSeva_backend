// routes/distributionRoutes.js
const express = require('express');
const router = express.Router();
const {
  getInvestorDistributions,
  getDistributionById,
  approveDistribution,
  markDistributionAsPaid,
  getBusinessDistributions,
  getAllDistributions,
  getDistributionStats
} = require('../controllers/distributionController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Investor routes
router.get('/my', authorizeRoles('investor'), getInvestorDistributions); // Get investor's distributions
router.get('/my/:id', authorizeRoles('investor'), getDistributionById); // Get distribution by ID

// Business owner routes
router.get('/business/:businessId', authorizeRoles('business', 'admin'), getBusinessDistributions); // Get business distributions

// Admin routes
router.get('/admin/all', authorizeRoles('admin'), getAllDistributions); // Get all distributions
router.get('/admin/stats', authorizeRoles('admin'), getDistributionStats); // Get distribution statistics
router.put('/approve/:distributionId', authorizeRoles('admin'), approveDistribution); // Approve distribution
router.put('/pay/:distributionId', authorizeRoles('admin'), markDistributionAsPaid); // Mark distribution as paid

module.exports = router;
