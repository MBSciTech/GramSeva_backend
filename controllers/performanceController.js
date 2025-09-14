// controllers/performanceController.js
const BusinessPerformance = require('../models/BusinessPerformance');
const Business = require('../models/Business');
const Investment = require('../models/Investment');
const Distribution = require('../models/Distribution');

// Submit business performance
const submitPerformance = async (req, res) => {
  try {
    const {
      businessId,
      year,
      quarter,
      startDate,
      endDate,
      revenue,
      expenses,
      breakdown = {},
      documents = [],
      notes
    } = req.body;

    // Validate required fields
    if (!businessId || !year || !quarter || !startDate || !endDate || !revenue || !expenses) {
      return res.status(400).json({
        success: false,
        message: 'Business ID, year, quarter, dates, revenue, and expenses are required'
      });
    }

    // Check if business exists and user is the owner
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    if (business.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only business owner can submit performance'
      });
    }

    // Check if performance for this period already exists
    const existingPerformance = await BusinessPerformance.findOne({
      business: businessId,
      'period.year': year,
      'period.quarter': quarter
    });

    if (existingPerformance) {
      return res.status(400).json({
        success: false,
        message: 'Performance for this period already exists'
      });
    }

    // Create performance record
    const performance = new BusinessPerformance({
      business: businessId,
      period: {
        year,
        quarter,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      },
      revenue,
      expenses,
      breakdown,
      documents,
      notes,
      submittedBy: req.user._id,
      status: 'submitted'
    });

    await performance.save();

    // Calculate growth from previous period
    await performance.calculateGrowth();

    // Populate related data
    await performance.populate('business', 'name sector owner');
    await performance.populate('submittedBy', 'username email');

    res.status(201).json({
      success: true,
      message: 'Performance submitted successfully',
      performance: {
        id: performance._id,
        business: performance.business,
        period: performance.period,
        periodLabel: performance.periodLabel,
        revenue: performance.revenue,
        expenses: performance.expenses,
        profit: performance.profit,
        loss: performance.loss,
        netResult: performance.netResult,
        breakdown: performance.breakdown,
        metrics: performance.metrics,
        status: performance.status,
        documents: performance.documents,
        notes: performance.notes,
        submittedBy: performance.submittedBy,
        createdAt: performance.createdAt,
        updatedAt: performance.updatedAt
      }
    });
  } catch (error) {
    console.error('Submit performance error:', error);
    
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

// Get business performance history
const getBusinessPerformance = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { page = 1, limit = 10, year, status } = req.query;

    // Check if business exists
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Check access permissions
    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const filter = { business: businessId };
    if (year) filter['period.year'] = parseInt(year);
    if (status) filter.status = status;

    const performances = await BusinessPerformance.find(filter)
      .populate('submittedBy', 'username email')
      .populate('verifiedBy', 'username email')
      .sort({ 'period.year': -1, 'period.quarter': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await BusinessPerformance.countDocuments(filter);

    res.status(200).json({
      success: true,
      performances: performances.map(performance => ({
        id: performance._id,
        period: performance.period,
        periodLabel: performance.periodLabel,
        revenue: performance.revenue,
        expenses: performance.expenses,
        profit: performance.profit,
        loss: performance.loss,
        netResult: performance.netResult,
        breakdown: performance.breakdown,
        metrics: performance.metrics,
        status: performance.status,
        documents: performance.documents,
        notes: performance.notes,
        submittedBy: performance.submittedBy,
        verifiedBy: performance.verifiedBy,
        verifiedAt: performance.verifiedAt,
        createdAt: performance.createdAt,
        updatedAt: performance.updatedAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPerformances: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get business performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Verify performance (admin only)
const verifyPerformance = async (req, res) => {
  try {
    const { performanceId } = req.params;
    const { internalNotes } = req.body;

    const performance = await BusinessPerformance.findById(performanceId);
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Performance record not found'
      });
    }

    if (performance.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Performance must be in submitted status to verify'
      });
    }

    await performance.verify(req.user._id, internalNotes);

    // Populate related data
    await performance.populate('submittedBy', 'username email');
    await performance.populate('verifiedBy', 'username email');

    res.status(200).json({
      success: true,
      message: 'Performance verified successfully',
      performance: {
        id: performance._id,
        period: performance.period,
        periodLabel: performance.periodLabel,
        revenue: performance.revenue,
        expenses: performance.expenses,
        profit: performance.profit,
        loss: performance.loss,
        netResult: performance.netResult,
        breakdown: performance.breakdown,
        metrics: performance.metrics,
        status: performance.status,
        documents: performance.documents,
        notes: performance.notes,
        internalNotes: performance.internalNotes,
        submittedBy: performance.submittedBy,
        verifiedBy: performance.verifiedBy,
        verifiedAt: performance.verifiedAt,
        createdAt: performance.createdAt,
        updatedAt: performance.updatedAt
      }
    });
  } catch (error) {
    console.error('Verify performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Approve performance and create distributions
const approvePerformance = async (req, res) => {
  try {
    const { performanceId } = req.params;

    const performance = await BusinessPerformance.findById(performanceId);
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Performance record not found'
      });
    }

    if (performance.status !== 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Performance must be verified before approval'
      });
    }

    // Approve performance
    await performance.approve(req.user._id);

    // Get all completed investments for this business
    const investments = await Investment.find({
      business: performance.business,
      status: 'completed'
    }).populate('investor', 'username email');

    if (investments.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Performance approved successfully. No investors found for distribution.',
        performance: {
          id: performance._id,
          status: performance.status,
          verifiedBy: performance.verifiedBy,
          verifiedAt: performance.verifiedAt
        }
      });
    }

    // Calculate total investment amount
    const totalInvestment = investments.reduce((sum, inv) => sum + inv.amount, 0);

    // Create distributions for each investor
    const distributions = [];
    for (const investment of investments) {
      const sharePercentage = (investment.amount / totalInvestment) * 100;
      
      const distribution = new Distribution({
        business: performance.business,
        businessPerformance: performance._id,
        investor: investment.investor._id,
        investment: investment._id,
        calculation: {
          investmentAmount: investment.amount,
          totalBusinessInvestment: totalInvestment,
          sharePercentage: sharePercentage,
          businessProfit: performance.profit,
          businessLoss: performance.loss
        },
        period: {
          year: performance.period.year,
          quarter: performance.period.quarter,
          distributionDate: new Date()
        },
        audit: {
          createdBy: req.user._id
        }
      });

      await distribution.save();
      distributions.push(distribution);
    }

    res.status(200).json({
      success: true,
      message: 'Performance approved and distributions created successfully',
      performance: {
        id: performance._id,
        status: performance.status,
        verifiedBy: performance.verifiedBy,
        verifiedAt: performance.verifiedAt
      },
      distributions: {
        count: distributions.length,
        totalAmount: distributions.reduce((sum, dist) => sum + dist.amounts.netDistribution, 0)
      }
    });
  } catch (error) {
    console.error('Approve performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get performance by ID
const getPerformanceById = async (req, res) => {
  try {
    const performance = await BusinessPerformance.findById(req.params.id)
      .populate('business', 'name sector owner')
      .populate('submittedBy', 'username email')
      .populate('verifiedBy', 'username email');

    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Performance record not found'
      });
    }

    // Check access permissions
    if (performance.business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      performance: {
        id: performance._id,
        business: performance.business,
        period: performance.period,
        periodLabel: performance.periodLabel,
        revenue: performance.revenue,
        expenses: performance.expenses,
        profit: performance.profit,
        loss: performance.loss,
        netResult: performance.netResult,
        breakdown: performance.breakdown,
        metrics: performance.metrics,
        status: performance.status,
        documents: performance.documents,
        notes: performance.notes,
        internalNotes: performance.internalNotes,
        submittedBy: performance.submittedBy,
        verifiedBy: performance.verifiedBy,
        verifiedAt: performance.verifiedAt,
        createdAt: performance.createdAt,
        updatedAt: performance.updatedAt
      }
    });
  } catch (error) {
    console.error('Get performance by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get annual performance summary
const getAnnualPerformance = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: 'Year is required'
      });
    }

    // Check if business exists
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Check access permissions
    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const annualData = await BusinessPerformance.getAnnualPerformance(businessId, parseInt(year));

    if (!annualData) {
      return res.status(404).json({
        success: false,
        message: 'No performance data found for the specified year'
      });
    }

    res.status(200).json({
      success: true,
      annualPerformance: annualData
    });
  } catch (error) {
    console.error('Get annual performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  submitPerformance,
  getBusinessPerformance,
  verifyPerformance,
  approvePerformance,
  getPerformanceById,
  getAnnualPerformance
};
