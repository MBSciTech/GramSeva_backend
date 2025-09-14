const express = require('express');
const router = express.Router();
const News = require('../models/News');
const User = require('../models/User');

// Middleware to check if user is authenticated (placeholder - implement JWT later)
const authenticateUser = async (req, res, next) => {
  try {
    const userId = req.headers['user-id'];
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Middleware to check if user is admin or staff
const requireAdminOrStaff = (req, res, next) => {
  if (!['admin', 'staff'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin or staff access required'
    });
  }
  next();
};

// @route   GET /api/news
// @desc    Get all published news with filtering and search
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      language = 'en', 
      search, 
      featured,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
      location,
      radius = 50 // in kilometers
    } = req.query;

    // Build filter object
    const filter = {
      status: 'published'
    };

    // Add category filter
    if (category) filter.category = category;

    // Add language filter
    if (language) filter.language = language;

    // Add featured filter
    if (featured === 'true') filter.isFeatured = true;

    // Add search filter
    if (search) {
      filter.$text = { $search: search };
    }

    // Add location filter (geo-spatial query)
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

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const news = await News.find(filter)
      .populate('createdBy', 'username email role')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-content'); // Exclude full content for list view

    const total = await News.countDocuments(filter);

    res.status(200).json({
      success: true,
      news: news.map(article => ({
        id: article._id,
        title: article.title,
        slug: article.slug,
        summary: article.summary,
        source: article.source,
        author: article.author,
        publishedAt: article.publishedAt,
        category: article.category,
        tags: article.tags,
        language: article.language,
        imageUrl: article.imageUrl,
        location: article.location,
        isFeatured: article.isFeatured,
        views: article.views,
        createdBy: article.createdBy,
        createdAt: article.createdAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalNews: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/news/featured
// @desc    Get featured news
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const featuredNews = await News.find({
      status: 'published',
      isFeatured: true
    })
      .populate('createdBy', 'username email role')
      .sort({ publishedAt: -1 })
      .limit(parseInt(limit))
      .select('-content');

    res.status(200).json({
      success: true,
      news: featuredNews.map(article => ({
        id: article._id,
        title: article.title,
        slug: article.slug,
        summary: article.summary,
        source: article.source,
        author: article.author,
        publishedAt: article.publishedAt,
        category: article.category,
        tags: article.tags,
        language: article.language,
        imageUrl: article.imageUrl,
        location: article.location,
        views: article.views,
        createdBy: article.createdBy
      }))
    });
  } catch (error) {
    console.error('Get featured news error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/news/categories
// @desc    Get available news categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await News.distinct('category', { status: 'published' });
    
    res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/news/:slug
// @desc    Get news article by slug
// @access  Public
router.get('/:slug', async (req, res) => {
  try {
    const article = await News.findOne({ 
      slug: req.params.slug,
      status: 'published'
    })
      .populate('createdBy', 'username email role');

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Increment view count
    article.views += 1;
    await article.save();

    res.status(200).json({
      success: true,
      article: {
        id: article._id,
        title: article.title,
        slug: article.slug,
        summary: article.summary,
        content: article.content,
        source: article.source,
        author: article.author,
        publishedAt: article.publishedAt,
        category: article.category,
        tags: article.tags,
        language: article.language,
        url: article.url,
        imageUrl: article.imageUrl,
        location: article.location,
        isFeatured: article.isFeatured,
        views: article.views,
        meta: article.meta,
        createdBy: article.createdBy,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt
      }
    });
  } catch (error) {
    console.error('Get article by slug error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/news
// @desc    Create new news article (admin/staff only)
// @access  Private (Admin/Staff)
router.post('/', authenticateUser, requireAdminOrStaff, async (req, res) => {
  try {
    const {
      title,
      summary,
      content,
      source,
      author,
      publishedAt,
      category,
      tags,
      language,
      url,
      imageUrl,
      location,
      isFeatured,
      status,
      meta
    } = req.body;

    // Validation
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    // Create new article
    const article = new News({
      title,
      summary,
      content,
      source: source || {},
      author: author || {},
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      category: category || 'news',
      tags: tags || [],
      language: language || 'en',
      url,
      imageUrl,
      location: location || {},
      isFeatured: isFeatured || false,
      status: status || 'published',
      meta: meta || {},
      createdBy: req.user._id
    });

    await article.save();
    await article.populate('createdBy', 'username email role');

    res.status(201).json({
      success: true,
      message: 'Article created successfully',
      article: {
        id: article._id,
        title: article.title,
        slug: article.slug,
        summary: article.summary,
        content: article.content,
        source: article.source,
        author: article.author,
        publishedAt: article.publishedAt,
        category: article.category,
        tags: article.tags,
        language: article.language,
        url: article.url,
        imageUrl: article.imageUrl,
        location: article.location,
        isFeatured: article.isFeatured,
        views: article.views,
        status: article.status,
        meta: article.meta,
        createdBy: article.createdBy,
        createdAt: article.createdAt
      }
    });
  } catch (error) {
    console.error('Create article error:', error);
    
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
});

// @route   PUT /api/news/:id
// @desc    Update news article (admin/staff only)
// @access  Private (Admin/Staff)
router.put('/:id', authenticateUser, requireAdminOrStaff, async (req, res) => {
  try {
    const {
      title,
      summary,
      content,
      source,
      author,
      publishedAt,
      category,
      tags,
      language,
      url,
      imageUrl,
      location,
      isFeatured,
      status,
      meta
    } = req.body;

    const article = await News.findById(req.params.id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Update fields
    if (title) article.title = title;
    if (summary !== undefined) article.summary = summary;
    if (content) article.content = content;
    if (source !== undefined) article.source = source;
    if (author !== undefined) article.author = author;
    if (publishedAt) article.publishedAt = new Date(publishedAt);
    if (category) article.category = category;
    if (tags !== undefined) article.tags = tags;
    if (language) article.language = language;
    if (url !== undefined) article.url = url;
    if (imageUrl !== undefined) article.imageUrl = imageUrl;
    if (location !== undefined) article.location = location;
    if (isFeatured !== undefined) article.isFeatured = isFeatured;
    if (status) article.status = status;
    if (meta !== undefined) article.meta = meta;

    await article.save();
    await article.populate('createdBy', 'username email role');

    res.status(200).json({
      success: true,
      message: 'Article updated successfully',
      article: {
        id: article._id,
        title: article.title,
        slug: article.slug,
        summary: article.summary,
        content: article.content,
        source: article.source,
        author: article.author,
        publishedAt: article.publishedAt,
        category: article.category,
        tags: article.tags,
        language: article.language,
        url: article.url,
        imageUrl: article.imageUrl,
        location: article.location,
        isFeatured: article.isFeatured,
        views: article.views,
        status: article.status,
        meta: article.meta,
        createdBy: article.createdBy,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt
      }
    });
  } catch (error) {
    console.error('Update article error:', error);
    
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
});

// @route   DELETE /api/news/:id
// @desc    Delete news article (admin/staff only)
// @access  Private (Admin/Staff)
router.delete('/:id', authenticateUser, requireAdminOrStaff, async (req, res) => {
  try {
    const article = await News.findByIdAndDelete(req.params.id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Article deleted successfully'
    });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/news/admin/all
// @desc    Get all news articles including drafts (admin/staff only)
// @access  Private (Admin/Staff)
router.get('/admin/all', authenticateUser, requireAdminOrStaff, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      status, 
      search, 
      createdBy,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build filter object
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (createdBy) filter.createdBy = createdBy;
    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const articles = await News.find(filter)
      .populate('createdBy', 'username email role')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await News.countDocuments(filter);

    res.status(200).json({
      success: true,
      articles: articles.map(article => ({
        id: article._id,
        title: article.title,
        slug: article.slug,
        summary: article.summary,
        content: article.content,
        source: article.source,
        author: article.author,
        publishedAt: article.publishedAt,
        category: article.category,
        tags: article.tags,
        language: article.language,
        url: article.url,
        imageUrl: article.imageUrl,
        location: article.location,
        isFeatured: article.isFeatured,
        views: article.views,
        status: article.status,
        meta: article.meta,
        createdBy: article.createdBy,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalArticles: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get all articles error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   PUT /api/news/:id/feature
// @desc    Toggle featured status of article (admin/staff only)
// @access  Private (Admin/Staff)
router.put('/:id/feature', authenticateUser, requireAdminOrStaff, async (req, res) => {
  try {
    const article = await News.findById(req.params.id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    article.isFeatured = !article.isFeatured;
    await article.save();

    res.status(200).json({
      success: true,
      message: `Article ${article.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      isFeatured: article.isFeatured
    });
  } catch (error) {
    console.error('Toggle feature error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   PUT /api/news/:id/status
// @desc    Update article status (admin/staff only)
// @access  Private (Admin/Staff)
router.put('/:id/status', authenticateUser, requireAdminOrStaff, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be draft, published, or archived'
      });
    }

    const article = await News.findById(req.params.id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    article.status = status;
    await article.save();

    res.status(200).json({
      success: true,
      message: `Article status updated to ${status}`,
      status: article.status
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/news/all
// @desc    Fetch all published news for users
// @access  Public
router.get('/all', async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = 'publishedAt', sortOrder = 'desc' } = req.query;

    // Build filter: only published news
    const filter = { status: 'published' };

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Fetch news with pagination
    const news = await News.find(filter)
      .populate('createdBy', 'username email role')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await News.countDocuments(filter);

    res.status(200).json({
      success: true,
      totalNews: total,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      news: news.map(article => ({
        id: article._id,
        title: article.title,
        slug: article.slug,
        summary: article.summary,
        source: article.source,
        author: article.author,
        publishedAt: article.publishedAt,
        category: article.category,
        tags: article.tags,
        language: article.language,
        imageUrl: article.imageUrl,
        location: article.location,
        isFeatured: article.isFeatured,
        views: article.views,
        createdBy: article.createdBy,
        createdAt: article.createdAt
      }))
    });
  } catch (error) {
    console.error('Fetch all user news error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});


module.exports = router;
