// models/Business.js
const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
      maxlength: [100, "Business name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Business description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    sector: {
      type: String,
      required: [true, "Business sector is required"],
      enum: {
        values: [
          "agriculture",
          "technology",
          "manufacturing",
          "retail",
          "services",
          "healthcare",
          "education",
          "finance",
          "real_estate",
          "energy",
          "transportation",
          "food_beverage",
          "other"
        ],
        message: "Invalid business sector"
      },
    },
    fundingGoal: {
      type: Number,
      required: [true, "Funding goal is required"],
      min: [1000, "Minimum funding goal is ₹1,000"],
      max: [100000000, "Maximum funding goal is ₹10,00,00,000"],
    },
    raisedAmount: {
      type: Number,
      default: 0,
      min: [0, "Raised amount cannot be negative"],
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: [true, "Location coordinates are required"],
        validate: {
          validator: function (v) {
            return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
          },
          message: "Invalid coordinates. Must be [longitude, latitude] with valid ranges.",
        },
      },
      address: {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        postalCode: { type: String, trim: true },
        country: { type: String, trim: true, default: "India" },
      },
    },
    status: {
      type: String,
      enum: {
        values: ["open", "funded", "closed"],
        message: "Invalid business status"
      },
      default: "open",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Business owner is required"],
    },
    // Business documents and media
    documents: [{
      name: { type: String, required: true },
      url: { type: String, required: true },
      type: { type: String, enum: ["business_plan", "financial_statement", "legal_document", "other"] },
      uploadedAt: { type: Date, default: Date.now }
    }],
    // Business metrics
    metrics: {
      totalInvestors: { type: Number, default: 0 },
      averageInvestment: { type: Number, default: 0 },
      fundingProgress: { type: Number, default: 0 }, // Percentage
    },
    // Business timeline
    timeline: [{
      event: { type: String, required: true },
      description: { type: String },
      date: { type: Date, default: Date.now },
      type: { type: String, enum: ["milestone", "update", "achievement", "other"] }
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
businessSchema.index({ location: "2dsphere" }); // Geo-spatial index
businessSchema.index({ owner: 1 }); // Owner lookup
businessSchema.index({ status: 1 }); // Status filtering
businessSchema.index({ sector: 1 }); // Sector filtering
businessSchema.index({ fundingGoal: 1 }); // Funding goal sorting
businessSchema.index({ raisedAmount: 1 }); // Raised amount sorting

// Virtual for funding progress percentage
businessSchema.virtual('fundingProgressPercentage').get(function() {
  if (this.fundingGoal === 0) return 0;
  return Math.round((this.raisedAmount / this.fundingGoal) * 100);
});

// Virtual for remaining funding needed
businessSchema.virtual('remainingFunding').get(function() {
  return Math.max(0, this.fundingGoal - this.raisedAmount);
});

// Pre-save middleware to update metrics
businessSchema.pre('save', async function(next) {
  if (this.isModified('raisedAmount') || this.isModified('fundingGoal')) {
    this.metrics.fundingProgress = this.fundingProgressPercentage;
  }
  next();
});

// Method to check if business is fully funded
businessSchema.methods.isFullyFunded = function() {
  return this.raisedAmount >= this.fundingGoal;
};

// Method to update business status based on funding
businessSchema.methods.updateStatus = function() {
  if (this.raisedAmount >= this.fundingGoal) {
    this.status = 'funded';
  } else if (this.status === 'funded' && this.raisedAmount < this.fundingGoal) {
    this.status = 'open';
  }
  return this.status;
};

// Static method to find businesses by location
businessSchema.statics.findNearby = function(longitude, latitude, maxDistance = 10000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    status: 'open'
  });
};

module.exports = mongoose.model("Business", businessSchema);
