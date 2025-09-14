// models/Distribution.js
const mongoose = require("mongoose");

const distributionSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: [true, "Business is required"],
    },
    businessPerformance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessPerformance",
      required: [true, "Business performance is required"],
    },
    investor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Investor is required"],
    },
    investment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Investment",
      required: [true, "Investment is required"],
    },
    // Distribution calculation
    calculation: {
      investmentAmount: {
        type: Number,
        required: [true, "Investment amount is required"],
      },
      totalBusinessInvestment: {
        type: Number,
        required: [true, "Total business investment is required"],
      },
      sharePercentage: {
        type: Number,
        required: [true, "Share percentage is required"],
        min: [0, "Share percentage cannot be negative"],
        max: [100, "Share percentage cannot exceed 100%"],
      },
      businessProfit: {
        type: Number,
        required: [true, "Business profit is required"],
      },
      businessLoss: {
        type: Number,
        default: 0,
      },
    },
    // Distribution amounts
    amounts: {
      profitShare: {
        type: Number,
        default: 0,
        min: [0, "Profit share cannot be negative"],
      },
      lossShare: {
        type: Number,
        default: 0,
        min: [0, "Loss share cannot be negative"],
      },
      netDistribution: {
        type: Number,
        default: 0,
      },
    },
    // Distribution status and processing
    status: {
      type: String,
      enum: {
        values: ["pending", "approved", "paid", "failed", "cancelled"],
        message: "Invalid distribution status"
      },
      default: "pending",
    },
    // Payment processing
    payment: {
      method: {
        type: String,
        enum: ["bank_transfer", "upi", "wallet", "other"],
      },
      transactionId: {
        type: String,
        unique: true,
        sparse: true,
      },
      processedAt: {
        type: Date,
      },
      processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      failureReason: {
        type: String,
      },
    },
    // Distribution period
    period: {
      year: {
        type: Number,
        required: [true, "Year is required"],
      },
      quarter: {
        type: Number,
        required: [true, "Quarter is required"],
        min: [1, "Quarter must be between 1-4"],
        max: [4, "Quarter must be between 1-4"],
      },
      distributionDate: {
        type: Date,
        default: Date.now,
      },
    },
    // Approval workflow
    approval: {
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      approvedAt: {
        type: Date,
      },
      approvalNotes: {
        type: String,
        maxlength: [500, "Approval notes cannot exceed 500 characters"],
      },
    },
    // Notifications and communication
    notifications: {
      investorNotified: {
        type: Boolean,
        default: false,
      },
      notificationSentAt: {
        type: Date,
      },
      emailSent: {
        type: Boolean,
        default: false,
      },
      smsSent: {
        type: Boolean,
        default: false,
      },
    },
    // Audit trail
    audit: {
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Creator is required"],
      },
      lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      lastModifiedAt: {
        type: Date,
        default: Date.now,
      },
    },
    // Additional metadata
    metadata: {
      distributionType: {
        type: String,
        enum: ["profit", "loss", "mixed"],
        required: [true, "Distribution type is required"],
      },
      taxDeducted: {
        type: Number,
        default: 0,
      },
      netAmountAfterTax: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
distributionSchema.index({ business: 1 }); // Business lookup
distributionSchema.index({ investor: 1 }); // Investor lookup
distributionSchema.index({ investment: 1 }); // Investment lookup
distributionSchema.index({ businessPerformance: 1 }); // Performance lookup
distributionSchema.index({ status: 1 }); // Status filtering
distributionSchema.index({ "period.year": 1, "period.quarter": 1 }); // Period lookup
distributionSchema.index({ "payment.transactionId": 1 }, { unique: true, sparse: true }); // Unique transaction ID
distributionSchema.index({ createdAt: -1 }); // Recent first

// Compound indexes
distributionSchema.index({ investor: 1, status: 1 }); // Investor's distributions by status
distributionSchema.index({ business: 1, "period.year": 1, "period.quarter": 1 }); // Business quarterly distributions

// Virtual for formatted period
distributionSchema.virtual('periodLabel').get(function() {
  return `Q${this.period.quarter} ${this.period.year}`;
});

// Virtual for distribution summary
distributionSchema.virtual('summary').get(function() {
  return {
    totalAmount: this.amounts.netDistribution,
    profitShare: this.amounts.profitShare,
    lossShare: this.amounts.lossShare,
    sharePercentage: this.calculation.sharePercentage,
    status: this.status
  };
});

// Pre-save middleware to calculate distribution amounts
distributionSchema.pre('save', function(next) {
  // Calculate profit and loss shares
  this.amounts.profitShare = (this.calculation.sharePercentage / 100) * this.calculation.businessProfit;
  this.amounts.lossShare = (this.calculation.sharePercentage / 100) * this.calculation.businessLoss;
  
  // Calculate net distribution (profit - loss)
  this.amounts.netDistribution = this.amounts.profitShare - this.amounts.lossShare;
  
  // Determine distribution type
  if (this.amounts.profitShare > 0 && this.amounts.lossShare > 0) {
    this.metadata.distributionType = "mixed";
  } else if (this.amounts.profitShare > 0) {
    this.metadata.distributionType = "profit";
  } else if (this.amounts.lossShare > 0) {
    this.metadata.distributionType = "loss";
  }

  // Calculate net amount after tax (simplified - would need actual tax calculation)
  this.metadata.netAmountAfterTax = this.amounts.netDistribution - this.metadata.taxDeducted;

  // Update last modified
  this.audit.lastModifiedAt = new Date();

  next();
});

// Method to approve distribution
distributionSchema.methods.approve = function(approvedBy, approvalNotes) {
  this.status = 'approved';
  this.approval.approvedBy = approvedBy;
  this.approval.approvedAt = new Date();
  if (approvalNotes) {
    this.approval.approvalNotes = approvalNotes;
  }
  this.audit.lastModifiedBy = approvedBy;
  return this.save();
};

// Method to mark as paid
distributionSchema.methods.markAsPaid = function(processedBy, paymentDetails) {
  this.status = 'paid';
  this.payment = { ...this.payment, ...paymentDetails };
  this.payment.processedAt = new Date();
  this.payment.processedBy = processedBy;
  this.audit.lastModifiedBy = processedBy;
  return this.save();
};

// Method to mark as failed
distributionSchema.methods.markAsFailed = function(failureReason, processedBy) {
  this.status = 'failed';
  this.payment.failureReason = failureReason;
  this.payment.processedBy = processedBy;
  this.audit.lastModifiedBy = processedBy;
  return this.save();
};

// Method to send notifications
distributionSchema.methods.sendNotifications = function() {
  this.notifications.investorNotified = true;
  this.notifications.notificationSentAt = new Date();
  // Here you would integrate with email/SMS services
  return this.save();
};

// Static method to get investor's distributions
distributionSchema.statics.getInvestorDistributions = async function(investorId, status = null) {
  const filter = { investor: investorId };
  if (status) filter.status = status;

  return this.find(filter)
    .populate('business', 'name sector')
    .populate('businessPerformance', 'period revenue expenses profit loss')
    .populate('investment', 'amount investedAt')
    .sort({ createdAt: -1 });
};

// Static method to get business distributions for a period
distributionSchema.statics.getBusinessDistributions = async function(businessId, year, quarter) {
  const filter = { business: businessId };
  if (year) filter["period.year"] = year;
  if (quarter) filter["period.quarter"] = quarter;

  return this.find(filter)
    .populate('investor', 'username email phoneNo')
    .populate('investment', 'amount')
    .sort({ amounts: { netDistribution: -1 } });
};

// Static method to calculate total distributions for a business period
distributionSchema.statics.getTotalDistributions = async function(businessId, year, quarter) {
  const result = await this.aggregate([
    {
      $match: {
        business: mongoose.Types.ObjectId(businessId),
        "period.year": year,
        "period.quarter": quarter,
        status: { $in: ["paid", "approved"] }
      }
    },
    {
      $group: {
        _id: null,
        totalProfitDistributed: { $sum: "$amounts.profitShare" },
        totalLossDistributed: { $sum: "$amounts.lossShare" },
        totalNetDistributed: { $sum: "$amounts.netDistribution" },
        totalDistributions: { $sum: 1 }
      }
    }
  ]);

  return result.length > 0 ? result[0] : {
    totalProfitDistributed: 0,
    totalLossDistributed: 0,
    totalNetDistributed: 0,
    totalDistributions: 0
  };
};

module.exports = mongoose.model("Distribution", distributionSchema);
