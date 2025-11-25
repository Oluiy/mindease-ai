const express = require('express');
const { query, validationResult } = require('express-validator');
const Resource = require('../models/Resource');
const { auth, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// @route   GET /api/resources
// @desc    Get resources with filtering and search
// @access  Public (but enhanced with auth)
router.get('/', optionalAuth, [
  query('category')
    .optional()
    .isIn([
      'anxiety', 'depression', 'stress', 'sleep', 'mindfulness', 
      'breathing', 'crisis', 'self_care', 'relationships', 
      'work_life_balance', 'addiction', 'grief', 'trauma'
    ])
    .withMessage('Invalid category'),
  query('type')
    .optional()
    .isIn(['article', 'video', 'audio', 'exercise', 'technique', 'hotline', 'app'])
    .withMessage('Invalid resource type'),
  query('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Invalid difficulty level'),
  query('language')
    .optional()
    .isIn(['en', 'es', 'hi'])
    .withMessage('Invalid language'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('crisis')
    .optional()
    .isBoolean()
    .withMessage('Crisis filter must be a boolean')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const {
    category,
    type,
    difficulty,
    language,
    search,
    page = 1,
    limit = 20,
    crisis
  } = req.query;

  // Build query
  const query = { isActive: true };
  
  if (category) query.category = category;
  if (type) query.type = type;
  if (difficulty) query.difficulty = difficulty;
  if (crisis !== undefined) query.isCrisis = crisis === 'true';
  
  // Language preference
  const preferredLanguage = req.user?.preferredLanguage || language || 'en';
  query.language = preferredLanguage;

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build aggregation pipeline
  const pipeline = [
    { $match: query },
    {
      $addFields: {
        score: search ? { $meta: 'textScore' } : '$priority'
      }
    },
    { $sort: search ? { score: { $meta: 'textScore' } } : { priority: -1, createdAt: -1 } },
    { $skip: skip },
    { $limit: parseInt(limit) }
  ];

  const resources = await Resource.aggregate(pipeline);
  const total = await Resource.countDocuments(query);

  // Update view count for viewed resources
  if (resources.length > 0) {
    const resourceIds = resources.map(r => r._id);
    await Resource.updateMany(
      { _id: { $in: resourceIds } },
      { $inc: { 'engagement.views': 1 } }
    );
  }

  res.json({
    success: true,
    data: {
      resources,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalResources: total,
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      },
      filters: {
        category,
        type,
        difficulty,
        language: preferredLanguage,
        search,
        crisis
      }
    }
  });
}));

