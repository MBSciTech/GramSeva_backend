// controllers/distributionController.js
const Distribution = require('../models/Distribution');
const Business = require('../models/Business');
const Investment = require('../models/Investment');

// Get investor's distributions
const getInvestorDistributions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, year, quarter } = req.query;

    const filter = { investor: req.user._id };
    if (status) filter.status = status;
    if (year) filter['period.year'] = parseInt(year);
    if (quarter) filter['period.quarter'] = parseInt(quarter);

    const distributions = await Distribution.find(filter)
      .populate('business', 'name sector')
      .populate('businessPerformance', 'period revenue expenses profit loss')
      .populate('investment', 'amount investedAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Distribution.countDocuments(filter);

    // Calculate summary statistics
    const summary = await Distribution.aggregate([
      { $match: { investor: req.user._id } },
      {
        $group: {
          _id: null,
          totalDistributions: { $sum: 1 },
          totalProfitReceived: { $sum: '$amounts.profitShare' },
          totalLossIncurred: { $sum: '$amounts.lossShare' },
          totalNetReceived: { $sum: '$amounts.netDistribution' },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$amounts.netDistribution', 0]
            }
          },
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$amounts.netDistribution', 0]
            }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      distributions: distributions.map(distribution => ({
        id: distribution._id,
        business: distribution.business,
        businessPerformance: distribution.businessPerformance,
        investment: distribution.investment,
        calculation: distribution.calculation,
        amounts: distribution.amounts,
        status: distribution.status,
        period: distribution.period,
        periodLabel: distribution.periodLabel,
        payment: distribution.payment,
        approval: distribution.approval,
        metadata: distribution.metadata,
        summary: distribution.summary,
        createdAt: distribution.createdAt,
        updatedAt: distribution.updatedAt
      })),
      summary: summary.length > 0 ? summary[0] : {
        totalDistributions: 0,
        totalProfitReceived: 0,
        totalLossIncurred: 0,
        totalNetReceived: 0,
        pendingAmount: 0,
        paidAmount: 0
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalDistributions: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get investor distributions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get distribution by ID
const getDistributionById = async (req, res) => {
  try {
    const distribution = await Distribution.findById(req.params.id)
      .populate('business', 'name sector owner')
      .populate('businessPerformance', 'period revenue expenses profit loss')
      .populate('investment', 'amount investedAt')
      .populate('investor', 'username email phoneNo')
      .populate('audit.createdBy', 'username email')
      .populate('audit.lastModifiedBy', 'username email')
      .populate('approval.approvedBy', 'username email')
      .populate('payment.processedBy', 'username email');

    if (!distribution) {
      return res.status(404).json({
        success: false,
        message: 'Distribution not found'
      });
    }

    // Check access permissions
    if (distribution.investor._id.toString() !== req.user._id.toString() && 
        distribution.business.owner.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      distribution: {
        id: distribution._id,
        business: distribution.business,
        businessPerformance: distribution.businessPerformance,
        investment: distribution.investment,
        investor: distribution.investor,
        calculation: distribution.calculation,
        amounts: distribution.amounts,
        status: distribution.status,
        period: distribution.period,
        periodLabel: distribution.periodLabel,
        payment: distribution.payment,
        approval: distribution.approval,
        notifications: distribution.notifications,
        metadata: distribution.metadata,
        audit: distribution.audit,
        summary: distribution.summary,
        createdAt: distribution.createdAt,
        updatedAt: distribution.updatedAt
      }
    });
  } catch (error) {
    console.error('Get distribution by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Approve distribution (admin only)
const approveDistribution = async (req, res) => {
  try {
    const { distributionId } = req.params;
    const { approvalNotes } = req.body;

    const distribution = await Distribution.findById(distributionId);
    if (!distribution) {
      return res.status(404).json({
        success: false,
        message: 'Distribution not found'
      });
    }

    if (distribution.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending distributions can be approved'
      });
    }

    await distribution.approve(req.user._id, approvalNotes);

    res.status(200).json({
      success: true,
      message: 'Distribution approved successfully',
      distribution: {
        id: distribution._id,
        status: distribution.status,
        approval: distribution.approval
      }
    });
  } catch (error) {
    console.error('Approve distribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Mark distribution as paid (admin only)
const markDistributionAsPaid = async (req, res) => {
  try {
    const { distributionId } = req.params;
    const { paymentMethod, transactionId } = req.body;

    const distribution = await Distribution.findById(distributionId);
    if (!distribution) {
      return res.status(404).json({
        success: false,
        message: 'Distribution not found'
      });
    }

    if (distribution.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved distributions can be marked as paid'
      });
    }

    const paymentDetails = {
      method: paymentMethod,
      transactionId: transactionId
    };

    await distribution.markAsPaid(req.user._id, paymentDetails);

    // Send notifications to investor
    await distribution.sendNotifications();

    res.status(200).json({
      success: true,
      message: 'Distribution marked as paid successfully',
      distribution: {
        id: distribution._id,
        status: distribution.status,
        payment: distribution.payment,
        notifications: distribution.notifications
      }
    });
  } catch (error) {
    console.error('Mark distribution as paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get business distributions (for business owners and admins)
const getBusinessDistributions = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { page = 1, limit = 10, year, quarter, status } = req.query;

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
    if (quarter) filter['period.quarter'] = parseInt(quarter);
    if (status) filter.status = status;

    const distributions = await Distribution.find(filter)
      .populate('investor', 'username email phoneNo')
      .populate('investment', 'amount')
      .populate('businessPerformance', 'period revenue expenses profit loss')
      .sort({ 'amounts.netDistribution': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Distribution.countDocuments(filter);

    // Get total distributions for the period
    const totalDistributions = await Distribution.getTotalDistributions(
      businessId, 
      year ? parseInt(year) : null, 
      quarter ? parseInt(quarter) : null
    );

    res.status(200).json({
      success: true,
      distributions: distributions.map(distribution => ({
        id: distribution._id,
        investor: distribution.investor,
        investment: distribution.investment,
        businessPerformance: distribution.businessPerformance,
        calculation: distribution.calculation,
        amounts: distribution.amounts,
        status: distribution.status,
        period: distribution.period,
        periodLabel: distribution.periodLabel,
        payment: distribution.payment,
        approval: distribution.approval,
        metadata: distribution.metadata,
        summary: distribution.summary,
        createdAt: distribution.createdAt,
        updatedAt: distribution.updatedAt
      })),
      totalDistributions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalDistributions: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get business distributions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all distributions (admin only)
const getAllDistributions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      year, 
      quarter, 
      businessId,
      investorId 
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (year) filter['period.year'] = parseInt(year);
    if (quarter) filter['period.quarter'] = parseInt(quarter);
    if (businessId) filter.business = businessId;
    if (investorId) filter.investor = investorId;

    const distributions = await Distribution.find(filter)
      .populate('business', 'name sector')
      .populate('investor', 'username email')
      .populate('investment', 'amount')
      .populate('businessPerformance', 'period revenue expenses profit loss')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Distribution.countDocuments(filter);

    res.status(200).json({
      success: true,
      distributions: distributions.map(distribution => ({
        id: distribution._id,
        business: distribution.business,
        investor: distribution.investor,
        investment: distribution.investment,
        businessPerformance: distribution.businessPerformance,
        calculation: distribution.calculation,
        amounts: distribution.amounts,
        status: distribution.status,
        period: distribution.period,
        periodLabel: distribution.periodLabel,
        payment: distribution.payment,
        approval: distribution.approval,
        metadata: distribution.metadata,
        summary: distribution.summary,
        createdAt: distribution.createdAt,
        updatedAt: distribution.updatedAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalDistributions: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get all distributions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get distribution statistics (admin only)
const getDistributionStats = async (req, res) => {
  try {
    const { year, quarter } = req.query;

    const matchStage = {};
    if (year) matchStage['period.year'] = parseInt(year);
    if (quarter) matchStage['period.quarter'] = parseInt(quarter);

    const stats = await Distribution.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalDistributions: { $sum: 1 },
          totalProfitDistributed: { $sum: '$amounts.profitShare' },
          totalLossDistributed: { $sum: '$amounts.lossShare' },
          totalNetDistributed: { $sum: '$amounts.netDistribution' },
          pendingDistributions: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          approvedDistributions: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          paidDistributions: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
          },
          failedDistributions: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      }
    ]);

    const statusBreakdown = await Distribution.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amounts.netDistribution' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      stats: stats.length > 0 ? stats[0] : {
        totalDistributions: 0,
        totalProfitDistributed: 0,
        totalLossDistributed: 0,
        totalNetDistributed: 0,
        pendingDistributions: 0,
        approvedDistributions: 0,
        paidDistributions: 0,
        failedDistributions: 0
      },
      statusBreakdown
    });
  } catch (error) {
    console.error('Get distribution stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getInvestorDistributions,
  getDistributionById,
  approveDistribution,
  markDistributionAsPaid,
  getBusinessDistributions,
  getAllDistributions,
  getDistributionStats
};
