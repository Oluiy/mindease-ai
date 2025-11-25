const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('age')
    .optional()
    .isInt({ min: 13, max: 120 })
    .withMessage('Age must be between 13 and 120'),
  body('preferredLanguage')
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

  const { email, password, name, age, gender, preferredLanguage, timezone } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: 'User with this email already exists'
    });
  }

  // Create new user
  const user = new User({
    email,
    password,
    name,
    age,
    gender,
    preferredLanguage: preferredLanguage || 'en',
    timezone: timezone || 'UTC'
  });

  await user.save();

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id);
  
  // Save refresh token to user
  user.refreshToken = refreshToken;
  await user.save();

  logger.info(`New user registered: ${email}`);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: user.toJSON(),
      accessToken,
      refreshToken
    }
  });
}));

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
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

  // Find user and include password for comparison
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  // Check if account is active
  if (!user.isActive) {
    return res.status(401).json({
      success: false,
      error: 'Account is deactivated'
    });
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id);
  
  // Update refresh token and last login
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save();

  logger.info(`User logged in: ${email}`);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.toJSON(),
      accessToken,
      refreshToken
    }
  });
}));

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { refreshToken } = req.body;

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Find user with this refresh token
    const user = await User.findOne({ 
      _id: decoded.id, 
      refreshToken,
      isActive: true 
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);
    
    // Update refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }
}));

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', auth, asyncHandler(async (req, res) => {
  // Clear refresh token
  req.user.refreshToken = undefined;
  await req.user.save();

  logger.info(`User logged out: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Logout successful'
  });
}));

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { email } = req.body;

  const user = await User.findOne({ email, isActive: true });
  
  // Always return success to prevent email enumeration
  res.json({
    success: true,
    message: 'If an account with that email exists, we have sent a password reset link'
  });

  if (user) {
    // In a real implementation, you would:
    // 1. Generate a secure reset token
    // 2. Save it to the database with expiration
    // 3. Send email with reset link
    logger.info(`Password reset requested for: ${email}`);
  }
}));

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
}));

module.exports = router;