const express = require('express');
const Session = require('../models/Session');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/sessions/save
// @desc    Save or update session data
// @access  Public (using email for identification)
router.post('/save', async (req, res) => {
  try {
    const { email, sessionData } = req.body;

    if (!email || !sessionData) {
      return res.status(400).json({ 
        message: 'Email and session data are required' 
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find existing session or create new one
    let session = await Session.findOne({ user: user._id, isActive: true });
    
    if (session) {
      // Update existing session
      session.sessionData = sessionData;
      session.updatedAt = new Date();
      await session.save();
      
      res.json({
        success: true,
        action: 'updated',
        session: {
          id: session._id,
          sessionData: session.sessionData,
          updatedAt: session.updatedAt
        }
      });
    } else {
      // Create new session
      session = new Session({
        user: user._id,
        email: email.toLowerCase(),
        sessionData
      });
      
      await session.save();
      
      res.status(201).json({
        success: true,
        action: 'created',
        session: {
          id: session._id,
          sessionData: session.sessionData,
          updatedAt: session.updatedAt
        }
      });
    }

  } catch (error) {
    console.error('Save session error:', error);
    res.status(500).json({ 
      message: 'Server error saving session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/sessions/get/:email
// @desc    Get session data by email
// @access  Public
router.get('/get/:email', async (req, res) => {
  try {
    const { email } = req.params;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find active session
    const session = await Session.findOne({ 
      user: user._id, 
      isActive: true 
    }).sort({ updatedAt: -1 });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json({
      success: true,
      session: {
        id: session._id,
        sessionData: session.sessionData,
        updatedAt: session.updatedAt
      }
    });

  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ 
      message: 'Server error getting session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/sessions/delete/:email
// @desc    Delete session data by email
// @access  Public
router.delete('/delete/:email', async (req, res) => {
  try {
    const { email } = req.params;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Mark session as inactive instead of deleting
    const result = await Session.updateMany(
      { user: user._id, isActive: true },
      { isActive: false }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'No active session found' });
    }

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });

  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ 
      message: 'Server error deleting session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/sessions/user/:userId
// @desc    Get user sessions (requires authentication)
// @access  Private
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if requesting user's own sessions
    if (req.user.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const sessions = await Session.find({ 
      user: userId,
      isActive: true 
    }).sort({ updatedAt: -1 });

    res.json({
      success: true,
      sessions: sessions.map(session => ({
        id: session._id,
        sessionData: session.sessionData,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }))
    });

  } catch (error) {
    console.error('Get user sessions error:', error);
    res.status(500).json({ 
      message: 'Server error getting sessions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;