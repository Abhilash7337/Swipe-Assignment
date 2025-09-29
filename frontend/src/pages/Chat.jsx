import React, { useState, useEffect, useRef } from "react";
import { Modal } from "antd";
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
  // Welcome Back modal state
  const [showWelcomeBackModal, setShowWelcomeBackModal] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);
  const [processingNewResume, setProcessingNewResume] = useState(false);
    // Helper to get current user's email for session key
    const getSessionEmail = () => {
      // Prefer userInputs, fallback to extractedData
      return userInputs.email?.trim() || extractedData?.data?.email?.trim() || null;
    };
  const [countdown, setCountdown] = useState(3);
  const dispatch = useDispatch();
  
  // Basic states
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
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

  // Session persistence with backend
  useEffect(() => {
    const email = getSessionEmail();
    if (!email) return;
    
    const sessionData = {
      isInterviewStarted,
      isInterviewCompleted,
      currentQuestionIndex,
      currentTimer,
      isAnswering,
      isEvaluating,
      isGeneratingQuestion,
      activeQuestion,
      allQuestionsAsked,
      allAnswers,
      chatMessages,
      userInputs,
      finalCandidateInfo,
      extractedData,
      uploadedFile,
      currentStep,
      chatPhase,
      missingFields,
      currentMissingField,
      currentMissingFieldIndex
    };
    
    apiService.saveSession(email, sessionData).catch(error => {
      console.error('Failed to save session:', error);
    });
  }, [
    isInterviewStarted, isInterviewCompleted, currentQuestionIndex, currentTimer,
    isAnswering, isEvaluating, isGeneratingQuestion, activeQuestion,
    allQuestionsAsked, allAnswers, chatMessages, userInputs, finalCandidateInfo,
    extractedData, uploadedFile, currentStep, chatPhase, missingFields, currentMissingField, currentMissingFieldIndex
  ]);

  // Restore interview state from localStorage on mount
  // (Removed: now handled by above effect)

  // Welcome Back modal countdown logic
  useEffect(() => {
    if (showWelcomeBackModal) {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setShowWelcomeBackModal(false);
        // Resume interview if it was in progress
        if (isInterviewStarted && !isInterviewCompleted && chatPhase === 'interview') {
          setIsAnswering(true);
          // Restore timer if needed
          if (currentTimer > 0) {
            setCurrentTimer(currentTimer);
          }
        }
      }
    }
  }, [showWelcomeBackModal, countdown, isInterviewStarted, isInterviewCompleted, chatPhase, currentTimer]);

  // Auto scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Start interview process
  const startInterview = async () => {
    try {
      setIsInterviewStarted(true);
      setChatPhase('interview');
      setCurrentQuestionIndex(0);
      setAllQuestionsAsked([]);
      setAllAnswers([]);
      // Save session state immediately after starting interview
      const email = getSessionEmail();
      if (email) {
        const interviewState = {
          isInterviewStarted: true,
          isInterviewCompleted,
          currentQuestionIndex: 0,
          currentTimer,
          isAnswering,
          isEvaluating,
          isGeneratingQuestion,
          activeQuestion,
          allQuestionsAsked: [],
          allAnswers: [],
          chatMessages,
          userInputs,
          finalCandidateInfo,
          extractedData,
          uploadedFile,
          currentStep,
          chatPhase: 'interview',
          missingFields,
          currentMissingField,
          currentMissingFieldIndex
        };
        // Save session to backend
        const sessionData = {
          isInterviewStarted: true,
          isInterviewCompleted,
          currentQuestionIndex: 0,
          currentTimer,
          isAnswering,
          isEvaluating,
          isGeneratingQuestion,
          activeQuestion,
          allQuestionsAsked: [],
          allAnswers: [],
          chatMessages,
          userInputs,
          finalCandidateInfo,
          extractedData,
          uploadedFile,
          currentStep,
          chatPhase: 'interview',
          missingFields,
          currentMissingField,
          currentMissingFieldIndex
        };
        
        apiService.saveSession(email, sessionData).then(() => {
          console.log('✅ Interview session state saved to backend');
        }).catch(error => {
          console.error('Failed to save session to backend:', error);
        });
      }
      const startMessage = {
        id: generateMessageId(),
        type: 'bot',
        message: `🎯 **Your Technical Interview Starts Now!**\n\n**Format Reminder:**\n• 6 Questions Total: 2 Easy → 2 Medium → 2 Hard\n• Questions generated dynamically by AI  \n• Timers: Easy (20s), Medium (60s), Hard (120s)\n• Auto-submit when time expires\n\n🚀 Generating your first question...`
      };
      
      setChatMessages([startMessage]);
      setWaitingForUserResponse(false);
      
      // Generate and show first question
      setTimeout(() => {
        generateAndShowNextQuestion();
      }, 3000);
      
    } catch (error) {
      console.error('Failed to start interview:', error);
    }
  };

  // Generate and show the next question
  const generateAndShowNextQuestion = async () => {
    try {
      setIsGeneratingQuestion(true);
      
      const questionNumber = currentQuestionIndex + 1;
      const difficulty = difficultySequence[currentQuestionIndex];
      const timeLimit = timeSequence[currentQuestionIndex];
      
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
      
      // Show the question
      const questionMessage = {
        id: generateMessageId(),
        type: 'bot',
        message: `📝 **Question ${questionNumber}/6** (${difficulty.toUpperCase()}) - ${timeLimit}s

${questionText}

⏰ **Timer started!** You have ${timeLimit} seconds to answer.`
      };
      
      setChatMessages(prev => [...prev.slice(0, -1), questionMessage]); // Replace generating message
      
      // Start timer and answering mode
      setCurrentTimer(timeLimit);
      setIsAnswering(true);
      setQuestionStartTime(Date.now());
      setIsGeneratingQuestion(false);
      
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

      // Store answer data
      const answerData = {
        ...activeQuestion,
        answered: true,
        answer: answer,
        score: evaluation.score,
        timeTaken: timeTaken,
        feedback: evaluation.feedback,
        timedOut: timedOut
      };
      
      setAllAnswers(prev => [...prev, answerData]);

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
          setCurrentQuestionIndex(prev => prev + 1);
          setTimeout(() => {
            generateAndShowNextQuestion();
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
      
      // Check if user already has complete information in backend
      const email = data.data.email;
      if (email) {
        try {
          const sessionData = await apiService.getSession(email);
          console.log('🔍 Checking existing session for email:', email, 'sessionData:', sessionData);
          
          if (sessionData && sessionData.userInputs && 
              sessionData.userInputs.name && sessionData.userInputs.email && sessionData.userInputs.phone) {
            
            // User already has complete information, skip data collection
            console.log('✅ User already has complete information, skipping data collection', sessionData.userInputs);
            setCurrentStep(1);
            setChatPhase('ready');
            setUserInputs(sessionData.userInputs);
            setFinalCandidateInfo(sessionData.finalCandidateInfo || sessionData.userInputs);
            
            // Show ready message
            const readyMessage = {
              id: Date.now(),
              type: 'bot',
              message: `✅ **Welcome Back!**\n\n**Your Profile:**\n• Name: ${sessionData.userInputs.name}\n• Email: ${sessionData.userInputs.email}\n• Phone: ${sessionData.userInputs.phone}\n\n🎯 Ready to start your technical interview?`
            };
            setChatMessages([readyMessage]);
            setProcessingNewResume(false);
            return;
          } else {
            console.log('ℹ️ Session found but incomplete user data:', sessionData?.userInputs);
          }
        } catch (error) {
          console.log('ℹ️ No existing session found, proceeding with data collection', error);
        }
      }
      
      // Switch to chat interface for data collection
      console.log('🔄 Setting currentStep to 1');
      setCurrentStep(1);
      setChatPhase('collecting');
      
      // Start chatbot conversation
      console.log('⏰ Starting timeout for chatbot conversation');
      setTimeout(() => {
        // Only start chatbot conversation if no session was restored
        if (!sessionRestored) {
          console.log('🤖 Starting chatbot conversation');
          startChatbotConversation(data);
        } else {
          console.log('🔄 Session was restored, skipping chatbot conversation');
        }
      }, 1000);
    } else {
      console.error('❌ Text extraction failed:', result.error);
    }
    
    // Reset the flag after processing
    setProcessingNewResume(false);
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

  // Session restoration from backend
  useEffect(() => {
    const email = userInputs.email?.trim() || extractedData?.data?.email?.trim();
    if (!email || processingNewResume) return; // Don't restore session if processing new resume
    
    apiService.getSession(email).then((sessionData) => {
      if (sessionData && !sessionData.isInterviewCompleted && 
          (sessionData.isInterviewStarted || 
           (sessionData.allQuestionsAsked && sessionData.allQuestionsAsked.length > 0) ||
           (sessionData.userInputs && sessionData.userInputs.name && sessionData.userInputs.email && sessionData.userInputs.phone) ||
           sessionData.chatPhase === 'collecting' || sessionData.chatPhase === 'ready')) {
        
        // Restore all state from session
        setIsInterviewCompleted(sessionData.isInterviewCompleted);
        setCurrentQuestionIndex(sessionData.currentQuestionIndex);
        setAllQuestionsAsked(sessionData.allQuestionsAsked);
        setAllAnswers(sessionData.allAnswers);
        setChatMessages(sessionData.chatMessages);
        setUserInputs(sessionData.userInputs);
        setFinalCandidateInfo(sessionData.finalCandidateInfo);
        setExtractedData(sessionData.extractedData);
        setUploadedFile(sessionData.uploadedFile);
        setCurrentStep(sessionData.currentStep);
        setChatPhase(sessionData.chatPhase);
        
        // Only restore interview-specific states if we're actually in the interview phase
        if (sessionData.chatPhase === 'interview') {
          setIsInterviewStarted(sessionData.isInterviewStarted);
          setCurrentTimer(sessionData.currentTimer);
          setIsAnswering(sessionData.isAnswering);
          setIsEvaluating(sessionData.isEvaluating);
          setIsGeneratingQuestion(sessionData.isGeneratingQuestion);
          setActiveQuestion(sessionData.activeQuestion);
        } else {
          // Reset interview states if not in interview phase
          setIsInterviewStarted(false);
          setCurrentTimer(0);
          setIsAnswering(false);
          setIsEvaluating(false);
          setIsGeneratingQuestion(false);
          setActiveQuestion(null);
          
          // For collecting phase, set appropriate states
          if (sessionData.chatPhase === 'collecting') {
            setWaitingForUserResponse(true);
          }
        }
        
        setMissingFields(sessionData.missingFields);
        setCurrentMissingField(sessionData.currentMissingField);
        setCurrentMissingFieldIndex(sessionData.currentMissingFieldIndex);
        setShowWelcomeBackModal(true);
        setSessionRestored(true);
        
        // If we're in collecting phase and have a current missing field, we need to display the question
        if (sessionData.chatPhase === 'collecting' && sessionData.currentMissingField && sessionData.chatMessages) {
          // Check if the last message is a question for the current missing field
          const lastMessage = sessionData.chatMessages[sessionData.chatMessages.length - 1];
          const fieldQuestions = {
            name: "What's your full name?",
            email: "What's your email address?", 
            phone: "What's your phone number?"
          };
          
          // If the last message is not the current question, add it
          if (!lastMessage || !lastMessage.message.includes(fieldQuestions[sessionData.currentMissingField])) {
            const questionMessage = {
              id: Date.now(),
              type: 'bot',
              message: fieldQuestions[sessionData.currentMissingField]
            };
            
            setTimeout(() => {
              setChatMessages(prev => [...prev, questionMessage]);
              setWaitingForUserResponse(true);
            }, 3000); // After welcome modal closes
          } else {
            // Question is already there, just ensure we're waiting for response
            setTimeout(() => {
              setWaitingForUserResponse(true);
            }, 3000);
          }
        }
        
        // Check if we have complete user information and should skip data collection
        if (sessionData.userInputs && sessionData.userInputs.name && sessionData.userInputs.email && sessionData.userInputs.phone) {
          // We have complete information, set to ready phase if not already in interview
          if (sessionData.chatPhase !== 'interview') {
            setChatPhase('ready');
            setCurrentStep(1);
            
            // Show a message asking if they want to start the interview
            setTimeout(() => {
              const readyMessage = {
                id: Date.now(),
                type: 'bot',
                message: `✅ **Profile Complete!**\n\n**Your Information:**\n• Name: ${sessionData.userInputs.name}\n• Email: ${sessionData.userInputs.email}\n• Phone: ${sessionData.userInputs.phone}\n\n🎯 Ready to start your technical interview?`
              };
              setChatMessages(prev => [...prev, readyMessage]);
            }, 3000); // After welcome modal closes
          }
        }
        
        console.log('✅ Session restored from backend for', email);
      } else {
        setSessionRestored(false);
        console.log('ℹ️ No session to restore for', email);
      }
    }).catch(error => {
      console.error('Failed to restore session:', error);
      setSessionRestored(false);
    });
  }, [extractedData?.data?.email, userInputs.email, processingNewResume]);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Welcome Back Modal */}
      {showWelcomeBackModal && (
        <Modal
          open={showWelcomeBackModal}
          footer={null}
          closable={false}
          centered
        >
          <Title level={3}>Welcome Back!</Title>
          <Text>Resuming your interview in {countdown}...</Text>
        </Modal>
      )}

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
          {/* Step 0: Resume Upload */}
          {currentStep === 0 && (
            <ResumeUploadSection
              onFileSelect={handleFileSelect}
              onTextExtracted={handleTextExtracted}
            />
          )}

          {/* Step 1: Chat Interface for Data Collection */}
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