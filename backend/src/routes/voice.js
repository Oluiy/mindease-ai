const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { body, validationResult } = require('express-validator');
const { auth, requireOnboarding } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/voice');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `voice-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    const allowedMimes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/m4a',
      'audio/aac',
      'audio/ogg',
      'audio/webm'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'), false);
    }
  }
});

// @route   POST /api/voice/upload
// @desc    Upload voice message
// @access  Private
router.post('/upload', auth, requireOnboarding, upload.single('audio'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No audio file provided'
    });
  }

  const { originalname, filename, size, mimetype, path: filePath } = req.file;
  const { language = req.user.preferredLanguage } = req.body;

  try {
    // Get audio duration (this would need a proper audio processing library like ffprobe)
    const duration = await getAudioDuration(filePath);

    // In a real implementation, you would use a speech-to-text service here
    // For now, we'll simulate transcription
    const transcript = await transcribeAudio(filePath, language);

    const voiceData = {
      audioUrl: `/uploads/voice/${filename}`,
      filename,
      originalname,
      size,
      mimetype,
      duration,
      transcript,
      language,
      uploadedAt: new Date()
    };

    res.json({
      success: true,
      message: 'Voice message uploaded successfully',
      data: {
        voiceData
      }
    });

  } catch (error) {
    // Clean up uploaded file on error
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      logger.error('Error deleting uploaded file:', unlinkError);
    }
    
    throw error;
  }
}));

// @route   GET /api/voice/:filename
// @desc    Stream voice message
// @access  Private
router.get('/:filename', auth, asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../../uploads/voice', filename);

  try {
    // Check if file exists
    await fs.access(filePath);
    
    // Security check - ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename'
      });
    }

    // Get file stats
    const stats = await fs.stat(filePath);
    const range = req.headers.range;

    if (range) {
      // Support range requests for audio streaming
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunkSize = (end - start) + 1;

      res.status(206);
      res.set({
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'audio/mpeg'
      });

      const stream = require('fs').createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else {
      // Send entire file
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': stats.size
      });

      const stream = require('fs').createReadStream(filePath);
      stream.pipe(res);
    }

  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        error: 'Voice message not found'
      });
    }
    throw error;
  }
}));

// @route   DELETE /api/voice/:filename
// @desc    Delete voice message
// @access  Private
router.delete('/:filename', auth, asyncHandler(async (req, res) => {
  const { filename } = req.params;
  
  // Security check
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid filename'
    });
  }

  const filePath = path.join(__dirname, '../../uploads/voice', filename);

  try {
    await fs.unlink(filePath);
    
    res.json({
      success: true,
      message: 'Voice message deleted successfully'
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        error: 'Voice message not found'
      });
    }
    throw error;
  }
}));

// @route   POST /api/voice/transcribe
// @desc    Transcribe audio file
// @access  Private
router.post('/transcribe', auth, requireOnboarding, upload.single('audio'), [
  body('language')
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

  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No audio file provided'
    });
  }

  const { language = req.user.preferredLanguage } = req.body;
  
  try {
    const transcript = await transcribeAudio(req.file.path, language);
    
    // Clean up uploaded file
    await fs.unlink(req.file.path);

    res.json({
      success: true,
      data: {
        transcript,
        language,
        confidence: 0.85 // Simulated confidence score
      }
    });

  } catch (error) {
    // Clean up uploaded file on error
    try {
      await fs.unlink(req.file.path);
    } catch (unlinkError) {
      logger.error('Error deleting uploaded file:', unlinkError);
    }
    
    throw error;
  }
}));

// @route   POST /api/voice/synthesize
// @desc    Convert text to speech
// @access  Private
router.post('/synthesize', auth, requireOnboarding, [
  body('text')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Text must be between 1 and 5000 characters'),
  body('language')
    .optional()
    .isIn(['en', 'es', 'hi'])
    .withMessage('Language must be en, es, or hi'),
  body('voice')
    .optional()
    .isIn(['male', 'female'])
    .withMessage('Voice must be male or female')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { text, language = req.user.preferredLanguage, voice = 'female' } = req.body;

  try {
    // In a real implementation, you would use a text-to-speech service here
    const audioData = await synthesizeSpeech(text, language, voice);

    res.json({
      success: true,
      message: 'Speech synthesized successfully',
      data: {
        audioUrl: audioData.audioUrl,
        duration: audioData.duration,
        language,
        voice
      }
    });

  } catch (error) {
    logger.error('Speech synthesis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to synthesize speech'
    });
  }
}));

// Helper function to get audio duration
async function getAudioDuration(filePath) {
  // This is a placeholder. In a real implementation, you would use
  // a library like node-ffprobe or get-audio-duration
  try {
    // Simulate duration calculation
    const stats = await fs.stat(filePath);
    // Rough estimate: audio files are typically 1MB per minute at decent quality
    const estimatedDuration = Math.round(stats.size / (1024 * 1024) * 60);
    return Math.max(estimatedDuration, 1); // At least 1 second
  } catch (error) {
    logger.error('Error calculating audio duration:', error);
    return 30; // Default to 30 seconds
  }
}

// Helper function to transcribe audio
async function transcribeAudio(filePath, language = 'en') {
  // This is a placeholder for actual speech-to-text integration
  // In production, you would integrate with services like:
  // - Google Cloud Speech-to-Text
  // - Azure Speech Services
  // - AWS Transcribe
  // - OpenAI Whisper
  
  logger.info(`Transcribing audio file: ${filePath} in language: ${language}`);
  
  // Simulate transcription delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Return placeholder transcript based on language
  const placeholderTranscripts = {
    en: "I'm feeling a bit anxious today and would like to talk about it.",
    es: "Me siento un poco ansioso hoy y me gustaría hablar de ello.",
    hi: "आज मैं थोड़ा चिंतित महसूस कर रहा हूं और इसके बारे में बात करना चाहूंगा।"
  };
  
  return placeholderTranscripts[language] || placeholderTranscripts.en;
}

// Helper function to synthesize speech
async function synthesizeSpeech(text, language = 'en', voice = 'female') {
  // This is a placeholder for actual text-to-speech integration
  // In production, you would integrate with services like:
  // - Google Cloud Text-to-Speech
  // - Azure Speech Services
  // - AWS Polly
  // - ElevenLabs
  
  logger.info(`Synthesizing speech: "${text.substring(0, 50)}..." in ${language} with ${voice} voice`);
  
  // Simulate speech synthesis
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const filename = `tts-${Date.now()}-${Math.round(Math.random() * 1E9)}.mp3`;
  const audioUrl = `/api/voice/${filename}`;
  
  // Estimate duration based on text length (roughly 150 words per minute)
  const wordCount = text.split(' ').length;
  const duration = Math.max(Math.round((wordCount / 150) * 60), 1);
  
  return {
    audioUrl,
    filename,
    duration,
    language,
    voice
  };
}

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Only one file allowed.'
      });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  
  next(error);
});

module.exports = router;