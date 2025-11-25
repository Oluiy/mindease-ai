const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
}));

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('age')
    .optional()
    .isInt({ min: 13, max: 120 })
    .withMessage('Age must be between 13 and 120'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Invalid gender option'),
  body('preferredLanguage')
    .optional()
    .isIn(['en', 'es', 'hi'])
    .withMessage('Language must be en, es, or hi'),
  body('timezone')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Timezone must be specified')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const allowedUpdates = ['name', 'age', 'gender', 'preferredLanguage', 'timezone'];
  const updateData = {};
  
  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updateData[key] = req.body[key];
    }
  });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updateData,
    { new: true, runValidators: true }
  );

  logger.info(`User profile updated: ${user.email}`);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user
    }
  });
}));

// @route   PUT /api/users/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences', auth, [
  body('notificationsEnabled')
    .optional()
    .isBoolean()
    .withMessage('Notifications enabled must be a boolean'),
  body('dailyCheckIns')
    .optional()
    .isBoolean()
    .withMessage('Daily check-ins must be a boolean'),
  body('crisisAlerts')
    .optional()
    .isBoolean()
    .withMessage('Crisis alerts must be a boolean'),
  body('voiceMessages')
    .optional()
    .isBoolean()
    .withMessage('Voice messages must be a boolean')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { notificationsEnabled, dailyCheckIns, crisisAlerts, voiceMessages } = req.body;
  
  const updateData = {};
  if (notificationsEnabled !== undefined) updateData['preferences.notificationsEnabled'] = notificationsEnabled;
  if (dailyCheckIns !== undefined) updateData['preferences.dailyCheckIns'] = dailyCheckIns;
  if (crisisAlerts !== undefined) updateData['preferences.crisisAlerts'] = crisisAlerts;
  if (voiceMessages !== undefined) updateData['preferences.voiceMessages'] = voiceMessages;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updateData,
    { new: true }
  );

  res.json({
    success: true,
    message: 'Preferences updated successfully',
    data: {
      preferences: user.preferences
    }
  });
}));

// @route   PUT /api/users/accessibility
// @desc    Update accessibility settings
// @access  Private
router.put('/accessibility', auth, [
  body('highContrast')
    .optional()
    .isBoolean()
    .withMessage('High contrast must be a boolean'),
  body('voiceInput')
    .optional()
    .isBoolean()
    .withMessage('Voice input must be a boolean'),
  body('voiceOutput')
    .optional()
    .isBoolean()
    .withMessage('Voice output must be a boolean'),
  body('fontSize')
    .optional()
    .isIn(['small', 'medium', 'large'])
    .withMessage('Font size must be small, medium, or large')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { highContrast, voiceInput, voiceOutput, fontSize } = req.body;
  
  const updateData = {};
  if (highContrast !== undefined) updateData['accessibilitySettings.highContrast'] = highContrast;
  if (voiceInput !== undefined) updateData['accessibilitySettings.voiceInput'] = voiceInput;
  if (voiceOutput !== undefined) updateData['accessibilitySettings.voiceOutput'] = voiceOutput;
  if (fontSize !== undefined) updateData['accessibilitySettings.fontSize'] = fontSize;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updateData,
    { new: true }
  );

  res.json({
    success: true,
    message: 'Accessibility settings updated successfully',
    data: {
      accessibilitySettings: user.accessibilitySettings
    }
  });
}));

// @route   PUT /api/users/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', auth, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');
  
  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      success: false,
      error: 'Current password is incorrect'
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  logger.info(`Password changed for user: ${user.email}`);

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// @route   DELETE /api/users/account
// @desc    Deactivate user account
// @access  Private
router.delete('/account', auth, [
  body('password')
    .notEmpty()
    .withMessage('Password is required to deactivate account'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must be less than 500 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { password, reason } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');
  
  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(400).json({
      success: false,
      error: 'Password is incorrect'
    });
  }

  // Deactivate account instead of deleting
  user.isActive = false;
  user.refreshToken = undefined; // Clear refresh token
  await user.save();

  logger.info(`Account deactivated for user: ${user.email}. Reason: ${reason || 'Not provided'}`);

  res.json({
    success: true,
    message: 'Account deactivated successfully'
  });
}));

// @route   PUT /api/users/reactivate
// @desc    Reactivate user account
// @access  Public
router.put('/reactivate', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { email, password } = req.body;

  // Find deactivated user
  const user = await User.findOne({ email, isActive: false }).select('+password');
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'No deactivated account found with this email'
    });
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(400).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  // Reactivate account
  user.isActive = true;
  user.lastLogin = new Date();
  await user.save();

  logger.info(`Account reactivated for user: ${user.email}`);

  res.json({
    success: true,
    message: 'Account reactivated successfully',
    data: {
      user: user.toJSON()
    }
  });
}));

// @route   GET /api/users/dashboard
// @desc    Get user dashboard data
// @access  Private
router.get('/dashboard', auth, asyncHandler(async (req, res) => {
  const MoodEntry = require('../models/MoodEntry');
  const ChatSession = require('../models/ChatSession');
  
  // Get recent mood entries
  const recentMoodEntries = await MoodEntry.find({ userId: req.user._id })
    .sort({ date: -1 })
    .limit(7);

  // Get recent chat sessions
  const recentChatSessions = await ChatSession.find({ 
    userId: req.user._id,
    isActive: true 
  })
    .select('sessionId title updatedAt')
    .sort({ updatedAt: -1 })
    .limit(5);

  // Calculate streak
  const moodStreak = calculateMoodStreak(recentMoodEntries);

  // Get mood trends for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const moodTrend = await MoodEntry.find({
    userId: req.user._id,
    date: { $gte: thirtyDaysAgo }
  }).select('date overall').sort({ date: 1 });

  const dashboardData = {
    user: req.user,
    moodStreak,
    recentMoodEntries: recentMoodEntries.slice(0, 5),
    recentChatSessions,
    moodTrend,
    stats: {
      totalMoodEntries: await MoodEntry.countDocuments({ userId: req.user._id }),
      totalChatSessions: await ChatSession.countDocuments({ userId: req.user._id })
    }
  };

  res.json({
    success: true,
    data: dashboardData
  });
}));

// Helper function to calculate mood tracking streak
function calculateMoodStreak(entries) {
  if (entries.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < entries.length; i++) {
    const entryDate = new Date(entries[i].date);
    entryDate.setHours(0, 0, 0, 0);
    
    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() - i);
    
    if (entryDate.getTime() === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

module.exports = router;