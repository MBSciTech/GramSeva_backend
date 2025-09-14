// models/Alert.js
const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: ["gov_scheme", "weather", "news", "market", "general", "emergency", "announcement"],
      required: [true, "Alert type is required"],
      default: "general",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    seen: {
      type: Boolean,
      default: false,
    },
    // optional: link to more info (gov site, news article, etc.)
    link: {
      type: String,
      trim: true,
    },
    // optional: which user(s) this alert is for
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // optional: target specific roles
    targetRoles: [{
      type: String,
      enum: ["villager", "farmer", "government official", "buyer", "admin", "staff", "adviser", "investor", "other"]
    }],
    // optional: target specific locations
    targetLocation: {
      state: { type: String, trim: true },
      city: { type: String, trim: true },
      district: { type: String, trim: true }
    },
    // optional: expiry date for the alert
    expiresAt: {
      type: Date,
    },
    // created by (admin/staff)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Index for better query performance
alertSchema.index({ user: 1, seen: 1 });
alertSchema.index({ type: 1, priority: 1 });
alertSchema.index({ expiresAt: 1 });

module.exports = mongoose.model("Alert", alertSchema);
