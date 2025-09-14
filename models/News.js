// models/News.js
const mongoose = require("mongoose");
const slugify = require("slugify");

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 300,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    summary: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    source: {
      name: { type: String, trim: true }, // e.g., "The Hindu", "Delhi Govt"
      url: { type: String, trim: true },
    },
    author: {
      name: { type: String, trim: true },
      profileUrl: { type: String, trim: true },
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    category: {
      type: String,
      enum: ["gov_scheme", "weather", "news", "market", "sports", "health", "education", "general"],
      default: "news",
    },
    tags: [{ type: String, trim: true }],
    language: {
      type: String,
      default: "en",
      maxlength: 10,
    },
    url: {
      type: String,
      trim: true, // original news link (if any)
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    // Geo location for local news: use GeoJSON point
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        // [longitude, latitude]
        type: [Number],
        validate: {
          validator: function (v) {
            return v.length === 2;
          },
          message: "Coordinates must be an array of [lon, lat].",
        },
      },
      placeName: { type: String, trim: true },
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // any extra metadata
    meta: {
      sentiment: { type: String }, // optional: "positive"|"negative"|"neutral"
      importanceScore: { type: Number }, // custom ranking
    },
  },
  {
    timestamps: true,
  }
);

// TEXT index for search on title, summary, content, tags, source.name
newsSchema.index({
  title: "text",
  summary: "text",
  content: "text",
  "source.name": "text",
  tags: "text",
});

// Geo index for location
newsSchema.index({ "location": "2dsphere" });

// Pre-save slug generation (if title changed)
newsSchema.pre("save", function (next) {
  if (this.isModified("title") || !this.slug) {
    const base = slugify(this.title || "", { lower: true, strict: true }).slice(0, 160);
    // append short id to keep slugs unique-ish — adjust strategy as needed
    this.slug = `${base}-${this._id.toString().slice(-6)}`;
  }
  next();
});

module.exports = mongoose.model("News", newsSchema);
