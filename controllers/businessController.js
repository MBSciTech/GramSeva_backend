// controllers/businessController.js
const Business = require('../models/Business');
const User = require('../models/User');
const Investment = require('../models/Investment');

// Create a new business
const createBusiness = async (req, res) => {
  try {
    const {
      name,
      description,
      sector,
      fundingGoal,
      location,
      documents = [],
      timeline = []
    } = req.body;

    // Validate required fields
    if (!name || !description || !sector || !fundingGoal || !location) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, sector, funding goal, and location are required'
      });
    }

    // Validate location coordinates
    if (!location.coordinates || location.coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Valid location coordinates [longitude, latitude] are required'
      });
    }

    // Create business
    const business = new Business({
      name,
      description,
      sector,
      fundingGoal,
      location,
      owner: req.user._id,
      documents,
      timeline
    });

    await business.save();

    // Populate owner details
    await business.populate('owner', 'username email phoneNo role');

    res.status(201).json({
      success: true,
      message: 'Business created successfully',
      business: {
        id: business._id,
        name: business.name,
        description: business.description,
        sector: business.sector,
        fundingGoal: business.fundingGoal,
        raisedAmount: business.raisedAmount,
        location: business.location,
        status: business.status,
        owner: business.owner,
        documents: business.documents,
        timeline: business.timeline,
        metrics: business.metrics,
        fundingProgressPercentage: business.fundingProgressPercentage,
        remainingFunding: business.remainingFunding,
        createdAt: business.createdAt,
        updatedAt: business.updatedAt
      }
    });
  } catch (error) {
    console.error('Create business error:', error);
    
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
};

// Get all businesses with filtering
const getBusinesses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sector,
      status = 'open',
      minFunding,
      maxFunding,
      location,
      radius = 50,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    if (sector) filter.sector = sector;
    if (status) filter.status = status;

    // Funding range filter
    if (minFunding || maxFunding) {
      filter.fundingGoal = {};
      if (minFunding) filter.fundingGoal.$gte = parseInt(minFunding);
      if (maxFunding) filter.fundingGoal.$lte = parseInt(maxFunding);
    }

    // Location-based filter
    if (location) {
      const [longitude, latitude] = location.split(',').map(Number);
      if (longitude && latitude) {
        filter.location = {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [longitude, latitude]
            },
            $maxDistance: radius * 1000 // Convert km to meters
          }
        };
      }
    }

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sector: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const businesses = await Business.find(filter)
      .populate('owner', 'username email phoneNo role')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Business.countDocuments(filter);

    res.status(200).json({
      success: true,
      businesses: businesses.map(business => ({
        id: business._id,
        name: business.name,
        description: business.description,
        sector: business.sector,
        fundingGoal: business.fundingGoal,
        raisedAmount: business.raisedAmount,
        location: business.location,
        status: business.status,
        owner: business.owner,
        metrics: business.metrics,
        fundingProgressPercentage: business.fundingProgressPercentage,
        remainingFunding: business.remainingFunding,
        isFullyFunded: business.isFullyFunded(),
        createdAt: business.createdAt,
        updatedAt: business.updatedAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalBusinesses: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get businesses error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get business by ID
const getBusinessById = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id)
      .populate('owner', 'username email phoneNo role address')
      .populate('timeline.event');

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Get business investors
    const investors = await Investment.getBusinessInvestors(business._id);

    // Get total investment amount
    const totalInvestment = await Investment.getTotalInvestmentForBusiness(business._id);

    res.status(200).json({
      success: true,
      business: {
        id: business._id,
        name: business.name,
        description: business.description,
        sector: business.sector,
        fundingGoal: business.fundingGoal,
        raisedAmount: business.raisedAmount,
        location: business.location,
        status: business.status,
        owner: business.owner,
        documents: business.documents,
        timeline: business.timeline,
        metrics: {
          ...business.metrics,
          totalInvestment,
          totalInvestors: investors.length
        },
        fundingProgressPercentage: business.fundingProgressPercentage,
        remainingFunding: business.remainingFunding,
        isFullyFunded: business.isFullyFunded(),
        investors: investors.map(investment => ({
          id: investment._id,
          investor: investment.investor,
          amount: investment.amount,
          investedAt: investment.tracking.investedAt,
          sharePercentage: (investment.amount / totalInvestment) * 100
        })),
        createdAt: business.createdAt,
        updatedAt: business.updatedAt
      }
    });
  } catch (error) {
    console.error('Get business by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update business
const updateBusiness = async (req, res) => {
  try {
    const {
      name,
      description,
      sector,
      fundingGoal,
      location,
      documents,
      timeline
    } = req.body;

    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Update fields
    if (name) business.name = name;
    if (description) business.description = description;
    if (sector) business.sector = sector;
    if (fundingGoal) business.fundingGoal = fundingGoal;
    if (location) business.location = location;
    if (documents) business.documents = documents;
    if (timeline) business.timeline = timeline;

    await business.save();
    await business.populate('owner', 'username email phoneNo role');

    res.status(200).json({
      success: true,
      message: 'Business updated successfully',
      business: {
        id: business._id,
        name: business.name,
        description: business.description,
        sector: business.sector,
        fundingGoal: business.fundingGoal,
        raisedAmount: business.raisedAmount,
        location: business.location,
        status: business.status,
        owner: business.owner,
        documents: business.documents,
        timeline: business.timeline,
        metrics: business.metrics,
        fundingProgressPercentage: business.fundingProgressPercentage,
        remainingFunding: business.remainingFunding,
        createdAt: business.createdAt,
        updatedAt: business.updatedAt
      }
    });
  } catch (error) {
    console.error('Update business error:', error);
    
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
};

// Delete business
const deleteBusiness = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Check if business has investments
    const investments = await Investment.find({ business: business._id });
    if (investments.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete business with existing investments'
      });
    }

    await Business.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Business deleted successfully'
    });
  } catch (error) {
    console.error('Delete business error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user's businesses
const getUserBusinesses = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { owner: req.user._id };
    if (status) filter.status = status;

    const businesses = await Business.find(filter)
      .populate('owner', 'username email phoneNo role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Business.countDocuments(filter);

    res.status(200).json({
      success: true,
      businesses: businesses.map(business => ({
        id: business._id,
        name: business.name,
        description: business.description,
        sector: business.sector,
        fundingGoal: business.fundingGoal,
        raisedAmount: business.raisedAmount,
        location: business.location,
        status: business.status,
        metrics: business.metrics,
        fundingProgressPercentage: business.fundingProgressPercentage,
        remainingFunding: business.remainingFunding,
        isFullyFunded: business.isFullyFunded(),
        createdAt: business.createdAt,
        updatedAt: business.updatedAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalBusinesses: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get user businesses error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get business sectors
const getBusinessSectors = async (req, res) => {
  try {
    const sectors = await Business.distinct('sector', { status: 'open' });
    
    res.status(200).json({
      success: true,
      sectors
    });
  } catch (error) {
    console.error('Get business sectors error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createBusiness,
  getBusinesses,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
  getUserBusinesses,
  getBusinessSectors
};
