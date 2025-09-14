// models/Investment.js
const mongoose = require("mongoose");

const investmentSchema = new mongoose.Schema(
  {
    investor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Investor is required"],
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: [true, "Business is required"],
    },
    amount: {
      type: Number,
      required: [true, "Investment amount is required"],
      min: [100, "Minimum investment amount is ₹100"],
      max: [10000000, "Maximum investment amount is ₹1,00,00,000"],
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "completed", "refunded", "failed"],
        message: "Invalid investment status"
      },
      default: "pending",
    },
    // Payment details
    payment: {
      transactionId: {
        type: String,
        unique: true,
        sparse: true, // Allow null values but ensure uniqueness when present
      },
      paymentMethod: { 
        type: String,
        enum: ["bank_transfer", "upi", "wallet", "cash", "other"],
        default: "bank_transfer"
      },
      paymentStatus: { 
        type: String,
        enum: ["pending", "completed", "failed"],
        default: "pending"
      },
      paidAt: { type: Date },
      paymentReference: { type: String }, // Bank reference, UPI ID, etc.
    },
    // Investment terms and conditions
    terms: {
      expectedReturn: { type: Number }, // Expected annual return percentage
      investmentPeriod: { type: Number }, // Investment period in months
      riskLevel: { 
        type: String, 
        enum: ["low", "medium", "high"],
        default: "medium"
      },
    },
    // Investment tracking
    tracking: {
      investedAt: { type: Date },
      lastUpdated: { type: Date, default: Date.now },
      notes: { type: String },
    },
    // Refund details (if applicable)
    refund: {
      amount: { type: Number },
      reason: { type: String },
      processedAt: { type: Date },
      processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
investmentSchema.index({ investor: 1 }); // Investor lookup
investmentSchema.index({ business: 1 }); // Business lookup
investmentSchema.index({ status: 1 }); // Status filtering
investmentSchema.index({ "payment.transactionId": 1 }, { unique: true, sparse: true }); // Unique transaction ID
investmentSchema.index({ "payment.paymentReference": 1 }); // Payment reference lookup
investmentSchema.index({ createdAt: -1 }); // Recent investments first

// Compound index for investor-business combination
investmentSchema.index({ investor: 1, business: 1 });

// Virtual for investment share percentage
investmentSchema.virtual('sharePercentage').get(function() {
  // This will be calculated based on total business funding
  return 0; // Will be updated when business funding changes
});

// Pre-save middleware to update tracking
investmentSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.tracking.investedAt) {
    this.tracking.investedAt = new Date();
  }
  this.tracking.lastUpdated = new Date();
  next();
});

// Method to calculate share percentage
investmentSchema.methods.calculateSharePercentage = async function() {
  const Business = mongoose.model('Business');
  const business = await Business.findById(this.business);
  if (!business || business.raisedAmount === 0) return 0;
  return (this.amount / business.raisedAmount) * 100;
};

// Method to mark as completed
investmentSchema.methods.markAsCompleted = function(paymentDetails) {
  this.status = 'completed';
  this.payment = { ...this.payment, ...paymentDetails };
  this.payment.paymentStatus = 'completed';
  this.payment.paidAt = new Date();
  this.tracking.investedAt = new Date();
  return this.save();
};

// Method to process refund
investmentSchema.methods.processRefund = function(refundAmount, reason, processedBy) {
  this.status = 'refunded';
  this.refund = {
    amount: refundAmount,
    reason: reason,
    processedAt: new Date(),
    processedBy: processedBy
  };
  return this.save();
};

// Static method to get total investments for a business
investmentSchema.statics.getTotalInvestmentForBusiness = async function(businessId) {
  const result = await this.aggregate([
    { $match: { business: mongoose.Types.ObjectId(businessId), status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  return result.length > 0 ? result[0].total : 0;
};

// Static method to get investor's total investments
investmentSchema.statics.getInvestorTotalInvestment = async function(investorId) {
  const result = await this.aggregate([
    { $match: { investor: mongoose.Types.ObjectId(investorId), status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  return result.length > 0 ? result[0].total : 0;
};

// Static method to get business investors
investmentSchema.statics.getBusinessInvestors = async function(businessId) {
  return this.find({ business: businessId, status: 'completed' })
    .populate('investor', 'username email phoneNo')
    .sort({ amount: -1 });
};

module.exports = mongoose.model("Investment", investmentSchema);
