const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  sessionData: {
    isInterviewStarted: {
      type: Boolean,
      default: false
    },
    isInterviewCompleted: {
      type: Boolean,
      default: false
    },
    currentQuestionIndex: {
      type: Number,
      default: 0
    },
    currentTimer: {
      type: Number,
      default: 0
    },
    isAnswering: {
      type: Boolean,
      default: false
    },
    isEvaluating: {
      type: Boolean,
      default: false
    },
    isGeneratingQuestion: {
      type: Boolean,
      default: false
    },
    activeQuestion: mongoose.Schema.Types.Mixed,
    allQuestionsAsked: [String],
    allAnswers: [mongoose.Schema.Types.Mixed],
    chatMessages: [mongoose.Schema.Types.Mixed],
    userInputs: {
      name: String,
      email: String,
      phone: String
    },
    finalCandidateInfo: mongoose.Schema.Types.Mixed,
    extractedData: mongoose.Schema.Types.Mixed,
    currentStep: {
      type: Number,
      default: 0
    },
    chatPhase: {
      type: String,
      enum: ['upload', 'collecting', 'ready', 'interview'],
      default: 'upload'
    },
    missingFields: [String],
    currentMissingField: String,
    currentMissingFieldIndex: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // 24 hours in seconds
  }
}, {
  timestamps: true
});

// Index for better performance
sessionSchema.index({ user: 1 });
sessionSchema.index({ email: 1 });
sessionSchema.index({ updatedAt: 1 });
sessionSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Session', sessionSchema);