// routes/investmentRoutes.js
const express = require('express');
const router = express.Router();
const {
  createInvestment,
  verifyInvestment,
  getUserInvestments,
  getInvestmentById,
  getBusinessInvestments,
  cancelInvestment
} = require('../controllers/investmentController');
const { authenticateToken, authorizeRoles, authorizeInvestor } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Investor routes
router.post('/create', authorizeRoles('investor'), createInvestment); // Create investment
router.post('/verify', authorizeRoles('investor'), verifyInvestment); // Verify payment
router.get('/my', authorizeRoles('investor'), getUserInvestments); // Get user's investments
router.get('/my/:id', authorizeInvestor, getInvestmentById); // Get investment by ID
router.put('/cancel/:id', authorizeInvestor, cancelInvestment); // Cancel investment

// Business owner and admin routes
router.get('/business/:businessId', authorizeRoles('business', 'admin'), getBusinessInvestments); // Get business investments

module.exports = router;
