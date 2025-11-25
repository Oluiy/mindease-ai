const express = require('express');
const { body, query, validationResult } = require('express-validator');
const MoodEntry = require('../models/MoodEntry');
const User = require('../models/User');
const { auth, requireOnboarding } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// @route   POST /api/mood/baseline
// @desc    Complete onboarding mood baseline (30-second assessment)
// @access  Private
router.post('/baseline', auth, [
  body('overall')
    .isInt({ min: 1, max: 10 })
    .withMessage('Overall mood must be between 1 and 10'),
  body('anxiety')
    .isInt({ min: 1, max: 10 })
    .withMessage('Anxiety level must be between 1 and 10'),
  body('depression')
    .isInt({ min: 1, max: 10 })
    .withMessage('Depression level must be between 1 and 10'),
  body('stress')
    .isInt({ min: 1, max: 10 })
    .withMessage('Stress level must be between 1 and 10')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { overall, anxiety, depression, stress } = req.body;

  // Update user's mood baseline and mark onboarding as completed
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      moodBaseline: {
        overall,
        anxiety,
        depression,
        stress,
        completedAt: new Date()
      },
      onboardingCompleted: true
    },
    { new: true }
  );

  // Create initial mood entry
  const moodEntry = new MoodEntry({
    userId: req.user._id,
    overall,
    anxiety,
    depression,
    stress,
    entryType: 'baseline',
    notes: 'Initial baseline assessment completed during onboarding'
  });

  await moodEntry.save();

  logger.info(`User ${req.user.email} completed mood baseline`);

  res.json({
    success: true,
    message: 'Mood baseline completed successfully',
    data: {
      moodBaseline: user.moodBaseline,
      moodEntry
    }
  });
}));

// @route   POST /api/mood/entries
// @desc    Create a new mood entry
// @access  Private
router.post('/entries', auth, requireOnboarding, [
  body('overall')
    .isInt({ min: 1, max: 10 })
    .withMessage('Overall mood must be between 1 and 10'),
  body('anxiety')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Anxiety level must be between 1 and 10'),
  body('depression')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Depression level must be between 1 and 10'),
  body('stress')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Stress level must be between 1 and 10'),
  body('energy')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Energy level must be between 1 and 10'),
  body('sleep.quality')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Sleep quality must be between 1 and 10'),
  body('sleep.hours')
    .optional()
    .isFloat({ min: 0, max: 24 })
    .withMessage('Sleep hours must be between 0 and 24'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),
  body('activities')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Activities must be an array with maximum 10 items'),
  body('triggers')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Triggers must be an array with maximum 10 items'),
  body('coping_strategies')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Coping strategies must be an array with maximum 10 items')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const {
    overall,
    anxiety,
    depression,
    stress,
    energy,
    sleep,
    notes,
    activities,
    triggers,
    coping_strategies,
    entryType = 'daily'
  } = req.body;

  // Check if user already has an entry for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingEntry = await MoodEntry.findOne({
    userId: req.user._id,
    date: { $gte: today, $lt: tomorrow },
    entryType: 'daily'
  });

  if (existingEntry && entryType === 'daily') {
    return res.status(400).json({
      success: false,
      error: 'You have already recorded your mood for today. You can update it instead.'
    });
  }

  const moodEntry = new MoodEntry({
    userId: req.user._id,
    overall,
    anxiety,
    depression,
    stress,
    energy,
    sleep,
    notes,
    activities,
    triggers,
    coping_strategies,
    entryType
  });

  await moodEntry.save();

  res.status(201).json({
    success: true,
    message: 'Mood entry created successfully',
    data: {
      moodEntry
    }
  });
}));

// @route   GET /api/mood/entries
// @desc    Get user's mood entries
// @access  Private
router.get('/entries', auth, requireOnboarding, [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date'),
  query('type')
    .optional()
    .isIn(['daily', 'weekly', 'baseline', 'crisis'])
    .withMessage('Type must be daily, weekly, baseline, or crisis'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const {
    startDate,
    endDate,
    type,
    page = 1,
    limit = 30
  } = req.query;

  // Build query
  const query = { userId: req.user._id };
  
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }
  
  if (type) {
    query.entryType = type;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const entries = await MoodEntry.find(query)
    .sort({ date: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await MoodEntry.countDocuments(query);

  res.json({
    success: true,
    data: {
      entries,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalEntries: total,
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    }
  });
}));

// @route   GET /api/mood/entries/:entryId
// @desc    Get specific mood entry
// @access  Private
router.get('/entries/:entryId', auth, requireOnboarding, asyncHandler(async (req, res) => {
  const { entryId } = req.params;

  const entry = await MoodEntry.findOne({
    _id: entryId,
    userId: req.user._id
  });

  if (!entry) {
    return res.status(404).json({
      success: false,
      error: 'Mood entry not found'
    });
  }

  res.json({
    success: true,
    data: {
      entry
    }
  });
}));

// @route   PUT /api/mood/entries/:entryId
// @desc    Update mood entry
// @access  Private
router.put('/entries/:entryId', auth, requireOnboarding, [
  body('overall')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Overall mood must be between 1 and 10'),
  body('anxiety')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Anxiety level must be between 1 and 10'),
  body('depression')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Depression level must be between 1 and 10'),
  body('stress')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Stress level must be between 1 and 10'),
  body('energy')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Energy level must be between 1 and 10'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { entryId } = req.params;
  const updateData = req.body;

  const entry = await MoodEntry.findOneAndUpdate(
    { _id: entryId, userId: req.user._id },
    updateData,
    { new: true, runValidators: true }
  );

  if (!entry) {
    return res.status(404).json({
      success: false,
      error: 'Mood entry not found'
    });
  }

  res.json({
    success: true,
    message: 'Mood entry updated successfully',
    data: {
      entry
    }
  });
}));

// @route   DELETE /api/mood/entries/:entryId
// @desc    Delete mood entry
// @access  Private
router.delete('/entries/:entryId', auth, requireOnboarding, asyncHandler(async (req, res) => {
  const { entryId } = req.params;

  const entry = await MoodEntry.findOneAndDelete({
    _id: entryId,
    userId: req.user._id
  });

  if (!entry) {
    return res.status(404).json({
      success: false,
      error: 'Mood entry not found'
    });
  }

  res.json({
    success: true,
    message: 'Mood entry deleted successfully'
  });
}));

// @route   GET /api/mood/analytics
// @desc    Get mood analytics and insights
// @access  Private
router.get('/analytics', auth, requireOnboarding, [
  query('days')
    .optional()
    .isInt({ min: 7, max: 365 })
    .withMessage('Days must be between 7 and 365')
], asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get entries for the specified period
  const entries = await MoodEntry.find({
    userId: req.user._id,
    date: { $gte: startDate },
    entryType: { $ne: 'baseline' }
  }).sort({ date: 1 });

  if (entries.length === 0) {
    return res.json({
      success: true,
      data: {
        message: 'No mood entries found for the specified period',
        analytics: null
      }
    });
  }

  // Calculate analytics
  const analytics = calculateMoodAnalytics(entries, req.user.moodBaseline);

  res.json({
    success: true,
    data: {
      analytics,
      period: {
        startDate,
        endDate: new Date(),
        days,
        entriesCount: entries.length
      }
    }
  });
}));

