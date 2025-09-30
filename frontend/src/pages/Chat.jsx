import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Card, Typography, Space, Button, Input, Progress, Tag, Spin } from "antd";
import { FileTextOutlined, MessageOutlined, ClockCircleOutlined, SendOutlined } from '@ant-design/icons';
import ResumeUploadSection from "../cmp/Chat/ResumeUploadSection";
import DataCollectionChat from "../cmp/Chat/DataCollectionChat";
import InterviewChat from "../cmp/Chat/InterviewChat";
import InterviewResultsContainer from "../cmp/Chat/InterviewResultsContainer";
import InterviewEngine from "../cmp/Chat/InterviewEngine";
import { setCandidateInfo } from "../feat/cand";
import ChatMessages from "../cmp/Chat/ChatMessages";
import ChatInput from "../cmp/Chat/ChatInput";
import InterviewStatusBar from "../cmp/Chat/InterviewStatusBar";
import LoadingIndicator from "../cmp/Chat/LoadingIndicator";
// IndexedDB imports removed
import apiService from '../services/apiService';

const { Title, Text } = Typography;
const { TextArea } = Input;

const Chat = () => {
  const [processingNewResume, setProcessingNewResume] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const dispatch = useDispatch();
  
  // Basic states
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [resumeEmail, setResumeEmail] = useState("");
  const [pendingInterview, setPendingInterview] = useState(null);
  const [showContinuePrompt, setShowContinuePrompt] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [missingFields, setMissingFields] = useState([]);
  
  // Chat flow states
  const [chatPhase, setChatPhase] = useState('upload'); // 'upload', 'collecting', 'ready', 'interview'
  const [botIsTyping, setBotIsTyping] = useState(false);
  const [waitingForUserResponse, setWaitingForUserResponse] = useState(false);
  const [currentMissingField, setCurrentMissingField] = useState(null);
  const [currentMissingFieldIndex, setCurrentMissingFieldIndex] = useState(0);
  const [messageIdCounter, setMessageIdCounter] = useState(1);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [userInputs, setUserInputs] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Interview states - Simplified for dynamic question flow
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [isInterviewCompleted, setIsInterviewCompleted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentTimer, setCurrentTimer] = useState(0);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [finalCandidateInfo, setFinalCandidateInfo] = useState(null);
  const [interviewId, setInterviewId] = useState(null);
  const [resumedInterviewId, setResumedInterviewId] = useState(null);
  
  // Current question data
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [allQuestionsAsked, setAllQuestionsAsked] = useState([]);
  const [allAnswers, setAllAnswers] = useState([]);
  
  // Interview configuration
  const difficultySequence = ['easy', 'easy', 'medium', 'medium', 'hard', 'hard'];
  const timeSequence = [20, 20, 60, 60, 120, 120]; // seconds
  
  // Refs
  const timerRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Initialize interview engine
  const interviewEngine = InterviewEngine({
    candidateInfo: extractedData?.data,
    resumeText: extractedData?.text,
    onInterviewComplete: (results) => {
      console.log('Interview completed:', results);
    }
  });

  // Generate unique message ID
  const generateMessageId = () => {
    const newId = `msg_${Date.now()}_${messageIdCounter}_${Math.random().toString(36).substr(2, 9)}`;
    setMessageIdCounter(prev => prev + 1);
    return newId;
  };

  // Save user data to backend
  const saveUserToBackend = async (finalName, finalEmail, finalPhone) => {
    try {
      const userData = {
        name: finalName.trim(),
        email: finalEmail.trim(),
        phone: finalPhone.trim()
      };

      console.log('💾 Saving user to backend:', userData);
      const result = await apiService.saveUser(userData);
      
      if (result.success) {
        console.log(`✅ User ${result.action} in backend:`, result.user.email);
        // Store token if provided (for new registrations)
        if (result.token) {
          apiService.setToken(result.token);
        }
      }
      return result;
    } catch (error) {
      console.error('❌ Failed to save user to backend:', error);
      throw error;
    }
  };

  // Timer effect
  useEffect(() => {
    if (isAnswering && currentTimer > 0) {
      timerRef.current = setTimeout(() => {
        setCurrentTimer(currentTimer - 1);
      }, 1000);
    } else if (isAnswering && currentTimer === 0) {
      // Time's up - auto submit
      handleTimeExpired();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentTimer, isAnswering]);



  // Auto scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Debug: log interview UI state changes to help trace resume issues
  useEffect(() => {
    console.debug('INTERVIEW STATE:', {
      isAnswering,
      isEvaluating,
      isGeneratingQuestion,
      currentTimer,
      currentQuestionIndex,
      activeQuestion,
      chatInput
    });
  }, [isAnswering, isEvaluating, isGeneratingQuestion, currentTimer, currentQuestionIndex, activeQuestion, chatInput]);

  // Start interview process
  const startInterview = async () => {
    try {
      setIsInterviewStarted(true);
      setChatPhase('interview');
      setCurrentQuestionIndex(0);
      setAllQuestionsAsked([]);
      setAllAnswers([]);
      const startMessage = {
        id: generateMessageId(),
        type: 'bot',
        message: `🎯 **Your Technical Interview Starts Now!**\n\n**Format Reminder:**\n• 6 Questions Total: 2 Easy → 2 Medium → 2 Hard\n• Questions generated dynamically by AI  \n• Timers: Easy (20s), Medium (60s), Hard (120s)\n• Auto-submit when time expires\n\n🚀 Generating your first question...`
      };
      setChatMessages([startMessage]);
      setWaitingForUserResponse(false);

      // Create interview in backend and store interviewId
      const candidateEmail = finalCandidateInfo?.email || userInputs.email || extractedData?.data?.email;
      const candidateInfo = finalCandidateInfo || extractedData?.data || userInputs;
      const interviewRes = await apiService.createInterview(candidateEmail, candidateInfo);
      if (interviewRes?.success && interviewRes.interview?.id) {
        setInterviewId(interviewRes.interview.id);
      }

      // Generate and show first question
      setTimeout(() => {
        generateAndShowNextQuestion(0);
      }, 3000);
    } catch (error) {
      console.error('Failed to start interview:', error);
    }
  };

  // Generate and show the next question
  // Generate and show the next question. Accept an explicit index to avoid stale state.
  const generateAndShowNextQuestion = async (explicitIndex = null) => {
    try {
      const idx = explicitIndex !== null ? explicitIndex : currentQuestionIndex;
      console.debug('generateAndShowNextQuestion: using idx=', idx, 'currentQuestionIndex=', currentQuestionIndex);
      setIsGeneratingQuestion(true);

      const questionNumber = idx + 1;
      const difficulty = difficultySequence[idx];
      const timeLimit = timeSequence[idx];

      // Show generating message
      const generatingMessage = {
        id: generateMessageId(),
        type: 'system',
        message: `🤖 Generating Question ${questionNumber}/6 (${difficulty.toUpperCase()})...`
      };
      setChatMessages(prev => [...prev, generatingMessage]);

      // Generate question using AI
      const questionText = await interviewEngine.generateQuestion(
        difficulty,
        questionNumber,
        allQuestionsAsked
      );

      const newQuestion = {
        id: questionNumber,
        question: questionText,
        difficulty: difficulty,
        timeLimit: timeLimit,
        answered: false,
        answer: null,
        score: null,
        timeTaken: null,
        feedback: null
      };

  setActiveQuestion(newQuestion);
  setAllQuestionsAsked(prev => [...prev, questionText]);

      // Send question to backend immediately
      if (interviewId) {
        try {
          await apiService.updateInterviewQuestion(interviewId, newQuestion);
        } catch (err) {
          console.error('Failed to save question to backend:', err);
        }
      }

      // Show the question
      const questionMessage = {
        id: generateMessageId(),
        type: 'bot',
        message: `📝 **Question ${questionNumber}/6** (${difficulty.toUpperCase()}) - ${timeLimit}s\n\n${questionText}\n\n⏰ **Timer started!** You have ${timeLimit} seconds to answer.`
      };

      setChatMessages(prev => [...prev.slice(0, -1), questionMessage]); // Replace generating message

      // Start timer and answering mode
      setCurrentTimer(timeLimit);
      setIsAnswering(true);
      setQuestionStartTime(Date.now());
      setIsGeneratingQuestion(false);

      // If caller provided explicit index, ensure currentQuestionIndex is in sync
      if (explicitIndex !== null && explicitIndex !== currentQuestionIndex) {
        setCurrentQuestionIndex(explicitIndex);
      }

    } catch (error) {
      console.error('Failed to generate question:', error);

      const errorMessage = {
        id: Date.now(),
        type: 'system',
        message: `❌ Failed to generate question: ${error.message}`
      };
      setChatMessages(prev => [...prev, errorMessage]);
      setIsGeneratingQuestion(false);
    }
  };

  // Handle time expired
  const handleTimeExpired = async () => {
    if (!activeQuestion) return;
    
    const timeTaken = activeQuestion.timeLimit;
    const answer = chatInput.trim() || "No answer provided (time expired)";
    
    const timeExpiredMessage = {
      id: Date.now(),
      type: 'system',
      message: `⏰ Time's up! Auto-submitting your answer...`
    };

    setChatMessages(prev => [...prev, timeExpiredMessage]);
    setIsAnswering(false);
    setIsEvaluating(true);
    setChatInput('');

    // Evaluate the answer
    setTimeout(async () => {
      await evaluateCurrentAnswer(answer, timeTaken, true);
    }, 1000);
  };

  // Submit answer manually
  const submitAnswer = async () => {
    if (!activeQuestion || !chatInput.trim()) return;
    
    const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);
    const answer = chatInput.trim();
    
    // Show user answer
    const userMessage = {
      id: Date.now(),
      type: 'user',
      message: answer
    };
    setChatMessages(prev => [...prev, userMessage]);
    
    setIsAnswering(false);
    setIsEvaluating(true);
    setChatInput('');
    clearTimeout(timerRef.current);

    // Evaluate the answer
    setTimeout(async () => {
      await evaluateCurrentAnswer(answer, timeTaken, false);
    }, 1000);
  };

  // Evaluate current answer
  const evaluateCurrentAnswer = async (answer, timeTaken, timedOut = false) => {
    if (!activeQuestion) return;
    
    try {
      // Show evaluating message
      const evaluatingMessage = {
        id: Date.now(),
        type: 'system',
        message: `🤖 AI is evaluating your answer...`
      };
      setChatMessages(prev => [...prev, evaluatingMessage]);

      const evaluation = await interviewEngine.judgeAnswer(
        activeQuestion.question,
        answer,
        activeQuestion.difficulty,
        timeTaken
      );

      // Update active question and store answer data
      const answerData = {
        ...activeQuestion,
        answered: true,
        answer: answer,
        score: evaluation.score,
        timeTaken: timeTaken,
        feedback: evaluation.feedback,
        timedOut: timedOut
      };
      
      // Update the active question so it's marked as answered
      setActiveQuestion(answerData);
      
      // Add to all answers array
      setAllAnswers(prev => {
        // Check if this answer already exists
        const existingIndex = prev.findIndex(a => a.id === answerData.id);
        if (existingIndex !== -1) {
          // Replace existing answer
          const newAnswers = [...prev];
          newAnswers[existingIndex] = answerData;
          return newAnswers;
        }
        // Add new answer
        return [...prev, answerData];
      });

      // Immediately save answer to backend
      if (interviewId) {
        try {
          const result = await apiService.updateInterviewQuestion(interviewId, answerData);
          if (result.success) {
            console.log('✅ Answer saved to database:', answerData);
          } else {
            console.error('❌ Failed to save answer to database:', result);
            // Show error message to user
            setChatMessages(prev => [...prev, {
              id: generateMessageId(),
              type: 'system',
              message: '⚠️ Warning: Had trouble saving your answer. Your progress might not be saved if you refresh.'
            }]);
          }
        } catch (err) {
          console.error('❌ Failed to save answer to database:', err);
          // Show error message to user
          setChatMessages(prev => [...prev, {
            id: generateMessageId(),
            type: 'system',
            message: '⚠️ Warning: Had trouble saving your answer. Your progress might not be saved if you refresh.'
          }]);
        }
      }

      // Show brief confirmation message with API status
      const isApiDown = evaluation.error === "service_unavailable";
      const confirmationMessage = {
        id: generateMessageId(),
        type: 'system',
        message: `${isApiDown ? '⚠️' : '✅'} Answer recorded! Score: ${evaluation.score}/10${isApiDown ? ' (Offline Mode)' : ''}${currentQuestionIndex < 5 ? ' - Moving to next question...' : ' - Generating final results...'}`
      };

      setTimeout(() => {
        setChatMessages(prev => [...prev.slice(0, -1), confirmationMessage]); // Replace evaluating message
        setIsEvaluating(false);
        
        // Move to next question or finish interview
        if (currentQuestionIndex < 5) {
          const nextIndex = currentQuestionIndex + 1;
          // keep state in sync and pass explicit index to avoid stale closures
          setCurrentQuestionIndex(nextIndex);
          setTimeout(() => {
            generateAndShowNextQuestion(nextIndex);
          }, 2000);
        } else {
          setTimeout(() => {
            finishInterview();
          }, 2000);
        }
      }, 1500);
      
    } catch (error) {
      console.error('Evaluation failed:', error);
      
      const errorMessage = {
        id: Date.now(),
        type: 'system',
        message: `❌ Failed to evaluate answer: ${error.message}`
      };
      setChatMessages(prev => [...prev, errorMessage]);
      setIsEvaluating(false);
    }
  };

  // Finish interview and show results
  const finishInterview = async () => {
    try {
      // Show completion message
      const completionMessage = {
        id: Date.now(),
        type: 'system',
        message: `🎉 **Interview Complete!** Generating your comprehensive results...`
      };
      setChatMessages(prev => [...prev, completionMessage]);

      // Save all answers to backend
      if (interviewId && allAnswers.length > 0) {
        try {
          if (resumedInterviewId) {
            // Create a new completed session from the resumed interview
            await apiService.completeInterviewWithNewSession(resumedInterviewId, allAnswers, true);
          } else {
            await apiService.completeInterview(interviewId, allAnswers);
          }
        } catch (err) {
          console.error('Failed to save interview answers:', err);
        }
      }

      // Set interview as completed and show results
      setTimeout(() => {
        setIsInterviewCompleted(true);
        setIsInterviewStarted(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to finish interview:', error);
      const errorMessage = {
        id: Date.now(),
        type: 'system',
        message: `❌ Failed to complete interview: ${error.message}`
      };
      setChatMessages(prev => [...prev, errorMessage]);
    }
  };

  // Handle file selection
  const handleFileSelect = (file) => {
    console.log('📁 File selected:', file);
    setSelectedFile(file);
  };

  // Handle email input and check for unfinished interview
  const handleResumeEmailChange = async (email) => {
    setResumeEmail(email);
    if (email && email.includes('@')) {
      try {
        const res = await apiService.getInterviewByEmail(email);
        if (res.success && res.interview && res.interview.status !== 'completed') {
          setPendingInterview(res.interview);
          setShowContinuePrompt(true);
        } else {
          setPendingInterview(null);
          setShowContinuePrompt(false);
        }
      } catch (err) {
        setPendingInterview(null);
        setShowContinuePrompt(false);
      }
    } else {
      setPendingInterview(null);
      setShowContinuePrompt(false);
    }
  };

  // Handle email check
  const handleResumeEmailCheck = async () => {
    if (!resumeEmail.trim() || !resumeEmail.includes('@')) {
      return;
    }
    
    try {
      const response = await apiService.getUnfinishedInterview(resumeEmail);
      if (response.success && response.interview) {
        setPendingInterview(response.interview);
        setShowContinuePrompt(true);
      } else {
        setPendingInterview(null);
        setShowContinuePrompt(false);
      }
    } catch (error) {
      console.error('Failed to check for unfinished interview:', error);
      setPendingInterview(null);
      setShowContinuePrompt(false);
    }
  };

  // Handle continue interview
  const handleContinueInterview = () => {
    if (!pendingInterview) return;
    
    setCurrentStep(1);
    setChatPhase('interview');
    setIsInterviewStarted(true);
    restoreInterviewState(pendingInterview);
    // remember that we resumed from an unfinished interview
    setResumedInterviewId(pendingInterview.id || pendingInterview._id || null);
  };

  // Handle text extraction success and start chatbot conversation
  const handleTextExtracted = async (result) => {
    console.log('🎯 Text Extraction Result:', result);
    setProcessingNewResume(true);
    
    if (result.success) {
      const file = selectedFile;
      const data = {
        text: result.text,
        data: result.data,
        fileType: file?.type || 'unknown',
        resumeInfo: {
          wordCount: result.text.split(' ').length,
          sections: ['contact', 'experience', 'education']
        }
      };
      setUploadedFile(file);
      setExtractedData(data);

      // If continuing, restore interview state
      if (pendingInterview) {
        restoreInterviewState(pendingInterview);
        setCurrentStep(1);
        setChatPhase('interview');
        setIsInterviewStarted(true);
        setInterviewId(pendingInterview.id);
        return;
      }

      // Switch to chat interface for data collection
      console.log('🔄 Setting currentStep to 1');
      setCurrentStep(1);
      setChatPhase('collecting');
      // Start chatbot conversation
      console.log('⏰ Starting timeout for chatbot conversation');
      setTimeout(() => {
        console.log('🤖 Starting chatbot conversation');
        startChatbotConversation(data);
      }, 1000);
    } else {
      console.error('❌ Text extraction failed:', result.error);
    }
    // Reset the flag after processing
    setProcessingNewResume(false);
  };

  // Restore interview state from backend
  const restoreInterviewState = (interview) => {
    // Restore questions and answers
    const questions = interview.questions || [];
    
    // Count answered questions and extract answers
    // Check both answered field and if answer exists (for backward compatibility)
    const answeredQuestions = questions.filter(q => q.answered === true || (q.answer && q.answer.trim() !== ''));
    const answeredCount = answeredQuestions.length;
    
    // Restore all previous questions and answers in chat
    const restoredMessages = [];
    
    // Welcome message
    restoredMessages.push({
      id: generateMessageId(),
      type: 'bot',
      message: `🔄 Resuming your interview from where you left off (Question ${answeredCount + 1}/6)...`
    });

    // Add all previous answered Q&A to chat history
    questions.forEach((q, index) => {
      // Only show answered questions in history (check both conditions)
      if (q.answered === true || (q.answer && q.answer.trim() !== '')) {
        restoredMessages.push({
          id: generateMessageId(),
          type: 'bot',
          message: `📝 **Question ${index + 1}/6** (${q.difficulty.toUpperCase()}) - ${q.timeLimit}s\n\n${q.question}`
        });

        // Add the answer since this question was answered
        restoredMessages.push({
          id: generateMessageId(),
          type: 'user',
          message: q.answer
        });

        restoredMessages.push({
          id: generateMessageId(),
          type: 'system',
          message: `✅ Answer recorded! Score: ${q.score}/10 - Moving to next question...`
        });
      }
    });

  // Set chat messages
  console.debug('restoreInterviewState: setting restoredMessages, answeredCount=', answeredCount, 'questions:', questions);
  setChatMessages(restoredMessages);
    
    // Restore progress
    setAllQuestionsAsked(answeredQuestions.map(q => q.question));
    setAllAnswers(answeredQuestions);
    setCurrentQuestionIndex(answeredCount);
    
    // Find the next unanswered question
    const nextUnanswered = questions.find(q => q.answered !== true && (!q.answer || q.answer.trim() === ''));
    
    if (nextUnanswered) {
      setActiveQuestion(nextUnanswered);
      setCurrentTimer(nextUnanswered.timeLimit || 20);
      setIsAnswering(true);
      setQuestionStartTime(Date.now());
      
      // Find the index of the next unanswered question for display
      const nextQuestionIndex = questions.findIndex(q => q.answered !== true && (!q.answer || q.answer.trim() === ''));
      
      // Add the next question message
      setTimeout(() => {
        console.debug('restoreInterviewState: pushing next unanswered question message, nextQuestionIndex=', nextQuestionIndex, 'nextUnanswered=', nextUnanswered);
        setChatMessages(prev => [...prev, {
          id: generateMessageId(),
          type: 'bot',
          message: `📝 **Question ${nextQuestionIndex + 1}/6** (${nextUnanswered.difficulty.toUpperCase()}) - ${nextUnanswered.timeLimit}s\n\n${nextUnanswered.question}\n\n⏰ **Timer started!** You have ${nextUnanswered.timeLimit} seconds to answer.`
        }]);
      }, 1000);
    } else if (answeredCount >= 6) {
      // All questions answered, show completion
      setTimeout(() => {
        setIsInterviewCompleted(true);
        setIsInterviewStarted(false);
      }, 1000);
    }
    
  // Ensure we use either `id` (from some API responses) or `_id` (Mongoose) so subsequent
  // backend updates have the correct interview identifier.
  setInterviewId(interview.id || interview._id || null);
    setFinalCandidateInfo(interview.candidateInfo);
  };

  // Start chatbot conversation after resume upload
  const startChatbotConversation = async (data) => {
    console.log('🤖 startChatbotConversation called with data:', data);
    setBotIsTyping(true);
    
    // Welcome message
    const welcomeMessage = {
      id: generateMessageId(),
      type: 'bot',
      message: `Hello! 👋 I've successfully processed your resume. Let me review the information I found...`
    };
    
    console.log('📨 Setting welcome message:', welcomeMessage);
    setChatMessages([welcomeMessage]);
    
    setTimeout(() => {
      console.log('⏳ Timeout completed, calling checkMissingInformation');
      checkMissingInformation(data);
    }, 2000);
  };

  // Check for missing or invalid information and collect via chat
  const checkMissingInformation = async (data) => {
      // Only validate and set missing fields here, and only render summary in askToStartInterview
      const required = ['name', 'email', 'phone'];
      // Print extracted fields first
      const extractedFieldsMessage = {
        id: generateMessageId(),
        type: 'bot',
        message: `Here's what I found in your resume:\n\nName: ${data.data.name || 'Not found'}\nEmail: ${data.data.email || 'Not found'}\nPhone: ${data.data.phone || 'Not found'}`
      };
      setChatMessages(prev => [...prev, extractedFieldsMessage]);
      setBotIsTyping(false);

      // Validate fields (single source of truth)
      const isNameInvalid = !data.data.name || 
                           data.data.name.toLowerCase().includes('not found') || 
                           data.data.name.toLowerCase().includes('name not found') ||
                           data.data.name.trim() === '' ||
                           data.data.name.trim().length < 2;
      const isEmailInvalid = !data.data.email || 
                            data.data.email.toLowerCase().includes('not found') ||
                            data.data.email.trim() === '' ||
                            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.data.email.trim());
      const phoneDigits = data.data.phone ? data.data.phone.toString().replace(/\D/g, '') : '';
      const isPhoneInvalid = !data.data.phone || 
                            data.data.phone.toString().toLowerCase().includes('not found') ||
                            data.data.phone.toString().trim() === '' ||
                            phoneDigits.length < 10 ||
                            phoneDigits.length > 15;
      const missing = [];
      if (isNameInvalid) missing.push('name');
      if (isEmailInvalid) missing.push('email');
      if (isPhoneInvalid) missing.push('phone');
      setMissingFields(missing);

    setTimeout(() => {
      console.log('🔄 In setTimeout, missing.length:', missing.length, 'missing:', missing);
      if (missing.length > 0) {
        // Ask for missing/invalid information via chat
        const missingMessage = {
          id: generateMessageId(),
          type: 'bot',
          message: `I need to collect some missing or invalid information. Let me ask you a few questions to complete your profile.`
        };
        setChatMessages(prev => [...prev, missingMessage]);
        setBotIsTyping(false);
        setCurrentMissingFieldIndex(0);
        setTimeout(() => {
          console.log('🎯 About to call askForNextMissingField(0)');
          askForNextMissingField(0, missing);
        }, 2000);
      } else {
        // All information complete, ask to start interview
        console.log('✅ All fields valid, calling askToStartInterview');
        askToStartInterview(data);
      }
    }, 1500);
  };

  // Ask for the next missing field
  const askForNextMissingField = (fieldIndex, missingFieldsArray = missingFields, currentUserInputs = userInputs) => {
    console.log('🎯 askForNextMissingField called with fieldIndex:', fieldIndex, 'missingFieldsArray:', missingFieldsArray, 'currentUserInputs:', currentUserInputs);
    
    if (fieldIndex >= missingFieldsArray.length) {
      // All fields collected, ask to start interview with current user inputs
      console.log('🔄 All fields collected. currentUserInputs:', currentUserInputs, 'extractedData:', extractedData);
      askToStartInterview(extractedData, currentUserInputs);
      return;
    }
    
    const field = missingFieldsArray[fieldIndex];
    setCurrentMissingField(field);
    setCurrentMissingFieldIndex(fieldIndex);
    
    const fieldQuestions = {
      name: "What's your full name?",
      email: "What's your email address?", 
      phone: "What's your phone number?"
    };
    
    const questionMessage = {
      id: Date.now(),
      type: 'bot',
      message: fieldQuestions[field]
    };
    
    setChatMessages(prev => [...prev, questionMessage]);
    setWaitingForUserResponse(true);
    setBotIsTyping(false);
  };

  // Ask user if they want to start the interview
  const askToStartInterview = async (data, currentUserInputs = userInputs) => {
    // Create final merged data with user inputs taking priority
    const finalName = currentUserInputs.name?.trim() || extractedData?.data?.name || 'Not provided';
    const finalEmail = currentUserInputs.email?.trim() || extractedData?.data?.email || 'Not provided';
    const finalPhone = currentUserInputs.phone?.trim() || extractedData?.data?.phone || 'Not provided';
    
    // Debug log to see what values we're using
    console.log('🎯 Final summary values:', { 
      currentUserInputs, 
      extractedData: extractedData?.data, 
      finalName, 
      finalEmail, 
      finalPhone 
    });

    // Save user data to backend
    await saveUserToBackend(finalName, finalEmail, finalPhone);
    
    setBotIsTyping(true);
    const readyMessage = {
      id: generateMessageId(),
      type: 'bot',
      message: `Perfect! ✅ I have all the information I need:

📋 **Your Details:**
• Name: ${finalName}
• Email: ${finalEmail}
• Phone: ${finalPhone}

🎯 **Interview Details:**
• 6 Technical Questions (React/Node.js)
• 2 Easy → 2 Medium → 2 Hard
• Timed: Easy (20s), Medium (60s), Hard (120s)
• AI will generate questions dynamically

Are you ready to start your technical interview? Type "yes", "start", or "ready" to begin!`
    };
    setChatMessages(prev => [...prev, readyMessage]);
    setChatPhase('ready');
    setWaitingForUserResponse(true);
    setBotIsTyping(false);
  };

  // Handle chat input during conversation
  const handleChatInput = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = {
      id: generateMessageId(),
      type: 'user',
      message: chatInput.trim()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    const currentInput = chatInput.trim();
    setChatInput('');
    setWaitingForUserResponse(false);
    
    if (chatPhase === 'collecting' && currentMissingField) {
      console.log('🔍 Processing missing field input. chatPhase:', chatPhase, 'currentMissingField:', currentMissingField, 'currentInput:', currentInput);
      
      // Handle missing field response and update userInputs immediately
      const updatedUserInputs = {
        ...userInputs,
        [currentMissingField]: currentInput
      };
      
      setUserInputs(updatedUserInputs);
      console.log('🔄 Updated userInputs:', updatedUserInputs);
      
      // Also immediately update extractedData to ensure it's in sync
      const updatedExtractedData = {
        ...extractedData,
        data: {
          ...extractedData.data,
          [currentMissingField]: currentInput
        }
      };
      setExtractedData(updatedExtractedData);
      console.log('🔄 Updated extractedData:', updatedExtractedData);
      
      setBotIsTyping(true);
      
      setTimeout(() => {
        const confirmMessage = {
          id: generateMessageId(),
          type: 'bot',
          message: `Got it! ${currentMissingField}: ${currentInput} ✅`
        };
        
        setChatMessages(prev => [...prev, confirmMessage]);
        setBotIsTyping(false);
        
        // Move to next field or finish collection
        setTimeout(() => {
          askForNextMissingField(currentMissingFieldIndex + 1, missingFields, updatedUserInputs);
        }, 1500);
        
      }, 1000);
      
    } else if (chatPhase === 'ready') {
      // Check if user wants to start interview
      const startKeywords = ['yes', 'start', 'ready', 'begin', 'ok', 'sure', 'go'];
      const isStartCommand = startKeywords.some(keyword => 
        currentInput.toLowerCase().includes(keyword)
      );
      
      if (isStartCommand) {
        setBotIsTyping(true);
        
        const startingMessage = {
          id: generateMessageId(),
          type: 'bot',
          message: `Excellent! 🚀 Starting your technical interview now...`
        };
        
        setChatMessages(prev => [...prev, startingMessage]);
        
        // Dispatch final candidate info to store with user inputs prioritized
        const finalName = userInputs.name?.trim() || extractedData?.data?.name || 'Not provided';
        const finalEmail = userInputs.email?.trim() || extractedData?.data?.email || 'Not provided';
        const finalPhone = userInputs.phone?.trim() || extractedData?.data?.phone || 'Not provided';
        
        const finalCandidateInfo = {
          ...extractedData.data,
          name: finalName,
          email: finalEmail, 
          phone: finalPhone
        };
        
        // Save user data to backend before starting interview
        await saveUserToBackend(finalName, finalEmail, finalPhone);
        
        // Store final candidate info for results
        setFinalCandidateInfo(finalCandidateInfo);
        dispatch(setCandidateInfo(finalCandidateInfo));
        
        setTimeout(() => {
          setBotIsTyping(false);
          startInterview();
        }, 2000);
        
      } else {
        // User said something else
        const clarifyMessage = {
          id: generateMessageId(),
          type: 'bot',
          message: `I didn't quite understand. Please type "yes" or "start" when you're ready to begin the interview! 😊`
        };
        
        setChatMessages(prev => [...prev, clarifyMessage]);
        setWaitingForUserResponse(true);
      }
    }
  };

  // Message type styling
  const getMessageStyle = (type) => {
    const baseStyle = {
      padding: '12px',
      borderRadius: '8px',
      marginBottom: '8px',
      whiteSpace: 'pre-wrap'
    };

    switch (type) {
      case 'user':
        return { ...baseStyle, backgroundColor: '#f0f8ff', border: '1px solid #1890ff', textAlign: 'right' };
      case 'bot':
        return { ...baseStyle, backgroundColor: '#f6ffed', border: '1px solid #52c41a' };
      case 'system':
        return { ...baseStyle, backgroundColor: '#fff7e6', border: '1px solid #ffa940', textAlign: 'center' };
      default:
        return baseStyle;
    }
  };



  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Title level={2}>
        <MessageOutlined /> AI Technical Interview System
      </Title>

      {/* Interview Results */}
      <InterviewResultsContainer
        isInterviewCompleted={isInterviewCompleted}
        finalCandidateInfo={finalCandidateInfo}
        allAnswers={allAnswers}
        onReset={() => {
          setIsInterviewCompleted(false);
          setCurrentStep(0);
          setAllAnswers([]);
          setCurrentQuestionIndex(0);
          setChatMessages([]);
          setUserInputs({ name: '', email: '', phone: '' });
          setExtractedData(null);
          setChatPhase('upload');
        }}
      />

      {/* Show interview interface only when not completed */}
      {!isInterviewCompleted && (
        <>
          {/* Step 0: Resume Upload + Email + Continue Option */}
          {currentStep === 0 && (
            <div>
              <ResumeUploadSection
                onFileSelect={handleFileSelect}
                onTextExtracted={handleTextExtracted}
              />

              <Card bordered={false} style={{ marginBottom: 16, borderRadius: 12, boxShadow: '0 6px 18px rgba(15,23,42,0.04)', padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <Title level={4} style={{ margin: 0 }}>Unfinished Interview</Title>
                    <Text type="secondary">Enter your email to check if you have a saved interview you can continue.</Text>

                    <div style={{ marginTop: 12 }}>
                      <Input
                        placeholder="Enter your email to check for unfinished interview"
                        value={resumeEmail}
                        onChange={(e) => setResumeEmail(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && resumeEmail.trim()) {
                            handleResumeEmailCheck();
                          }
                        }}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div style={{ width: 220, textAlign: 'right' }}>
                    <Button 
                      type="primary" 
                      onClick={handleResumeEmailCheck}
                      disabled={!resumeEmail.trim() || !resumeEmail.includes('@')}
                      style={{ width: '100%', borderRadius: 8 }}
                    >
                      Check
                    </Button>
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>We only use your email to locate your saved interview.</Text>
                    </div>
                  </div>
                </div>
                {showContinuePrompt && pendingInterview && (
                  <div style={{ marginTop: 16, borderTop: '1px solid rgba(15,23,42,0.03)', paddingTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <Tag color="orange" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Unfinished interview found for {resumeEmail}
                        </Tag>
                        <div style={{ color: '#6b7280', fontSize: 13 }}>You can resume where you left off.</div>
                      </div>

                      <div style={{ marginLeft: 'auto' }}>
                        <Button type="primary" onClick={() => {
                          setCurrentStep(1);
                          setChatPhase('interview');
                          setIsInterviewStarted(true);
                          restoreInterviewState(pendingInterview);
                        }} style={{ borderRadius: 8, boxShadow: '0 6px 12px rgba(16,24,40,0.04)' }}>
                          Continue Previous Interview
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

              </Card>
            </div>
          )}

          {/* Chat Interface for Data Collection */}
          {currentStep === 1 && !isInterviewStarted && (
            <DataCollectionChat
              ref={chatContainerRef}
              chatMessages={chatMessages}
              botIsTyping={botIsTyping}
              chatInput={chatInput}
              setChatInput={setChatInput}
              handleChatInput={handleChatInput}
              waitingForUserResponse={waitingForUserResponse}
              chatPhase={chatPhase}
              currentMissingField={currentMissingField}
            />
          )}

          {/* Interview Interface */}
          {isInterviewStarted && (
            <InterviewChat
              ref={chatContainerRef}
              isAnswering={isAnswering}
              currentTimer={currentTimer}
              currentQuestionIndex={currentQuestionIndex}
              chatMessages={chatMessages}
              isGeneratingQuestion={isGeneratingQuestion}
              isEvaluating={isEvaluating}
              chatInput={chatInput}
              setChatInput={setChatInput}
              submitAnswer={submitAnswer}
              activeQuestion={activeQuestion}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Chat;