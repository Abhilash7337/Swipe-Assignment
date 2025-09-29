const express = require('express');
const Interview = require('../models/Interview');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/interviews/create
// @desc    Create new interview
// @access  Public (using email for identification)
router.post('/create', async (req, res) => {
  try {
    const { email, candidateInfo } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create new interview
    const interview = new Interview({
      user: user._id,
      candidateInfo: candidateInfo || {
        name: user.name,
        email: user.email,
        phone: user.phone,
        resumeText: user.resumeData?.text || ''
      }
    });

    await interview.save();

    res.status(201).json({
      success: true,
      interview: {
        id: interview._id,
        candidateInfo: interview.candidateInfo,
        status: interview.status,
        startedAt: interview.startedAt
      }
    });

  } catch (error) {
    console.error('Create interview error:', error);
    res.status(500).json({ 
      message: 'Server error creating interview',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/interviews/:interviewId/question
// @desc    Add or update interview question
// @access  Public
router.put('/:interviewId/question', async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { questionData } = req.body;

    if (!questionData) {
      return res.status(400).json({ message: 'Question data is required' });
    }

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    // Find existing question or add new one
    const existingQuestionIndex = interview.questions.findIndex(
      q => q.id === questionData.id
    );

    if (existingQuestionIndex !== -1) {
      // Update existing question
      interview.questions[existingQuestionIndex] = {
        ...interview.questions[existingQuestionIndex],
        ...questionData
      };
    } else {
      // Add new question
      interview.questions.push(questionData);
    }

    await interview.save();

    res.json({
      success: true,
      message: 'Question updated successfully',
      question: questionData
    });

  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ 
      message: 'Server error updating question',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/interviews/:interviewId/complete
// @desc    Complete interview
// @access  Public
router.put('/:interviewId/complete', async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { allAnswers } = req.body;

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    // Update questions with final answers
    if (allAnswers && Array.isArray(allAnswers)) {
      allAnswers.forEach(answer => {
        const questionIndex = interview.questions.findIndex(
          q => q.id === answer.id
        );
        if (questionIndex !== -1) {
          interview.questions[questionIndex] = {
            ...interview.questions[questionIndex],
            ...answer
          };
        }
      });
    }

    // Mark as completed
    interview.status = 'completed';
    interview.completedAt = new Date();
    
    // Calculate duration
    if (interview.startedAt) {
      const durationMs = interview.completedAt - interview.startedAt;
      interview.duration = Math.round(durationMs / (1000 * 60)); // in minutes
    }

    await interview.save();

    res.json({
      success: true,
      message: 'Interview completed successfully',
      interview: {
        id: interview._id,
        totalScore: interview.totalScore,
        averageScore: interview.averageScore,
        status: interview.status,
        completedAt: interview.completedAt,
        duration: interview.duration
      }
    });

  } catch (error) {
    console.error('Complete interview error:', error);
    res.status(500).json({ 
      message: 'Server error completing interview',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/interviews/all
// @desc    Get all interviews for dashboard
// @access  Public
router.get('/all', async (req, res) => {
  try {
    const { search, sortBy = 'completedAt', sortOrder = 'desc', status } = req.query;
    
    // Build query
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Search functionality
    if (search) {
      query.$or = [
        { 'candidateInfo.name': new RegExp(search, 'i') },
        { 'candidateInfo.email': new RegExp(search, 'i') },
        { 'candidateInfo.phone': new RegExp(search, 'i') }
      ];
    }
    
    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const interviews = await Interview.find(query)
      .populate('user', 'name email phone')
      .sort(sortOptions)
      .select('-__v');

    res.json({
      success: true,
      count: interviews.length,
      interviews
    });

  } catch (error) {
    console.error('Get all interviews error:', error);
    res.status(500).json({ 
      message: 'Server error getting interviews',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/interviews/user/:email
// @desc    Get user interviews by email
// @access  Public
router.get('/user/:email', async (req, res) => {
  try {
    const { email } = req.params;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const interviews = await Interview.find({ user: user._id })
      .sort({ startedAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      interviews
    });

  } catch (error) {
    console.error('Get user interviews error:', error);
    res.status(500).json({ 
      message: 'Server error getting interviews',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/interviews/:interviewId
// @desc    Get interview by ID
// @access  Public
router.get('/:interviewId', async (req, res) => {
  try {
    const { interviewId } = req.params;

    const interview = await Interview.findById(interviewId)
      .populate('user', 'name email phone')
      .select('-__v');

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    res.json({
      success: true,
      interview
    });

  } catch (error) {
    console.error('Get interview error:', error);
    res.status(500).json({ 
      message: 'Server error getting interview',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;