// @route   GET /api/mood/insights
// @desc    Get AI-powered mood insights
// @access  Private
router.get('/insights', auth, requireOnboarding, asyncHandler(async (req, res) => {
  const days = 14; // Last 2 weeks
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const entries = await MoodEntry.find({
    userId: req.user._id,
    date: { $gte: startDate }
  }).sort({ date: 1 });

  const insights = generateMoodInsights(entries, req.user.moodBaseline);

  res.json({
    success: true,
    data: {
      insights
    }
  });
}));

// Helper function to calculate mood analytics
function calculateMoodAnalytics(entries, baseline) {
  const totals = entries.reduce((acc, entry) => {
    acc.overall += entry.overall;
    acc.anxiety += entry.anxiety || 0;
    acc.depression += entry.depression || 0;
    acc.stress += entry.stress || 0;
    acc.energy += entry.energy || 0;
    acc.count++;
    return acc;
  }, { overall: 0, anxiety: 0, depression: 0, stress: 0, energy: 0, count: 0 });

  const averages = {
    overall: totals.overall / totals.count,
    anxiety: totals.anxiety / totals.count,
    depression: totals.depression / totals.count,
    stress: totals.stress / totals.count,
    energy: totals.energy / totals.count
  };

  // Calculate trends compared to baseline
  const trends = {
    overall: baseline ? averages.overall - baseline.overall : 0,
    anxiety: baseline ? averages.anxiety - baseline.anxiety : 0,
    depression: baseline ? averages.depression - baseline.depression : 0,
    stress: baseline ? averages.stress - baseline.stress : 0
  };

  // Find patterns
  const patterns = {
    bestDays: entries
      .filter(e => e.overall >= 8)
      .map(e => ({ date: e.date, mood: e.overall })),
    strugglingDays: entries
      .filter(e => e.overall <= 3)
      .map(e => ({ date: e.date, mood: e.overall })),
    commonTriggers: getCommonItems(entries.flatMap(e => e.triggers || [])),
    effectiveStrategies: getCommonItems(entries.flatMap(e => e.coping_strategies || []))
  };

  return {
    averages,
    trends,
    patterns,
    totalEntries: entries.length
  };
}

// Helper function to generate mood insights
function generateMoodInsights(entries, baseline) {
  if (entries.length < 3) {
    return {
      message: 'Keep tracking your mood for a few more days to get personalized insights!'
    };
  }

  const recentEntries = entries.slice(-7); // Last 7 days
  const recentAverage = recentEntries.reduce((sum, e) => sum + e.overall, 0) / recentEntries.length;
  
  const insights = [];

  // Trend insight
  if (baseline && recentAverage > baseline.overall + 1) {
    insights.push({
      type: 'positive_trend',
      message: 'Your mood has been trending upward compared to your baseline! Keep up the great work.',
      confidence: 0.8
    });
  } else if (baseline && recentAverage < baseline.overall - 1) {
    insights.push({
      type: 'concerning_trend',
      message: 'Your mood has been lower than usual. Consider reaching out for support or trying some coping strategies.',
      confidence: 0.7
    });
  }

  // Pattern insights
  const allTriggers = entries.flatMap(e => e.triggers || []);
  const commonTriggers = getCommonItems(allTriggers);
  
  if (commonTriggers.length > 0) {
    insights.push({
      type: 'trigger_pattern',
      message: `You've frequently mentioned "${commonTriggers[0].item}" as a trigger. Consider developing specific strategies for managing this.`,
      confidence: 0.6
    });
  }

  // Sleep insight
  const sleepEntries = entries.filter(e => e.sleep?.hours);
  if (sleepEntries.length >= 3) {
    const avgSleep = sleepEntries.reduce((sum, e) => sum + e.sleep.hours, 0) / sleepEntries.length;
    if (avgSleep < 6) {
      insights.push({
        type: 'sleep_concern',
        message: 'Your sleep patterns show you\'re getting less than 6 hours on average. Better sleep could improve your mood.',
        confidence: 0.7
      });
    }
  }

  return insights;
}

// Helper function to get common items from an array
function getCommonItems(items) {
  const counts = items.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([item, count]) => ({ item, count }));
}

module.exports = router;