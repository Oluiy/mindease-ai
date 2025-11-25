const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('../utils/logger');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -refreshToken');
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token is not valid. User not found.' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account is deactivated.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token is not valid.' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token has expired.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Server error during authentication.' 
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -refreshToken');
    
    req.user = user && user.isActive ? user : null;
    next();
  } catch (error) {
    // For optional auth, we don't throw errors, just set user to null
    req.user = null;
    next();
  }
};

const requireOnboarding = (req, res, next) => {
  if (!req.user.onboardingCompleted) {
    return res.status(403).json({
      error: 'Onboarding must be completed first.',
      requiresOnboarding: true
    });
  }
  next();
};

module.exports = {
  auth,
  optionalAuth,
  requireOnboarding
};