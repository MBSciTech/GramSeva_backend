// controllers/investmentController.js
const Investment = require('../models/Investment');
const Business = require('../models/Business');
const User = require('../models/User');

// Create investment
const createInvestment = async (req, res) => {
  try {
    const { businessId, amount, terms = {}, paymentMethod = 'bank_transfer', paymentReference } = req.body;

    // Validate required fields
    if (!businessId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Business ID and amount are required'
      });
    }

    // Validate amount
    if (amount < 100 || amount > 10000000) {
      return res.status(400).json({
        success: false,
        message: 'Investment amount must be between ₹100 and ₹1,00,00,000'
      });
    }

    // Check if business exists and is open for investment
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    if (business.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Business is not open for investment'
      });
    }

    // Check if business is fully funded
    if (business.isFullyFunded()) {
      return res.status(400).json({
        success: false,
        message: 'Business is already fully funded'
      });
    }

    // Check if user is not the business owner
    if (business.owner.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot invest in your own business'
      });
    }

    // Check if user has already invested in this business
    const existingInvestment = await Investment.findOne({
      investor: req.user._id,
      business: businessId,
      status: { $in: ['pending', 'completed'] }
    });

    if (existingInvestment) {
      return res.status(400).json({
        success: false,
        message: 'You have already invested in this business'
      });
    }

    // Generate transaction ID
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create investment record
    const investment = new Investment({
      investor: req.user._id,
      business: businessId,
      amount,
      terms,
      payment: {
        transactionId,
        paymentMethod,
        paymentReference,
        paymentStatus: 'pending'
      }
    });

    await investment.save();

    // Populate related data
    await investment.populate('investor', 'username email phoneNo');
    await investment.populate('business', 'name sector fundingGoal raisedAmount');

    res.status(201).json({
      success: true,
      message: 'Investment created successfully. Please complete the payment.',
      investment: {
        id: investment._id,
        amount: investment.amount,
        status: investment.status,
        terms: investment.terms,
        investor: investment.investor,
        business: investment.business,
        payment: {
          transactionId: investment.payment.transactionId,
          paymentMethod: investment.payment.paymentMethod,
          paymentReference: investment.payment.paymentReference,
          paymentStatus: investment.payment.paymentStatus
        },
        createdAt: investment.createdAt
      }
    });
  } catch (error) {
    console.error('Create investment error:', error);
    
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

// Verify payment and complete investment (Mock payment verification)
const verifyInvestment = async (req, res) => {
  try {
    const {
      investmentId,
      paymentReference,
      paymentMethod = 'bank_transfer'
    } = req.body;

    // Validate required fields
    if (!investmentId) {
      return res.status(400).json({
        success: false,
        message: 'Investment ID is required'
      });
    }

    // Find investment
    const investment = await Investment.findById(investmentId);
    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investment not found'
      });
    }

    // Check if investment belongs to the user
    if (investment.investor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if investment is still pending
    if (investment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Investment is not in pending status'
      });
    }

    // Mock payment verification - In a real scenario, you would verify with the payment provider
    // For now, we'll simulate a successful payment verification
    const mockPaymentVerification = {
      success: true,
      paymentId: `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: investment.amount,
      currency: 'INR',
      status: 'captured',
      method: paymentMethod
    };

    if (!mockPaymentVerification.success) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Update investment with payment details
    const paymentDetails = {
      paymentMethod: paymentMethod,
      paymentReference: paymentReference,
      paymentStatus: 'completed',
      paidAt: new Date()
    };

    // Mark investment as completed
    await investment.markAsCompleted(paymentDetails);

    // Update business raised amount
    const business = await Business.findById(investment.business);
    if (business) {
      business.raisedAmount += investment.amount;
      business.metrics.totalInvestors += 1;
      business.metrics.averageInvestment = business.raisedAmount / business.metrics.totalInvestors;
      
      // Update business status if fully funded
      business.updateStatus();
      
      await business.save();
    }

    // Populate related data
    await investment.populate('investor', 'username email phoneNo');
    await investment.populate('business', 'name sector fundingGoal raisedAmount');

    res.status(200).json({
      success: true,
      message: 'Investment completed successfully',
      investment: {
        id: investment._id,
        amount: investment.amount,
        status: investment.status,
        terms: investment.terms,
        investor: investment.investor,
        business: investment.business,
        payment: investment.payment,
        tracking: investment.tracking,
        createdAt: investment.createdAt,
        updatedAt: investment.updatedAt
      }
    });
  } catch (error) {
    console.error('Verify investment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user's investments
const getUserInvestments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { investor: req.user._id };
    if (status) filter.status = status;

    const investments = await Investment.find(filter)
      .populate('business', 'name sector status fundingGoal raisedAmount location')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Investment.countDocuments(filter);

    // Calculate share percentages
    const investmentsWithShares = await Promise.all(
      investments.map(async (investment) => {
        const sharePercentage = await investment.calculateSharePercentage();
        return {
          id: investment._id,
          amount: investment.amount,
          status: investment.status,
          terms: investment.terms,
          business: investment.business,
          payment: investment.payment,
          tracking: investment.tracking,
          sharePercentage,
          createdAt: investment.createdAt,
          updatedAt: investment.updatedAt
        };
      })
    );

    res.status(200).json({
      success: true,
      investments: investmentsWithShares,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalInvestments: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get user investments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get investment by ID
const getInvestmentById = async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.id)
      .populate('investor', 'username email phoneNo role')
      .populate('business', 'name sector status fundingGoal raisedAmount location owner');

    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investment not found'
      });
    }

    // Check access permissions
    if (investment.investor._id.toString() !== req.user._id.toString() && 
        investment.business.owner.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const sharePercentage = await investment.calculateSharePercentage();

    res.status(200).json({
      success: true,
      investment: {
        id: investment._id,
        amount: investment.amount,
        status: investment.status,
        terms: investment.terms,
        investor: investment.investor,
        business: investment.business,
        payment: investment.payment,
        tracking: investment.tracking,
        refund: investment.refund,
        sharePercentage,
        createdAt: investment.createdAt,
        updatedAt: investment.updatedAt
      }
    });
  } catch (error) {
    console.error('Get investment by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get business investments (for business owners and admins)
const getBusinessInvestments = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

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
    if (status) filter.status = status;

    const investments = await Investment.find(filter)
      .populate('investor', 'username email phoneNo')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Investment.countDocuments(filter);

    // Calculate total investment amount
    const totalInvestment = await Investment.getTotalInvestmentForBusiness(businessId);

    res.status(200).json({
      success: true,
      investments: investments.map(investment => ({
        id: investment._id,
        amount: investment.amount,
        status: investment.status,
        terms: investment.terms,
        investor: investment.investor,
        payment: investment.payment,
        tracking: investment.tracking,
        sharePercentage: totalInvestment > 0 ? (investment.amount / totalInvestment) * 100 : 0,
        createdAt: investment.createdAt,
        updatedAt: investment.updatedAt
      })),
      totalInvestment,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalInvestments: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get business investments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Cancel investment (only if pending)
const cancelInvestment = async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.id);

    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investment not found'
      });
    }

    // Check if user is the investor
    if (investment.investor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if investment can be cancelled
    if (investment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending investments can be cancelled'
      });
    }

    investment.status = 'failed';
    investment.tracking.notes = 'Cancelled by investor';
    await investment.save();

    res.status(200).json({
      success: true,
      message: 'Investment cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel investment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createInvestment,
  verifyInvestment,
  getUserInvestments,
  getInvestmentById,
  getBusinessInvestments,
  cancelInvestment
};
