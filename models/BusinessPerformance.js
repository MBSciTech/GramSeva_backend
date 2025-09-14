// models/BusinessPerformance.js
const mongoose = require("mongoose");

const businessPerformanceSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: [true, "Business is required"],
    },
    period: {
      year: {
        type: Number,
        required: [true, "Year is required"],
        min: [2020, "Year must be 2020 or later"],
        max: [new Date().getFullYear() + 1, "Year cannot be in the future"],
      },
      quarter: {
        type: Number,
        required: [true, "Quarter is required"],
        min: [1, "Quarter must be between 1-4"],
        max: [4, "Quarter must be between 1-4"],
      },
      startDate: {
        type: Date,
        required: [true, "Period start date is required"],
      },
      endDate: {
        type: Date,
        required: [true, "Period end date is required"],
      },
    },
    // Financial metrics
    revenue: {
      type: Number,
      required: [true, "Revenue is required"],
      min: [0, "Revenue cannot be negative"],
    },
    expenses: {
      type: Number,
      required: [true, "Expenses are required"],
      min: [0, "Expenses cannot be negative"],
    },
    // Calculated fields
    profit: {
      type: Number,
      default: 0,
    },
    loss: {
      type: Number,
      default: 0,
    },
    // Detailed breakdown
    breakdown: {
      operatingRevenue: { type: Number, default: 0 },
      nonOperatingRevenue: { type: Number, default: 0 },
      operatingExpenses: { type: Number, default: 0 },
      nonOperatingExpenses: { type: Number, default: 0 },
      taxes: { type: Number, default: 0 },
      depreciation: { type: Number, default: 0 },
    },
    // Performance indicators
    metrics: {
      revenueGrowth: { type: Number, default: 0 }, // Percentage growth from previous period
      profitMargin: { type: Number, default: 0 }, // Profit margin percentage
      expenseRatio: { type: Number, default: 0 }, // Expense to revenue ratio
      returnOnInvestment: { type: Number, default: 0 }, // ROI percentage
    },
    // Status and validation
    status: {
      type: String,
      enum: {
        values: ["draft", "submitted", "verified", "approved"],
        message: "Invalid performance status"
      },
      default: "draft",
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Submitter is required"],
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedAt: {
      type: Date,
    },
    // Supporting documents
    documents: [{
      name: { type: String, required: true },
      url: { type: String, required: true },
      type: { 
        type: String, 
        enum: ["financial_statement", "bank_statement", "invoice", "receipt", "other"],
        required: true 
      },
      uploadedAt: { type: Date, default: Date.now }
    }],
    // Notes and comments
    notes: {
      type: String,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    internalNotes: {
      type: String,
      maxlength: [1000, "Internal notes cannot exceed 1000 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
businessPerformanceSchema.index({ business: 1 }); // Business lookup
businessPerformanceSchema.index({ "period.year": 1, "period.quarter": 1 }); // Period lookup
businessPerformanceSchema.index({ business: 1, "period.year": 1, "period.quarter": 1 }, { unique: true }); // Unique period per business
businessPerformanceSchema.index({ status: 1 }); // Status filtering
businessPerformanceSchema.index({ submittedBy: 1 }); // Submitter lookup
businessPerformanceSchema.index({ createdAt: -1 }); // Recent first

// Virtual for profit/loss calculation
businessPerformanceSchema.virtual('netResult').get(function() {
  return this.revenue - this.expenses;
});

// Virtual for formatted period
businessPerformanceSchema.virtual('periodLabel').get(function() {
  return `Q${this.period.quarter} ${this.period.year}`;
});

// Pre-save middleware to calculate financial metrics
businessPerformanceSchema.pre('save', function(next) {
  // Calculate profit/loss
  const netResult = this.revenue - this.expenses;
  if (netResult >= 0) {
    this.profit = netResult;
    this.loss = 0;
  } else {
    this.profit = 0;
    this.loss = Math.abs(netResult);
  }

  // Calculate metrics
  if (this.revenue > 0) {
    this.metrics.profitMargin = (this.profit / this.revenue) * 100;
    this.metrics.expenseRatio = (this.expenses / this.revenue) * 100;
  }

  // Calculate ROI (simplified - would need business investment data)
  // This would typically be calculated based on total business investment
  if (this.revenue > 0) {
    // Placeholder calculation - would need actual investment data
    this.metrics.returnOnInvestment = (this.profit / this.revenue) * 100;
  }

  next();
});

// Method to calculate growth from previous period
businessPerformanceSchema.methods.calculateGrowth = async function() {
  const previousPeriod = await this.constructor.findOne({
    business: this.business,
    "period.year": this.period.year - (this.period.quarter === 1 ? 1 : 0),
    "period.quarter": this.period.quarter === 1 ? 4 : this.period.quarter - 1,
    status: { $in: ["verified", "approved"] }
  });

  if (previousPeriod && previousPeriod.revenue > 0) {
    this.metrics.revenueGrowth = ((this.revenue - previousPeriod.revenue) / previousPeriod.revenue) * 100;
  }

  return this.save();
};

// Method to verify performance data
businessPerformanceSchema.methods.verify = function(verifiedBy, internalNotes) {
  this.status = 'verified';
  this.verifiedBy = verifiedBy;
  this.verifiedAt = new Date();
  if (internalNotes) {
    this.internalNotes = internalNotes;
  }
  return this.save();
};

// Method to approve performance data
businessPerformanceSchema.methods.approve = function(approvedBy) {
  this.status = 'approved';
  this.verifiedBy = approvedBy;
  this.verifiedAt = new Date();
  return this.save();
};

// Static method to get business performance history
businessPerformanceSchema.statics.getBusinessPerformanceHistory = async function(businessId, limit = 10) {
  return this.find({ business: businessId, status: { $in: ["verified", "approved"] } })
    .populate('submittedBy', 'username email')
    .populate('verifiedBy', 'username email')
    .sort({ "period.year": -1, "period.quarter": -1 })
    .limit(limit);
};

// Static method to get quarterly performance summary
businessPerformanceSchema.statics.getQuarterlySummary = async function(businessId, year) {
  return this.find({ 
    business: businessId, 
    "period.year": year,
    status: { $in: ["verified", "approved"] }
  })
    .sort({ "period.quarter": 1 });
};

// Static method to calculate annual performance
businessPerformanceSchema.statics.getAnnualPerformance = async function(businessId, year) {
  const quarterlyData = await this.find({ 
    business: businessId, 
    "period.year": year,
    status: { $in: ["verified", "approved"] }
  });

  if (quarterlyData.length === 0) return null;

  const annualData = quarterlyData.reduce((acc, quarter) => {
    acc.totalRevenue += quarter.revenue;
    acc.totalExpenses += quarter.expenses;
    acc.totalProfit += quarter.profit;
    acc.totalLoss += quarter.loss;
    return acc;
  }, {
    totalRevenue: 0,
    totalExpenses: 0,
    totalProfit: 0,
    totalLoss: 0
  });

  return {
    year,
    ...annualData,
    netResult: annualData.totalProfit - annualData.totalLoss,
    averageQuarterlyRevenue: annualData.totalRevenue / quarterlyData.length,
    averageQuarterlyProfit: annualData.totalProfit / quarterlyData.length
  };
};

module.exports = mongoose.model("BusinessPerformance", businessPerformanceSchema);
