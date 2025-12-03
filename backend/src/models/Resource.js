const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['article', 'video', 'audio', 'exercise', 'technique', 'hotline', 'app'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'anxiety',
      'depression', 
      'stress',
      'sleep',
      'mindfulness',
      'breathing',
      'crisis',
      'self_care',
      'relationships',
      'work_life_balance',
      'addiction',
      'grief',
      'trauma'
    ],
    required: true
  },
  tags: [String],
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  duration: {
    type: Number, // in minutes
    min: 1
  },
  url: String,
  mediaUrl: String,
  thumbnail: String,
  author: {
    name: String,
    credentials: String,
    organization: String
  },
  language: {
    type: String,
    enum: ['en', 'es', 'hi'],
    default: 'en'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isCrisis: {
    type: Boolean,
    default: false
  },
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  accessibility: {
    hasAudio: {
      type: Boolean,
      default: false
    },
    hasTranscript: {
      type: Boolean,
      default: false
    },
    isHighContrast: {
      type: Boolean,
      default: false
    }
  },
  engagement: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    completions: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes for search and filtering
resourceSchema.index({ category: 1, isActive: 1 });
resourceSchema.index({ type: 1, isActive: 1 });
resourceSchema.index({ isCrisis: 1 });
resourceSchema.index({ language: 1 });
resourceSchema.index({ tags: 1 });
resourceSchema.index({ priority: -1 });

// Text search index (with language support)
resourceSchema.index({
  title: 'text',
  description: 'text',
  content: 'text',
  tags: 'text'
}, {
  default_language: 'english',
  language_override: 'language'
});

module.exports = mongoose.model('Resource', resourceSchema);