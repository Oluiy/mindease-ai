const express = require('express');
const { body, query, validationResult } = require('express-validator');
const CrisisAlert = require('../models/CrisisAlert');
const Resource = require('../models/Resource');
const { auth, requireOnboarding } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// @route   POST /api/crisis/alert
// @desc    Create crisis alert (usually triggered automatically)
// @access  Private
router.post('/alert', auth, requireOnboarding, [
  body('triggerMessage')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Trigger message must be between 1 and 5000 characters'),
  body('severity')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Severity must be low, medium, high, or critical'),
  body('riskLevel')
    .isInt({ min: 1, max: 10 })
    .withMessage('Risk level must be between 1 and 10'),
  body('detectedKeywords')
    .optional()
    .isArray()
    .withMessage('Detected keywords must be an array')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const {
    triggerMessage,
    severity,
    riskLevel,
    detectedKeywords = [],
    aiAnalysis = {}
  } = req.body;

  const crisisAlert = new CrisisAlert({
    userId: req.user._id,
    triggerMessage,
    severity,
    riskLevel,
    detectedKeywords,
    aiAnalysis
  });

  await crisisAlert.save();

  // Get immediate crisis resources
  const crisisResources = await Resource.find({
    isActive: true,
    isCrisis: true,
    language: req.user.preferredLanguage
  })
    .sort({ priority: -1 })
    .limit(5);

  // Log for monitoring
  logger.warn(`Crisis alert created: User ${req.user._id}, Level ${riskLevel}, Severity: ${severity}`);

  res.status(201).json({
    success: true,
    message: 'Crisis alert created. Help is available.',
    data: {
      alert: crisisAlert,
      immediateResources: crisisResources,
      emergencyContacts: getEmergencyContacts(req.user.preferredLanguage)
    }
  });
}));

// @route   GET /api/crisis/alerts
// @desc    Get user's crisis alerts
// @access  Private
router.get('/alerts', auth, [
  query('status')
    .optional()
    .isIn(['active', 'acknowledged', 'resolved', 'escalated'])
    .withMessage('Status must be active, acknowledged, resolved, or escalated'),
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

  const {
    status,
    page = 1,
    limit = 10
  } = req.query;

  const query = { userId: req.user._id };
  if (status) query.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const alerts = await CrisisAlert.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await CrisisAlert.countDocuments(query);

  res.json({
    success: true,
    data: {
      alerts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalAlerts: total,
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    }
  });
}));

// @route   PUT /api/crisis/alerts/:alertId/acknowledge
// @desc    Acknowledge crisis alert
// @access  Private
router.put('/alerts/:alertId/acknowledge', auth, asyncHandler(async (req, res) => {
  const { alertId } = req.params;

  const alert = await CrisisAlert.findOneAndUpdate(
    { _id: alertId, userId: req.user._id },
    { status: 'acknowledged' },
    { new: true }
  );

  if (!alert) {
    return res.status(404).json({
      success: false,
      error: 'Crisis alert not found'
    });
  }

  res.json({
    success: true,
    message: 'Crisis alert acknowledged',
    data: {
      alert
    }
  });
}));

// @route   POST /api/crisis/alerts/:alertId/intervention
// @desc    Add intervention to crisis alert
// @access  Private
router.post('/alerts/:alertId/intervention', auth, [
  body('type')
    .isIn(['breathing_exercise', 'hotline_provided', 'resource_shared', 'escalated'])
    .withMessage('Intervention type must be breathing_exercise, hotline_provided, resource_shared, or escalated'),
  body('details')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Details must be less than 1000 characters'),
  body('wasHelpful')
    .optional()
    .isBoolean()
    .withMessage('Was helpful must be a boolean')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { alertId } = req.params;
  const { type, details, wasHelpful } = req.body;

  const alert = await CrisisAlert.findOne({
    _id: alertId,
    userId: req.user._id
  });

  if (!alert) {
    return res.status(404).json({
      success: false,
      error: 'Crisis alert not found'
    });
  }

  const intervention = {
    type,
    details,
    wasHelpful,
    timestamp: new Date()
  };

  alert.interventions.push(intervention);
  await alert.save();

  res.json({
    success: true,
    message: 'Intervention recorded',
    data: {
      intervention,
      alert
    }
  });
}));

