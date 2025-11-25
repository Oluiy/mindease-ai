const mongoose = require('mongoose');

const crisisAlertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  triggerMessage: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  riskLevel: {
    type: Number,
    min: 1,
    max: 10,
    required: true
  },
  detectedKeywords: [String],
  aiAnalysis: {
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    sentiment: String,
    riskFactors: [String],
    recommendations: [String]
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved', 'escalated'],
    default: 'active'
  },
  interventions: [{
    type: {
      type: String,
      enum: ['breathing_exercise', 'hotline_provided', 'resource_shared', 'escalated']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: String,
    wasHelpful: Boolean
  }],
  hotlinesProvided: [{
    name: String,
    phone: String,
    country: String,
    language: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  followUpScheduled: {
    type: Date
  },
  resolvedAt: Date,
  escalatedTo: {
    type: String,
    enum: ['emergency_services', 'crisis_counselor', 'mental_health_professional']
  }
}, {
  timestamps: true
});

// Indexes for crisis management
crisisAlertSchema.index({ userId: 1, createdAt: -1 });
crisisAlertSchema.index({ severity: 1, status: 1 });
crisisAlertSchema.index({ status: 1 });
crisisAlertSchema.index({ riskLevel: -1 });

module.exports = mongoose.model('CrisisAlert', crisisAlertSchema);