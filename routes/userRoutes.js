const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware to check if user is authenticated (placeholder - implement JWT later)
const authenticateUser = async (req, res, next) => {
  try {
    // For now, we'll use a simple header check
    // Later, implement proper JWT authentication
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

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phoneNo: user.phoneNo,
        role: user.role,
        gender: user.gender,
        address: user.address,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update current user profile
// @access  Private
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const { username, phoneNo, email, role, gender, address } = req.body;
    const userId = req.user._id;

    // Check if username, email, or phoneNo already exists for other users
    const existingUser = await User.findOne({
      _id: { $ne: userId },
      $or: [
        ...(username ? [{ username }] : []),
        ...(email ? [{ email: email.toLowerCase() }] : []),
        ...(phoneNo ? [{ phoneNo }] : [])
      ]
    });

    if (existingUser) {
      let field = '';
      if (existingUser.username === username) field = 'username';
      else if (existingUser.email === email?.toLowerCase()) field = 'email';
      else if (existingUser.phoneNo === phoneNo) field = 'phone number';
      
      return res.status(400).json({
        success: false,
        message: `User with this ${field} already exists`
      });
    }

    // Prepare update data
    const updateData = {};
    if (username) updateData.username = username;
    if (phoneNo) updateData.phoneNo = phoneNo;
    if (email) updateData.email = email.toLowerCase();
    if (role) updateData.role = role;
    if (gender) updateData.gender = gender;
    if (address) updateData.address = address;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        phoneNo: updatedUser.phoneNo,
        role: updatedUser.role,
        gender: updatedUser.gender,
        address: updatedUser.address,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    
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

// @route   DELETE /api/users/profile
// @desc    Delete current user account
// @access  Private
router.delete('/profile', authenticateUser, async (req, res) => {
  try {
    const userId = req.user._id;

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private (Admin)
router.get('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    
    // Build filter object
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNo: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      users: users.map(user => ({
        id: user._id,
        username: user.username,
        email: user.email,
        phoneNo: user.phoneNo,
        role: user.role,
        gender: user.gender,
        address: user.address,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID (admin only)
// @access  Private (Admin)
router.get('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phoneNo: user.phoneNo,
        role: user.role,
        gender: user.gender,
        address: user.address,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/users/admin/add
// @desc    Add new user (admin only)
// @access  Private (Admin)
router.post('/admin/add', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { username, phoneNo, email, password, role, gender, address } = req.body;

    // Validation
    if (!username || !phoneNo || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, phone number, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phoneNo },
        { username }
      ]
    });

    if (existingUser) {
      let field = '';
      if (existingUser.email === email.toLowerCase()) field = 'email';
      else if (existingUser.phoneNo === phoneNo) field = 'phone number';
      else if (existingUser.username === username) field = 'username';
      
      return res.status(400).json({
        success: false,
        message: `User with this ${field} already exists`
      });
    }

    // Create new user
    const user = new User({
      username,
      phoneNo,
      email: email.toLowerCase(),
      password,
      role: role || 'villager',
      gender: gender || 'prefer not to say',
      address: address || {}
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phoneNo: user.phoneNo,
        role: user.role,
        gender: user.gender,
        address: user.address,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Add user error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `User with this ${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user by ID (admin only)
// @access  Private (Admin)
router.put('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { username, phoneNo, email, role, gender, address } = req.body;
    const userId = req.params.id;

    // Check if user exists
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if username, email, or phoneNo already exists for other users
    const duplicateUser = await User.findOne({
      _id: { $ne: userId },
      $or: [
        ...(username ? [{ username }] : []),
        ...(email ? [{ email: email.toLowerCase() }] : []),
        ...(phoneNo ? [{ phoneNo }] : [])
      ]
    });

    if (duplicateUser) {
      let field = '';
      if (duplicateUser.username === username) field = 'username';
      else if (duplicateUser.email === email?.toLowerCase()) field = 'email';
      else if (duplicateUser.phoneNo === phoneNo) field = 'phone number';
      
      return res.status(400).json({
        success: false,
        message: `User with this ${field} already exists`
      });
    }

    // Prepare update data
    const updateData = {};
    if (username) updateData.username = username;
    if (phoneNo) updateData.phoneNo = phoneNo;
    if (email) updateData.email = email.toLowerCase();
    if (role) updateData.role = role;
    if (gender) updateData.gender = gender;
    if (address) updateData.address = address;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        phoneNo: updatedUser.phoneNo,
        role: updatedUser.role,
        gender: updatedUser.gender,
        address: updatedUser.address,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    
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

// @route   DELETE /api/users/:id
// @desc    Delete user by ID (admin only)
// @access  Private (Admin)
router.delete('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