// @route   GET /api/crisis/breathing-exercises
// @desc    Get breathing exercises for crisis situations
// @access  Private
router.get('/breathing-exercises', auth, asyncHandler(async (req, res) => {
  const exercises = getBreathingExercises(req.user.preferredLanguage);

  res.json({
    success: true,
    data: {
      exercises
    }
  });
}));

// @route   GET /api/crisis/immediate-help
// @desc    Get immediate crisis help resources
// @access  Private
router.get('/immediate-help', auth, asyncHandler(async (req, res) => {
  // Get crisis resources from database
  const resources = await Resource.find({
    isActive: true,
    isCrisis: true,
    language: req.user.preferredLanguage
  })
    .sort({ priority: -1 })
    .limit(10);

  // Get breathing exercises
  const breathingExercises = getBreathingExercises(req.user.preferredLanguage);

  // Get emergency contacts
  const emergencyContacts = getEmergencyContacts(req.user.preferredLanguage);

  // Get calming techniques
  const calmingTechniques = getCalmingTechniques(req.user.preferredLanguage);

  res.json({
    success: true,
    data: {
      resources,
      breathingExercises,
      emergencyContacts,
      calmingTechniques,
      message: getCrisisMessage(req.user.preferredLanguage)
    }
  });
}));

// @route   POST /api/crisis/safety-plan
// @desc    Create or update user's safety plan
// @access  Private
router.post('/safety-plan', auth, [
  body('warningSigns')
    .isArray({ min: 1, max: 10 })
    .withMessage('Warning signs must be an array with 1-10 items'),
  body('copingStrategies')
    .isArray({ min: 1, max: 10 })
    .withMessage('Coping strategies must be an array with 1-10 items'),
  body('supportContacts')
    .isArray({ min: 1, max: 5 })
    .withMessage('Support contacts must be an array with 1-5 items'),
  body('professionalContacts')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Professional contacts must be an array with max 5 items'),
  body('environmentSafety')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Environment safety notes must be less than 1000 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const {
    warningSigns,
    copingStrategies,
    supportContacts,
    professionalContacts = [],
    environmentSafety = ''
  } = req.body;

  // Store safety plan in user document
  const User = require('../models/User');
  
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      safetyPlan: {
        warningSigns,
        copingStrategies,
        supportContacts,
        professionalContacts,
        environmentSafety,
        lastUpdated: new Date()
      }
    },
    { new: true }
  );

  logger.info(`Safety plan updated for user: ${user.email}`);

  res.json({
    success: true,
    message: 'Safety plan saved successfully',
    data: {
      safetyPlan: user.safetyPlan
    }
  });
}));

// @route   GET /api/crisis/safety-plan
// @desc    Get user's safety plan
// @access  Private
router.get('/safety-plan', auth, asyncHandler(async (req, res) => {
  const User = require('../models/User');
  
  const user = await User.findById(req.user._id).select('safetyPlan');
  
  if (!user.safetyPlan) {
    return res.status(404).json({
      success: false,
      error: 'No safety plan found. Please create one first.'
    });
  }

  res.json({
    success: true,
    data: {
      safetyPlan: user.safetyPlan
    }
  });
}));

