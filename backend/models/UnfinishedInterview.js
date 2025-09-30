const mongoose = require('mongoose');

const unfinishedInterviewSchema = new mongoose.Schema({
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
  startedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

unfinishedInterviewSchema.index({ user: 1 });
unfinishedInterviewSchema.index({ startedAt: 1 });

module.exports = mongoose.model('UnfinishedInterview', unfinishedInterviewSchema, 'unfinishedinterviews');
