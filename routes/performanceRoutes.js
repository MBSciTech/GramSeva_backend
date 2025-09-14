// routes/performanceRoutes.js
const express = require('express');
const router = express.Router();
const {
  submitPerformance,
  getBusinessPerformance,
  verifyPerformance,
  approvePerformance,
  getPerformanceById,
  getAnnualPerformance
} = require('../controllers/performanceController');
const { authenticateToken, authorizeRoles, authorizeBusinessOwner } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Business owner routes
router.post('/submit', authorizeRoles('business'), submitPerformance); // Submit performance
router.get('/business/:businessId', authorizeBusinessOwner, getBusinessPerformance); // Get business performance
router.get('/business/:businessId/annual', authorizeBusinessOwner, getAnnualPerformance); // Get annual performance
router.get('/:id', authorizeBusinessOwner, getPerformanceById); // Get performance by ID

// Admin routes
router.put('/verify/:performanceId', authorizeRoles('admin'), verifyPerformance); // Verify performance
router.put('/approve/:performanceId', authorizeRoles('admin'), approvePerformance); // Approve performance and create distributions

module.exports = router;
