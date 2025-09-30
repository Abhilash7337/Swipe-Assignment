
const express = require('express');
const Interview = require('../models/Interview');
const User = require('../models/User');
const UnfinishedInterview = require('../models/UnfinishedInterview');
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
    // Find most recent unfinished interview in the separate collection
    const unfinished = await UnfinishedInterview.findOne({ user: user._id })
      .sort({ startedAt: -1 })
      .select('-__v');
    if (!unfinished) {
      return res.json({ success: true, interview: null });
    }
    res.json({ success: true, interview: unfinished });
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

    // Create (or return existing) unfinished interview in separate collection
    let unfinished = await UnfinishedInterview.findOne({ user: user._id }).sort({ startedAt: -1 });
    if (!unfinished) {
      unfinished = new UnfinishedInterview({
        user: user._id,
        candidateInfo: candidateInfo || {
          name: user.name,
          email: user.email,
          phone: user.phone,
          resumeText: user.resumeData?.text || ''
        }
      });

      await unfinished.save();
    }

    res.status(201).json({
      success: true,
      interview: {
        id: unfinished._id,
        candidateInfo: unfinished.candidateInfo,
        startedAt: unfinished.startedAt
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
// @desc    Add or update question in the unfinished interviews collection
// @access  Public
router.put('/:interviewId/question', async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { questionData } = req.body;

    if (!questionData) {
      return res.status(400).json({ message: 'Question data is required' });
    }

    // Try unfinished interview first
    let unfinished = await UnfinishedInterview.findById(interviewId);

    // If not found in unfinished, fall back to Interview collection (backwards compatibility)
    if (!unfinished) {
      const existingInterview = await Interview.findById(interviewId);
      if (!existingInterview) {
        return res.status(404).json({ message: 'Interview not found' });
      }
      // Operate on the Interview document directly if created previously
      const existingQuestionIndex = existingInterview.questions.findIndex(q => q.id === questionData.id);
      if (existingQuestionIndex !== -1) {
        const existingQuestion = existingInterview.questions[existingQuestionIndex];
        existingInterview.questions[existingQuestionIndex] = {
          ...existingQuestion,
          ...questionData,
          answered: questionData.answered ?? existingQuestion.answered,
          answer: questionData.answer ?? existingQuestion.answer,
          score: questionData.score ?? existingQuestion.score,
          timeTaken: questionData.timeTaken ?? existingQuestion.timeTaken,
          feedback: questionData.feedback ?? existingQuestion.feedback
        };
      } else {
        existingInterview.questions.push({
          ...questionData,
          answered: questionData.answered || false,
          answer: questionData.answer || null,
          score: questionData.score || null,
          timeTaken: questionData.timeTaken || null,
          feedback: questionData.feedback || null
        });
      }

      await existingInterview.save();

      return res.json({ success: true, message: 'Question updated in interview', question: questionData });
    }

    // Update or add question in unfinished interview
    const existingQuestionIndex = unfinished.questions.findIndex(q => q.id === questionData.id);
    if (existingQuestionIndex !== -1) {
      const existingQuestion = unfinished.questions[existingQuestionIndex];
      unfinished.questions[existingQuestionIndex] = {
        ...existingQuestion,
        ...questionData,
        answered: questionData.answered ?? existingQuestion.answered,
        answer: questionData.answer ?? existingQuestion.answer,
        score: questionData.score ?? existingQuestion.score,
        timeTaken: questionData.timeTaken ?? existingQuestion.timeTaken,
        feedback: questionData.feedback ?? existingQuestion.feedback
      };
    } else {
      unfinished.questions.push({
        ...questionData,
        answered: questionData.answered || false,
        answer: questionData.answer || null,
        score: questionData.score || null,
        timeTaken: questionData.timeTaken || null,
        feedback: questionData.feedback || null
      });
    }

    await unfinished.save();

    res.json({ success: true, message: 'Question updated successfully', question: questionData });

  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ message: 'Server error updating question', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// @route   PUT /api/interviews/:interviewId/complete
// @desc    Complete interview
// @access  Public
router.put('/:interviewId/complete', async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { allAnswers, createNewSession } = req.body;

    // Try to find an unfinished interview first
    let unfinished = await UnfinishedInterview.findById(interviewId);

    // If unfinished exists, merge answers into it and then move to Interview collection
    if (unfinished) {
      if (allAnswers && Array.isArray(allAnswers)) {
        allAnswers.forEach(answer => {
          const questionIndex = unfinished.questions.findIndex(q => q.id === answer.id);
          if (questionIndex !== -1) {
            unfinished.questions[questionIndex] = {
              ...unfinished.questions[questionIndex],
              ...answer,
              answered: true
            };
          }
        });
      }

      // Create a new Interview document from the unfinished one
      const interviewData = {
        user: unfinished.user,
        candidateInfo: unfinished.candidateInfo,
        questions: unfinished.questions.map(q => ({
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
        })),
        status: 'completed',
        startedAt: unfinished.startedAt,
        completedAt: new Date()
      };

      const newInterview = new Interview(interviewData);
      await newInterview.save();

      // Remove the unfinished document
      await UnfinishedInterview.findByIdAndDelete(unfinished._id);

      return res.json({
        success: true,
        message: 'Unfinished interview completed and moved to interviews collection',
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

    // If not in unfinished, fall back to Interview collection (existing behavior)
    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    // Merge provided answers into a working questions array
    if (allAnswers && Array.isArray(allAnswers)) {
      allAnswers.forEach(answer => {
        const questionIndex = interview.questions.findIndex(q => q.id === answer.id);
        if (questionIndex !== -1) {
          interview.questions[questionIndex] = {
            ...interview.questions[questionIndex],
            ...answer,
            answered: true
          };
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
    res.status(500).json({ message: 'Server error completing interview', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
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
      // For filtering, if status is 'in-progress' we will filter UnfinishedInterview documents
      if (status === 'in-progress') {
        query._status = 'in-progress';
      } else {
        query.status = status;
      }
    }

    // Search functionality for both collections
    const searchRegex = search ? new RegExp(search, 'i') : null;

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Fetch completed interviews
    let completed = [];
    if (!status || status === 'all' || status === 'completed' || status === 'abandoned') {
      const completedQuery = {};
      if (status === 'abandoned') completedQuery.status = 'abandoned';
      if (searchRegex) {
        completedQuery.$or = [
          { 'candidateInfo.name': searchRegex },
          { 'candidateInfo.email': searchRegex },
          { 'candidateInfo.phone': searchRegex }
        ];
      }
      completed = await Interview.find(completedQuery)
        .populate('user', 'name email phone')
        .select('-__v')
        .lean();
    }

    // Fetch unfinished interviews
    let unfinished = [];
    if (!status || status === 'all' || status === 'in-progress') {
      const unfinishedQuery = {};
      if (searchRegex) {
        unfinishedQuery.$or = [
          { 'candidateInfo.name': searchRegex },
          { 'candidateInfo.email': searchRegex },
          { 'candidateInfo.phone': searchRegex }
        ];
      }
      unfinished = await UnfinishedInterview.find(unfinishedQuery)
        .select('-__v')
        .lean();

      // Map unfinished to have similar fields as Interview
      unfinished = unfinished.map(u => ({
        ...u,
        status: 'in-progress'
      }));
    }

    const combined = [...completed, ...unfinished]
      .sort((a, b) => {
        const dateA = new Date(a.completedAt || a.startedAt || 0);
        const dateB = new Date(b.completedAt || b.startedAt || 0);
        return sortOptions[sortBy] === -1 ? dateB - dateA : dateA - dateB;
      });

    res.json({ success: true, count: combined.length, interviews: combined });

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

    // Fetch completed interviews
    const completed = await Interview.find({ user: user._id })
      .select('-__v')
      .lean();

    // Fetch unfinished interviews and map to similar shape (mark as in-progress)
    const unfinished = await UnfinishedInterview.find({ user: user._id })
      .select('-__v')
      .lean();

    const unfinishedMapped = unfinished.map(u => ({
      ...u,
      status: 'in-progress',
      id: u._id
    }));

    const combined = [...completed.map(c => ({ ...c, id: c._id })), ...unfinishedMapped]
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

    res.json({ success: true, interviews: combined });

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

    // Try to find in UnfinishedInterview first
    let interview = await UnfinishedInterview.findById(interviewId).select('-__v').lean();
    if (interview) {
      // attach a user object if possible
      const user = await User.findById(interview.user).select('name email phone');
      interview.user = user;
      interview.status = 'in-progress';
      return res.json({ success: true, interview });
    }

    // Fall back to completed interviews
    interview = await Interview.findById(interviewId)
      .populate('user', 'name email phone')
      .select('-__v');

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    res.json({ success: true, interview });

  } catch (error) {
    console.error('Get interview error:', error);
    res.status(500).json({ 
      message: 'Server error getting interview',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;