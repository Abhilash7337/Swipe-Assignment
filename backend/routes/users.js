const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-__v');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      message: 'Server error getting profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, resumeData } = req.body;
    
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (resumeData) user.resumeData = resumeData;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      message: 'Server error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/users/save
// @desc    Save or update user data
// @access  Public
router.post('/save', async (req, res) => {
  try {
    const { name, email, phone, resumeData } = req.body;

    // Validate required fields
    if (!name || !email || !phone) {
      return res.status(400).json({ 
        message: 'Name, email, and phone are required' 
      });
    }

    // Check if user exists
    let user = await User.findOne({ email });
    
    if (user) {
      // Update existing user
      user.name = name;
      user.phone = phone;
      if (resumeData) user.resumeData = resumeData;
      await user.save();
      
      res.json({
        success: true,
        action: 'updated',
        user
      });
    } else {
      // Create new user
      user = new User({
        name,
        email,
        phone,
        resumeData
      });
      
      await user.save();
      
      res.status(201).json({
        success: true,
        action: 'created',
        user
      });
    }

  } catch (error) {
    console.error('Save user error:', error);
    res.status(500).json({ 
      message: 'Server error saving user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/users/by-email/:email
// @desc    Get user by email
// @access  Public
router.get('/by-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await User.findOne({ 
      email: email.toLowerCase(), 
      isActive: true 
    }).select('-__v');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get user by email error:', error);
    res.status(500).json({ 
      message: 'Server error getting user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;