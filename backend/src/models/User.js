const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    min: 13,
    max: 120
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say']
  },
  preferredLanguage: {
    type: String,
    enum: ['en', 'es', 'hi'],
    default: 'en'
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  profilePicture: String,
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  moodBaseline: {
    overall: {
      type: Number,
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
    completedAt: Date
  },
  preferences: {
    notificationsEnabled: {
      type: Boolean,
      default: true
    },
    dailyCheckIns: {
      type: Boolean,
      default: true
    },
    crisisAlerts: {
      type: Boolean,
      default: true
    },
    voiceMessages: {
      type: Boolean,
      default: true
    }
  },
  accessibilitySettings: {
    highContrast: {
      type: Boolean,
      default: false
    },
    voiceInput: {
      type: Boolean,
      default: false
    },
    voiceOutput: {
      type: Boolean,
      default: false
    },
    fontSize: {
      type: String,
      enum: ['small', 'medium', 'large'],
      default: 'medium'
    }
  },
  safetyPlan: {
    warningSigns: [String],
    copingStrategies: [String],
    supportContacts: [{
      name: String,
      phone: String,
      relationship: String
    }],
    professionalContacts: [{
      name: String,
      phone: String,
      type: String
    }],
    environmentSafety: String,
    lastUpdated: Date
  },
  refreshToken: String
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ isActive: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive data from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.refreshToken;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);