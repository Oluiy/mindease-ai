const mongoose = require('mongoose');

const moodEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  overall: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  anxiety: {
    type: Number,
    min: 1,
    max: 10
  },
  depression: {
    type: Number,
    min: 1,
    max: 10
  },
  stress: {
    type: Number,
    min: 1,
    max: 10
  },
  energy: {
    type: Number,
    min: 1,
    max: 10
  },
  sleep: {
    quality: {
      type: Number,
      min: 1,
      max: 10
    },
    hours: {
      type: Number,
      min: 0,
      max: 24
    }
  },
  activities: [{
    name: String,
    impact: {
      type: String,
      enum: ['positive', 'neutral', 'negative']
    }
  }],
  notes: String,
  triggers: [String],
  coping_strategies: [String],
  entryType: {
    type: String,
    enum: ['daily', 'weekly', 'baseline', 'crisis'],
    default: 'daily'
  },
  isPrivate: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for analytics and queries
moodEntrySchema.index({ userId: 1, date: -1 });
moodEntrySchema.index({ userId: 1, entryType: 1 });
moodEntrySchema.index({ date: 1 });

module.exports = mongoose.model('MoodEntry', moodEntrySchema);