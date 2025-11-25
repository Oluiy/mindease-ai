const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'bot'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'voice', 'image', 'resource'],
    default: 'text'
  },
  voiceData: {
    audioUrl: String,
    duration: Number,
    transcript: String,
    language: String
  },
  metadata: {
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative', 'crisis']
    },
    confidence: Number,
    keywords: [String],
    intent: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    default: 'New Conversation'
  },
  messages: [messageSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  sessionType: {
    type: String,
    enum: ['general', 'crisis', 'mood_checkin', 'resource_request'],
    default: 'general'
  },
  context: {
    userMood: String,
    topics: [String],
    crisisLevel: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    }
  },
  language: {
    type: String,
    enum: ['en', 'es', 'hi'],
    default: 'en'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
chatSessionSchema.index({ userId: 1, createdAt: -1 });
chatSessionSchema.index({ isActive: 1 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);