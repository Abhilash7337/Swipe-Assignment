
const express = require('express');
const Interview = require('../models/Interview');
const User = require('../models/User');
const router = express.Router();

// @route   GET /api/interviews/unfinished/:email
// @desc    Get unfinished (in-progress) interview for a user by email
// @access  Public
router.get('/unfinished/:email', async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Find most recent unfinished interview
    const interview = await Interview.findOne({ user: user._id, status: 'in-progress' })
      .sort({ startedAt: -1 })
      .select('-__v');
    if (!interview) {
      return res.json({ success: true, interview: null });
    }
    res.json({ success: true, interview });
  } catch (error) {
    console.error('Get unfinished interview error:', error);
    res.status(500).json({ message: 'Server error getting unfinished interview', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});


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
      // Update existing question, ensuring answered state and answer are preserved
      const existingQuestion = interview.questions[existingQuestionIndex];
      interview.questions[existingQuestionIndex] = {
        ...existingQuestion,
        ...questionData,
        // Ensure these fields are explicitly set if provided
        answered: questionData.answered ?? existingQuestion.answered,
        answer: questionData.answer ?? existingQuestion.answer,
        score: questionData.score ?? existingQuestion.score,
        timeTaken: questionData.timeTaken ?? existingQuestion.timeTaken,
        feedback: questionData.feedback ?? existingQuestion.feedback
      };
    } else {
      // Add new question
      interview.questions.push({
        ...questionData,
        // Ensure these fields have default values
        answered: questionData.answered || false,
        answer: questionData.answer || null,
        score: questionData.score || null,
        timeTaken: questionData.timeTaken || null,
        feedback: questionData.feedback || null
      });
    }

    // Update interview status
    const allAnswered = interview.questions.every(q => q.answered);
    if (allAnswered && interview.questions.length === 6) {
      interview.status = 'completed';
      interview.completedAt = new Date();
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
    const { allAnswers, createNewSession } = req.body;

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    // Merge provided answers into a working questions array
    if (allAnswers && Array.isArray(allAnswers)) {
      allAnswers.forEach(answer => {
        const questionIndex = interview.questions.findIndex(
          q => q.id === answer.id
        );
        if (questionIndex !== -1) {
          interview.questions[questionIndex] = {
            ...interview.questions[questionIndex],
            ...answer,
            answered: true
          };
        }
      });
    }

    // If requested, create a new interview document (preserve original as abandoned)
    if (createNewSession) {
      // Build new interview doc with merged questions
      const mergedQuestions = interview.questions.map(q => ({
        id: q.id,
        question: q.question,
        difficulty: q.difficulty,
        timeLimit: q.timeLimit,
        answered: q.answered || false,
        answer: q.answer || null,
        score: q.score || null,
        timeTaken: q.timeTaken || null,
        feedback: q.feedback || null,
        timedOut: q.timedOut || false
      }));

      const newInterview = new Interview({
        user: interview.user,
        candidateInfo: interview.candidateInfo,
        questions: mergedQuestions,
        status: 'completed',
        startedAt: interview.startedAt,
        completedAt: new Date()
      });

      await newInterview.save();

      // Mark original interview as abandoned so dashboard shows both
      interview.status = 'abandoned';
      await interview.save();

      return res.json({
        success: true,
        message: 'Resumed interview completed and new session created',
        interview: {
          id: newInterview._id,
          totalScore: newInterview.totalScore,
          averageScore: newInterview.averageScore,
          status: newInterview.status,
          completedAt: newInterview.completedAt,
          duration: newInterview.duration
        }
      });
    }

    // Default behavior: update existing interview and mark as completed
    interview.status = 'completed';
    interview.completedAt = new Date();
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