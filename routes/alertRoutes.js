const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const User = require('../models/User');

// Middleware to check if user is authenticated (placeholder - implement JWT later)
const authenticateUser = async (req, res, next) => {
  try {
    const userId = req.headers['user-id'];
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Middleware to check if user is admin or staff
const requireAdminOrStaff = (req, res, next) => {
  if (!['admin', 'staff'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin or staff access required'
    });
  }
  next();
};

// @route   GET /api/alerts
// @desc    Get alerts for current user
// @access  Private
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, priority, seen, search } = req.query;
    const userId = req.user._id;
    const userRole = req.user.role;
    const userLocation = req.user.address;

    // Build filter object
    const filter = {
      $or: [
        // Alerts specifically for this user
        { user: userId },
        // Alerts for this user's role
        { targetRoles: userRole },
        // General alerts (no specific user or role)
        { user: null, targetRoles: { $size: 0 } },
        // Alerts for this user's location
        ...(userLocation?.state ? [{ 'targetLocation.state': userLocation.state }] : []),
        ...(userLocation?.city ? [{ 'targetLocation.city': userLocation.city }] : [])
      ],
      // Don't show expired alerts
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    };

    // Add additional filters
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (seen !== undefined) filter.seen = seen === 'true';
    if (search) {
      filter.$and = [
        {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }

    const alerts = await Alert.find(filter)
      .populate('createdBy', 'username email role')
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Alert.countDocuments(filter);

    res.status(200).json({
      success: true,
      alerts: alerts.map(alert => ({
        id: alert._id,
        title: alert.title,
        description: alert.description,
        type: alert.type,
        priority: alert.priority,
        seen: alert.seen,
        link: alert.link,
        targetRoles: alert.targetRoles,
        targetLocation: alert.targetLocation,
        expiresAt: alert.expiresAt,
        createdBy: alert.createdBy,
        createdAt: alert.createdAt,
        updatedAt: alert.updatedAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalAlerts: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/alerts/unread
// @desc    Get unread alerts count for current user
// @access  Private
router.get('/unread', authenticateUser, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const userLocation = req.user.address;

    const filter = {
      seen: false,
      $or: [
        { user: userId },
        { targetRoles: userRole },
        { user: null, targetRoles: { $size: 0 } },
        ...(userLocation?.state ? [{ 'targetLocation.state': userLocation.state }] : []),
        ...(userLocation?.city ? [{ 'targetLocation.city': userLocation.city }] : [])
      ],
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    };

    const unreadCount = await Alert.countDocuments(filter);

    res.status(200).json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/alerts/:id
// @desc    Get specific alert by ID
// @access  Private
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('createdBy', 'username email role')
      .populate('user', 'username email role');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Check if user has access to this alert
    const userId = req.user._id;
    const userRole = req.user.role;
    const userLocation = req.user.address;

    const hasAccess = 
      alert.user?.toString() === userId.toString() ||
      alert.targetRoles?.includes(userRole) ||
      (!alert.user && alert.targetRoles?.length === 0) ||
      (userLocation?.state && alert.targetLocation?.state === userLocation.state) ||
      (userLocation?.city && alert.targetLocation?.city === userLocation.city);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this alert'
      });
    }

    res.status(200).json({
      success: true,
      alert: {
        id: alert._id,
        title: alert.title,
        description: alert.description,
        type: alert.type,
        priority: alert.priority,
        seen: alert.seen,
        link: alert.link,
        targetRoles: alert.targetRoles,
        targetLocation: alert.targetLocation,
        expiresAt: alert.expiresAt,
        createdBy: alert.createdBy,
        user: alert.user,
        createdAt: alert.createdAt,
        updatedAt: alert.updatedAt
      }
    });
  } catch (error) {
    console.error('Get alert by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/alerts
// @desc    Create new alert (admin/staff only)
// @access  Private (Admin/Staff)
router.post('/', authenticateUser, requireAdminOrStaff, async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      priority,
      link,
      user,
      targetRoles,
      targetLocation,
      expiresAt
    } = req.body;

    // Validation
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }

    // Create new alert
    const alert = new Alert({
      title,
      description,
      type: type || 'general',
      priority: priority || 'medium',
      link,
      user: user || null,
      targetRoles: targetRoles || [],
      targetLocation: targetLocation || {},
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: req.user._id
    });

    await alert.save();

    // Populate the created alert
    await alert.populate('createdBy', 'username email role');

    res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      alert: {
        id: alert._id,
        title: alert.title,
        description: alert.description,
        type: alert.type,
        priority: alert.priority,
        seen: alert.seen,
        link: alert.link,
        targetRoles: alert.targetRoles,
        targetLocation: alert.targetLocation,
        expiresAt: alert.expiresAt,
        createdBy: alert.createdBy,
        user: alert.user,
        createdAt: alert.createdAt
      }
    });
  } catch (error) {
    console.error('Create alert error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   PUT /api/alerts/:id
// @desc    Update alert (admin/staff only)
// @access  Private (Admin/Staff)
router.put('/:id', authenticateUser, requireAdminOrStaff, async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      priority,
      link,
      user,
      targetRoles,
      targetLocation,
      expiresAt
    } = req.body;

    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Update fields
    if (title) alert.title = title;
    if (description) alert.description = description;
    if (type) alert.type = type;
    if (priority) alert.priority = priority;
    if (link !== undefined) alert.link = link;
    if (user !== undefined) alert.user = user;
    if (targetRoles !== undefined) alert.targetRoles = targetRoles;
    if (targetLocation !== undefined) alert.targetLocation = targetLocation;
    if (expiresAt !== undefined) alert.expiresAt = expiresAt ? new Date(expiresAt) : null;

    await alert.save();
    await alert.populate('createdBy', 'username email role');

    res.status(200).json({
      success: true,
      message: 'Alert updated successfully',
      alert: {
        id: alert._id,
        title: alert.title,
        description: alert.description,
        type: alert.type,
        priority: alert.priority,
        seen: alert.seen,
        link: alert.link,
        targetRoles: alert.targetRoles,
        targetLocation: alert.targetLocation,
        expiresAt: alert.expiresAt,
        createdBy: alert.createdBy,
        user: alert.user,
        createdAt: alert.createdAt,
        updatedAt: alert.updatedAt
      }
    });
  } catch (error) {
    console.error('Update alert error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   PUT /api/alerts/:id/mark-seen
// @desc    Mark alert as seen
// @access  Private
router.put('/:id/mark-seen', authenticateUser, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Check if user has access to this alert
    const userId = req.user._id;
    const userRole = req.user.role;
    const userLocation = req.user.address;

    const hasAccess = 
      alert.user?.toString() === userId.toString() ||
      alert.targetRoles?.includes(userRole) ||
      (!alert.user && alert.targetRoles?.length === 0) ||
      (userLocation?.state && alert.targetLocation?.state === userLocation.state) ||
      (userLocation?.city && alert.targetLocation?.city === userLocation.city);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this alert'
      });
    }

    alert.seen = true;
    await alert.save();

    res.status(200).json({
      success: true,
      message: 'Alert marked as seen'
    });
  } catch (error) {
    console.error('Mark alert as seen error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   PUT /api/alerts/mark-all-seen
// @desc    Mark all user's alerts as seen
// @access  Private
router.put('/mark-all-seen', authenticateUser, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const userLocation = req.user.address;

    const filter = {
      seen: false,
      $or: [
        { user: userId },
        { targetRoles: userRole },
        { user: null, targetRoles: { $size: 0 } },
        ...(userLocation?.state ? [{ 'targetLocation.state': userLocation.state }] : []),
        ...(userLocation?.city ? [{ 'targetLocation.city': userLocation.city }] : [])
      ]
    };

    const result = await Alert.updateMany(filter, { seen: true });

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} alerts marked as seen`
    });
  } catch (error) {
    console.error('Mark all alerts as seen error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   DELETE /api/alerts/:id
// @desc    Delete alert (admin/staff only)
// @access  Private (Admin/Staff)
router.delete('/:id', authenticateUser, requireAdminOrStaff, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/alerts/admin/all
// @desc    Get all alerts (admin/staff only)
// @access  Private (Admin/Staff)
router.get('/admin/all', authenticateUser, requireAdminOrStaff, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, priority, seen, search, createdBy } = req.query;
    
    // Build filter object
    const filter = {};
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (seen !== undefined) filter.seen = seen === 'true';
    if (createdBy) filter.createdBy = createdBy;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const alerts = await Alert.find(filter)
      .populate('createdBy', 'username email role')
      .populate('user', 'username email role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Alert.countDocuments(filter);

    res.status(200).json({
      success: true,
      alerts: alerts.map(alert => ({
        id: alert._id,
        title: alert.title,
        description: alert.description,
        type: alert.type,
        priority: alert.priority,
        seen: alert.seen,
        link: alert.link,
        targetRoles: alert.targetRoles,
        targetLocation: alert.targetLocation,
        expiresAt: alert.expiresAt,
        createdBy: alert.createdBy,
        user: alert.user,
        createdAt: alert.createdAt,
        updatedAt: alert.updatedAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalAlerts: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get all alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
