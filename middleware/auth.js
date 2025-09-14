// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Authentication Middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

// Business owner authorization middleware
const authorizeBusinessOwner = async (req, res, next) => {
  try {
    const businessId = req.params.id || req.params.businessId || req.body.business;
    
    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    const Business = require('../models/Business');
    const business = await Business.findById(businessId);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Check if user is the business owner or admin
    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only business owner or admin can perform this action'
      });
    }

    req.business = business;
    next();
  } catch (error) {
    console.error('Business owner authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization failed'
    });
  }
};

// Investor authorization middleware
const authorizeInvestor = async (req, res, next) => {
  try {
    const investmentId = req.params.id || req.params.investmentId || req.body.investment;
    
    if (!investmentId) {
      return res.status(400).json({
        success: false,
        message: 'Investment ID is required'
      });
    }

    const Investment = require('../models/Investment');
    const investment = await Investment.findById(investmentId);
    
    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investment not found'
      });
    }

    // Check if user is the investor or admin
    if (investment.investor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only investor or admin can perform this action'
      });
    }

    req.investment = investment;
    next();
  } catch (error) {
    console.error('Investor authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization failed'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeBusinessOwner,
  authorizeInvestor,
  optionalAuth,
  generateToken,
  generateRefreshToken
};
