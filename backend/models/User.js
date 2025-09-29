const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    validate: {
      validator: function(v) {
        return /^\+?[\d\s\-\(\)]{10,15}$/.test(v);
      },
      message: 'Please provide a valid phone number'
    }
  },
  resumeData: {
    text: String,
    data: mongoose.Schema.Types.Mixed,
    fileType: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better performance
userSchema.index({ email: 1 });
userSchema.index({ createdAt: 1 });

// Instance method to get user data without sensitive info
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  return user;
};

module.exports = mongoose.model('User', userSchema);