// Helper function to get breathing exercises
function getBreathingExercises(language = 'en') {
  const exercises = {
    en: [
      {
        name: "4-7-8 Breathing",
        description: "A simple technique to reduce anxiety and promote calm",
        instructions: [
          "Sit or lie down comfortably",
          "Exhale completely through your mouth",
          "Close your mouth, inhale through nose for 4 counts",
          "Hold your breath for 7 counts", 
          "Exhale through mouth for 8 counts",
          "Repeat 3-4 times"
        ],
        duration: "2-3 minutes"
      },
      {
        name: "Box Breathing",
        description: "Equal-count breathing to center yourself",
        instructions: [
          "Sit up straight",
          "Inhale for 4 counts",
          "Hold for 4 counts",
          "Exhale for 4 counts", 
          "Hold empty for 4 counts",
          "Repeat 5-10 times"
        ],
        duration: "3-5 minutes"
      }
    ],
    es: [
      {
        name: "Respiración 4-7-8",
        description: "Una técnica simple para reducir la ansiedad y promover la calma",
        instructions: [
          "Siéntate o acuéstate cómodamente",
          "Exhala completamente por la boca",
          "Cierra la boca, inhala por la nariz durante 4 cuentas",
          "Mantén la respiración durante 7 cuentas",
          "Exhala por la boca durante 8 cuentas",
          "Repite 3-4 veces"
        ],
        duration: "2-3 minutos"
      }
    ],
    hi: [
      {
        name: "4-7-8 श्वास तकनीक",
        description: "चिंता कम करने और शांति लाने की सरल तकनीक",
        instructions: [
          "आराम से बैठें या लेट जाएं",
          "मुंह से पूरी तरह सांस छोड़ें",
          "मुंह बंद करें, नाक से 4 गिनती तक सांस लें",
          "7 गिनती तक सांस रोकें",
          "मुंह से 8 गिनती तक सांस छोड़ें",
          "3-4 बार दोहराएं"
        ],
        duration: "2-3 मिनट"
      }
    ]
  };

  return exercises[language] || exercises.en;
}

// Helper function to get emergency contacts
function getEmergencyContacts(language = 'en') {
  const contacts = {
    en: [
      {
        name: "National Suicide Prevention Lifeline",
        number: "988",
        description: "24/7 crisis support",
        country: "US"
      },
      {
        name: "Crisis Text Line", 
        number: "Text HOME to 741741",
        description: "Text-based crisis support",
        country: "US"
      }
    ],
    es: [
      {
        name: "Línea Nacional de Prevención del Suicidio",
        number: "988 (presiona 2)",
        description: "Apoyo de crisis 24/7 en español",
        country: "US"
      }
    ],
    hi: [
      {
        name: "आसरा हेल्पलाइन",
        number: "+91 9820466726",
        description: "24/7 संकट सहायता",
        country: "India"
      }
    ]
  };

  return contacts[language] || contacts.en;
}

// Helper function to get calming techniques
function getCalmingTechniques(language = 'en') {
  const techniques = {
    en: [
      {
        name: "5-4-3-2-1 Grounding",
        description: "Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste"
      },
      {
        name: "Progressive Muscle Relaxation",
        description: "Tense and release muscle groups starting from your toes"
      },
      {
        name: "Mindful Observation",
        description: "Focus intently on one object for 2-3 minutes, noticing every detail"
      }
    ],
    es: [
      {
        name: "Técnica 5-4-3-2-1",
        description: "Nombra 5 cosas que ves, 4 que puedes tocar, 3 que escuchas, 2 que hueles, 1 que saboreas"
      },
      {
        name: "Relajación Muscular Progresiva",
        description: "Tensa y relaja grupos musculares comenzando desde los dedos de los pies"
      }
    ],
    hi: [
      {
        name: "5-4-3-2-1 ग्राउंडिंग तकनीक",
        description: "5 चीजें जो आप देखते हैं, 4 जो छू सकते हैं, 3 जो सुनते हैं, 2 जो सूंघते हैं, 1 जो चखते हैं"
      }
    ]
  };

  return techniques[language] || techniques.en;
}

// Helper function to get crisis message
function getCrisisMessage(language = 'en') {
  const messages = {
    en: "You are not alone. This feeling will pass. Help is available right now.",
    es: "No estás solo. Este sentimiento pasará. La ayuda está disponible ahora mismo.",
    hi: "आप अकेले नहीं हैं। यह भावना गुजर जाएगी। मदद अभी उपलब्ध है।"
  };

  return messages[language] || messages.en;
}

module.exports = router;