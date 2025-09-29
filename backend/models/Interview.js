const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  candidateInfo: {
    name: String,
    email: String,
    phone: String,
    resumeText: String
  },
  questions: [{
    id: Number,
    question: String,
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard']
    },
    timeLimit: Number,
    answered: {
      type: Boolean,
      default: false
    },
    answer: String,
    score: Number,
    timeTaken: Number,
    feedback: String,
    timedOut: {
      type: Boolean,
      default: false
    }
  }],
  totalScore: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'abandoned'],
    default: 'in-progress'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  duration: Number // in minutes
}, {
  timestamps: true
});

// Index for better performance
interviewSchema.index({ user: 1 });
interviewSchema.index({ status: 1 });
interviewSchema.index({ startedAt: 1 });

// Calculate scores before saving
interviewSchema.pre('save', function(next) {
  if (this.questions && this.questions.length > 0) {
    const answeredQuestions = this.questions.filter(q => q.answered);
    if (answeredQuestions.length > 0) {
      this.totalScore = answeredQuestions.reduce((sum, q) => sum + (q.score || 0), 0);
      this.averageScore = this.totalScore / answeredQuestions.length;
    }
  }
  next();
});

module.exports = mongoose.model('Interview', interviewSchema);