// @route   GET /api/resources/categories
// @desc    Get all resource categories with counts
// @access  Public
router.get('/categories', optionalAuth, asyncHandler(async (req, res) => {
  const language = req.user?.preferredLanguage || req.query.language || 'en';

  const categories = await Resource.aggregate([
    { $match: { isActive: true, language } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const types = await Resource.aggregate([
    { $match: { isActive: true, language } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  res.json({
    success: true,
    data: {
      categories: categories.map(c => ({ name: c._id, count: c.count })),
      types: types.map(t => ({ name: t._id, count: t.count })),
      language
    }
  });
}));

// @route   GET /api/resources/:id
// @desc    Get single resource
// @access  Public (but enhanced with auth)
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const resource = await Resource.findOne({ _id: id, isActive: true });

  if (!resource) {
    return res.status(404).json({
      success: false,
      error: 'Resource not found'
    });
  }

  // Update view count
  await Resource.findByIdAndUpdate(id, { $inc: { 'engagement.views': 1 } });

  res.json({
    success: true,
    data: {
      resource
    }
  });
}));

// @route   GET /api/resources/recommended/for-user
// @desc    Get personalized resource recommendations
// @access  Private
router.get('/recommended/for-user', auth, asyncHandler(async (req, res) => {
  const MoodEntry = require('../models/MoodEntry');
  const ChatSession = require('../models/ChatSession');

  // Get user's recent mood patterns
  const recentMoods = await MoodEntry.find({ userId: req.user._id })
    .sort({ date: -1 })
    .limit(7);

  // Get user's chat topics
  const recentChats = await ChatSession.find({ userId: req.user._id })
    .select('context.topics')
    .sort({ updatedAt: -1 })
    .limit(5);

  // Determine user's needs based on mood and chat data
  const categories = determineRecommendedCategories(recentMoods, recentChats);
  
  // Get recommended resources
  const recommendations = await Resource.find({
    isActive: true,
    language: req.user.preferredLanguage,
    category: { $in: categories },
    difficulty: 'beginner' // Start with beginner-friendly resources
  })
    .sort({ priority: -1, 'engagement.completions': -1 })
    .limit(10);

  // Get crisis resources if needed
  let crisisResources = [];
  const hasRecentHighStress = recentMoods.some(m => 
    (m.stress && m.stress >= 8) || (m.anxiety && m.anxiety >= 8) || m.overall <= 3
  );

  if (hasRecentHighStress) {
    crisisResources = await Resource.find({
      isActive: true,
      language: req.user.preferredLanguage,
      isCrisis: true
    })
      .sort({ priority: -1 })
      .limit(5);
  }

  res.json({
    success: true,
    data: {
      recommendations,
      crisisResources,
      basedOn: {
        moodPatterns: categories,
        hasHighStress: hasRecentHighStress
      }
    }
  });
}));

// @route   POST /api/resources/:id/engage
// @desc    Track user engagement with resource
// @access  Private
router.post('/:id/engage', auth, [
  query('action')
    .isIn(['like', 'share', 'complete'])
    .withMessage('Action must be like, share, or complete')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { id } = req.params;
  const { action } = req.query;

  const resource = await Resource.findOne({ _id: id, isActive: true });

  if (!resource) {
    return res.status(404).json({
      success: false,
      error: 'Resource not found'
    });
  }

  // Update engagement metrics
  const updateField = `engagement.${action}s`;
  await Resource.findByIdAndUpdate(id, { $inc: { [updateField]: 1 } });

  res.json({
    success: true,
    message: `Resource ${action} recorded successfully`
  });
}));

// @route   GET /api/resources/crisis/hotlines
// @desc    Get crisis hotlines by location/language
// @access  Public
router.get('/crisis/hotlines', optionalAuth, [
  query('country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('Country code must be 2 characters'),
  query('language')
    .optional()
    .isIn(['en', 'es', 'hi'])
    .withMessage('Language must be en, es, or hi')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const {
    country = 'US',
    language
  } = req.query;

  const preferredLanguage = req.user?.preferredLanguage || language || 'en';

  // Get crisis hotlines
  const hotlines = await Resource.find({
    isActive: true,
    type: 'hotline',
    isCrisis: true,
    language: preferredLanguage
  })
    .sort({ priority: -1 })
    .limit(10);

  // Default hotlines by country and language
  const defaultHotlines = getDefaultHotlines(country, preferredLanguage);

  const allHotlines = [...hotlines, ...defaultHotlines]
    .filter((hotline, index, self) => 
      index === self.findIndex(h => h.title === hotline.title)
    ); // Remove duplicates

  res.json({
    success: true,
    data: {
      hotlines: allHotlines,
      country,
      language: preferredLanguage
    }
  });
}));

// Helper function to determine recommended categories based on user data
function determineRecommendedCategories(moodEntries, chatSessions) {
  const categories = new Set(['mindfulness', 'self_care']); // Always include these

  // Analyze mood patterns
  if (moodEntries.length > 0) {
    const avgAnxiety = moodEntries.reduce((sum, m) => sum + (m.anxiety || 0), 0) / moodEntries.length;
    const avgDepression = moodEntries.reduce((sum, m) => sum + (m.depression || 0), 0) / moodEntries.length;
    const avgStress = moodEntries.reduce((sum, m) => sum + (m.stress || 0), 0) / moodEntries.length;

    if (avgAnxiety >= 6) categories.add('anxiety');
    if (avgDepression >= 6) categories.add('depression');
    if (avgStress >= 6) categories.add('stress');

    // Check sleep patterns
    const sleepIssues = moodEntries.some(m => m.sleep && m.sleep.quality <= 4);
    if (sleepIssues) categories.add('sleep');
  }

  // Analyze chat topics
  const allTopics = chatSessions.flatMap(session => session.context?.topics || []);
  const topicCounts = allTopics.reduce((acc, topic) => {
    acc[topic] = (acc[topic] || 0) + 1;
    return acc;
  }, {});

  // Map topics to categories
  const topicMapping = {
    'anxiety': 'anxiety',
    'stress': 'stress',
    'depression': 'depression',
    'sleep': 'sleep',
    'work': 'work_life_balance',
    'relationship': 'relationships'
  };

  Object.entries(topicCounts).forEach(([topic, count]) => {
    if (count >= 2 && topicMapping[topic]) {
      categories.add(topicMapping[topic]);
    }
  });

  return Array.from(categories);
}

// Helper function to get default crisis hotlines
function getDefaultHotlines(country, language) {
  const hotlines = {
    US: {
      en: [
        {
          title: 'National Suicide Prevention Lifeline',
          description: '24/7 crisis support',
          content: 'Call 988 for immediate help',
          type: 'hotline',
          category: 'crisis',
          isCrisis: true,
          priority: 10,
          language: 'en'
        },
        {
          title: 'Crisis Text Line',
          description: 'Text-based crisis support',
          content: 'Text HOME to 741741',
          type: 'hotline',
          category: 'crisis',
          isCrisis: true,
          priority: 9,
          language: 'en'
        }
      ],
      es: [
        {
          title: 'Línea Nacional de Prevención del Suicidio',
          description: 'Apoyo de crisis 24/7 en español',
          content: 'Llama al 988 (presiona 2 para español)',
          type: 'hotline',
          category: 'crisis',
          isCrisis: true,
          priority: 10,
          language: 'es'
        }
      ]
    },
    IN: {
      hi: [
        {
          title: 'आसरा हेल्पलाइन',
          description: '24/7 संकट सहायता',
          content: '+91 9820466726 पर कॉल करें',
          type: 'hotline',
          category: 'crisis',
          isCrisis: true,
          priority: 10,
          language: 'hi'
        }
      ],
      en: [
        {
          title: 'AASRA Helpline',
          description: '24/7 crisis support in India',
          content: 'Call +91 9820466726',
          type: 'hotline',
          category: 'crisis',
          isCrisis: true,
          priority: 10,
          language: 'en'
        }
      ]
    }
  };

  return hotlines[country]?.[language] || hotlines.US?.en || [];
}

module.exports = router;