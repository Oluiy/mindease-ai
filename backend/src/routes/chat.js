const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const ChatSession = require('../models/ChatSession');
const CrisisAlert = require('../models/CrisisAlert');
const { auth, requireOnboarding } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const geminiService = require('../services/geminiService');
const { logger } = require('../utils/logger');

const router = express.Router();

// @route   POST /api/chat/sessions
// @desc    Create a new chat session
// @access  Private
router.post('/sessions', auth, requireOnboarding, asyncHandler(async (req, res) => {
  const sessionId = uuidv4();
  
  const chatSession = new ChatSession({
    userId: req.user._id,
    sessionId,
    language: req.user.preferredLanguage,
    title: 'New Conversation'
  });

  await chatSession.save();

  res.status(201).json({
    success: true,
    data: {
      session: chatSession
    }
  });
}));

// @route   GET /api/chat/sessions
// @desc    Get user's chat sessions
// @access  Private
router.get('/sessions', auth, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const sessions = await ChatSession.find({ 
    userId: req.user._id,
    isActive: true 
  })
    .select('-messages') // Exclude messages for list view
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await ChatSession.countDocuments({ 
    userId: req.user._id,
    isActive: true 
  });

  res.json({
    success: true,
    data: {
      sessions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalSessions: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }
  });
}));

// @route   GET /api/chat/sessions/:sessionId
// @desc    Get specific chat session with messages
// @access  Private
router.get('/sessions/:sessionId', auth, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await ChatSession.findOne({
    sessionId,
    userId: req.user._id,
    isActive: true
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Chat session not found'
    });
  }

  res.json({
    success: true,
    data: {
      session
    }
  });
}));

// @route   POST /api/chat/sessions/:sessionId/messages
// @desc    Send message in chat session
// @access  Private
router.post('/sessions/:sessionId/messages', auth, requireOnboarding, [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message content must be between 1 and 5000 characters'),
  body('messageType')
    .optional()
    .isIn(['text', 'voice'])
    .withMessage('Message type must be text or voice')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { sessionId } = req.params;
  const { content, messageType = 'text', voiceData } = req.body;

  // Find chat session
  const session = await ChatSession.findOne({
    sessionId,
    userId: req.user._id,
    isActive: true
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Chat session not found'
    });
  }

  // Add user message to session
  const userMessage = {
    sender: 'user',
    content,
    messageType,
    voiceData: messageType === 'voice' ? voiceData : undefined,
    timestamp: new Date()
  };

  session.messages.push(userMessage);

  // Prepare context for AI response
  const context = {
    language: session.language,
    userMood: req.user.moodBaseline?.overall,
    previousMessages: session.messages.slice(-10) // Last 10 messages for context
  };

  // Generate AI response
  const aiResponse = await geminiService.generateResponse(content, context);

  // Check for crisis situation
  if (aiResponse.metadata.crisisLevel >= 3) {
    await handleCrisisAlert(req.user._id, content, aiResponse.metadata);
    session.context.crisisLevel = aiResponse.metadata.crisisLevel;
    session.sessionType = 'crisis';
  }

  // Add bot message to session
  const botMessage = {
    sender: 'bot',
    content: aiResponse.response,
    messageType: 'text',
    metadata: aiResponse.metadata,
    timestamp: new Date()
  };

  session.messages.push(botMessage);

  // Update session context
  session.context = {
    ...session.context,
    userMood: aiResponse.metadata.sentiment,
    topics: [...(session.context.topics || []), ...(Array.isArray(aiResponse.metadata.keywords) ? aiResponse.metadata.keywords : [])]
  };

  // Update session title if it's the first meaningful exchange
  if (session.messages.length <= 4 && session.title === 'New Conversation') {
    session.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
  }

  await session.save();

  res.json({
    success: true,
    data: {
      userMessage,
      botMessage,
      sessionContext: session.context
    }
  });
}));

// @route   PUT /api/chat/sessions/:sessionId
// @desc    Update chat session
// @access  Private
router.put('/sessions/:sessionId', auth, [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { sessionId } = req.params;
  const { title } = req.body;

  const session = await ChatSession.findOneAndUpdate(
    { sessionId, userId: req.user._id },
    { title },
    { new: true }
  );

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Chat session not found'
    });
  }

  res.json({
    success: true,
    data: {
      session
    }
  });
}));

// @route   DELETE /api/chat/sessions/:sessionId
// @desc    Delete chat session
// @access  Private
router.delete('/sessions/:sessionId', auth, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await ChatSession.findOneAndUpdate(
    { sessionId, userId: req.user._id },
    { isActive: false },
    { new: true }
  );

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Chat session not found'
    });
  }

  res.json({
    success: true,
    message: 'Chat session deleted successfully'
  });
}));

// @route   GET /api/chat/search
// @desc    Search chat messages
// @access  Private
router.get('/search', auth, [
  query('q')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { q: searchQuery } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const sessions = await ChatSession.find({
    userId: req.user._id,
    isActive: true,
    $or: [
      { 'messages.content': { $regex: searchQuery, $options: 'i' } },
      { title: { $regex: searchQuery, $options: 'i' } }
    ]
  })
    .select('sessionId title messages.content messages.sender messages.timestamp')
    .sort({ updatedAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  res.json({
    success: true,
    data: {
      results: sessions,
      searchQuery
    }
  });
}));

// Helper function to handle crisis alerts
async function handleCrisisAlert(userId, message, metadata) {
  try {
    const crisisAlert = new CrisisAlert({
      userId,
      triggerMessage: message,
      severity: metadata.crisisLevel >= 4 ? 'critical' : 'high',
      riskLevel: metadata.crisisLevel,
      detectedKeywords: metadata.keywords,
      aiAnalysis: {
        confidence: metadata.confidence,
        sentiment: metadata.sentiment,
        riskFactors: metadata.keywords,
        recommendations: ['immediate_support', 'crisis_hotline', 'breathing_exercise']
      }
    });

    await crisisAlert.save();
    
    // In a real implementation, you would also:
    // 1. Send immediate notifications to crisis response team
    // 2. Log to monitoring systems
    // 3. Potentially contact emergency services for critical cases
    
    logger.warn(`Crisis alert created for user ${userId}: Level ${metadata.crisisLevel}`);
    
    return crisisAlert;
  } catch (error) {
    logger.error('Error creating crisis alert:', error);
  }
}

module.exports = router;