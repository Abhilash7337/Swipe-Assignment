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
import { useIndexedDB } from "../util/useIndexedDB";

const { Title, Text } = Typography;
const { TextArea } = Input;

const Chat = () => {
  const dispatch = useDispatch();
  
  // IndexedDB hook
  const { saveUser, isInitialized, isLoading: dbLoading, error: dbError } = useIndexedDB();
  
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

  // Save user data to IndexedDB
  const saveUserToIndexedDB = async (finalName, finalEmail, finalPhone) => {
    try {
      // Only save if IndexedDB is initialized and we have valid data
      if (!isInitialized || !finalName || !finalEmail || !finalPhone) {
        console.log('⚠️ Skipping IndexedDB save - missing data or DB not ready');
        return;
      }

      // Skip if any field contains "Not provided" or is too short
      if (finalName === 'Not provided' || finalEmail === 'Not provided' || finalPhone === 'Not provided') {
        console.log('⚠️ Skipping IndexedDB save - incomplete user data');
        return;
      }

      // Additional validation
      if (finalName.trim().length < 2) {
        console.log('⚠️ Skipping IndexedDB save - name too short');
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalEmail.trim())) {
        console.log('⚠️ Skipping IndexedDB save - invalid email format');
        return;
      }

      const phoneDigits = finalPhone.replace(/\D/g, '');
      if (phoneDigits.length < 10 || phoneDigits.length > 15) {
        console.log('⚠️ Skipping IndexedDB save - invalid phone number');
        return;
      }

      const userData = {
        name: finalName.trim(),
        email: finalEmail.trim(),
        phone: finalPhone.trim()
      };

      console.log('💾 Saving user to IndexedDB:', userData);
      const result = await saveUser(userData);
      
      if (result.success) {
        console.log(`✅ User ${result.action} in IndexedDB:`, result.user.email);
      }
    } catch (error) {
      console.error('❌ Failed to save user to IndexedDB:', error);
      // Don't throw error - just log it so the interview flow continues
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
        message: `🎯 **Your Technical Interview Starts Now!**

**Format Reminder:**
• 6 Questions Total: 2 Easy → 2 Medium → 2 Hard
• Questions generated dynamically by AI  
• Timers: Easy (20s), Medium (60s), Hard (120s)
• Auto-submit when time expires

🚀 Generating your first question...`
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
  const handleTextExtracted = (result) => {
    console.log('🎯 Text Extraction Result:', result);
    
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
      
      // Switch to chat interface
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

    // Save user data to IndexedDB
    await saveUserToIndexedDB(finalName, finalEmail, finalPhone);
    
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
        
        // Save user data to IndexedDB before starting interview
        await saveUserToIndexedDB(finalName, finalEmail, finalPhone);
        
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