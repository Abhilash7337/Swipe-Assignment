import { useDispatch } from 'react-redux';
import { setQuestions, resetInterview } from '../../feat/intr';
import axios from 'axios';

// InterviewEngine - handles AI question generation and interview flow
const InterviewEngine = ({ candidateInfo, resumeText, onInterviewComplete, onQuestionGenerated, onTimerExpired }) => {
  const dispatch = useDispatch();

  // Question pools for React/Node Full Stack role - Simple questions with 1-word answers
  const questionPools = {
    easy: [
      "What library is used for building user interfaces in React? (Answer in 1 word)",
      "What keyword is used to declare a constant in JavaScript? (Answer in 1 word)",
      "What runtime environment allows JavaScript to run on the server? (Answer in 1 word)",
      "What does JSX stand for? (Answer in 3 words max)",
      "What HTTP method is used to retrieve data? (Answer in 1 word)",
      "What operator checks for strict equality in JavaScript? (Answer in 1 symbol)",
      "What package manager is commonly used with Node.js? (Answer in 1 word)",
      "What hook is used to manage component state in React? (Answer in 1 word)"
    ],
    medium: [
      "Which React Hook manages side effects? (Answer in 1 word)",
      "What method is used to handle asynchronous operations? (Answer in 1 word)",
      "What library is commonly used for global state management in React? (Answer in 1 word)",
      "What Express.js concept processes requests before reaching routes? (Answer in 1 word)",
      "What NoSQL database is document-oriented? (Answer in 1 word)",
      "What token type is commonly used for authentication? (Answer in 1 word)",
      "What browser policy restricts cross-origin requests? (Answer in 1 word)",
      "What method runs after component mounts? (Answer in 1 word)"
    ],
    hard: [
      "What protocol enables real-time bidirectional communication? (Answer in 1 word)",
      "What in-memory data store is used for caching? (Answer in 1 word)",
      "What technique splits code into smaller bundles? (Answer in 1-2 words)",
      "What architecture pattern breaks applications into independent services? (Answer in 1 word)",
      "What process automatically restarts failed Node.js applications? (Answer in 1 word)",
      "What database feature ensures data consistency across operations? (Answer in 1 word)"
    ]
  };

  const difficultyConfig = {
    easy: { timeLimit: 20, points: 10 },
    medium: { timeLimit: 60, points: 20 },
    hard: { timeLimit: 120, points: 30 }
  };

  // Generate a single question from predefined pool based on difficulty
  const generateQuestion = async (difficulty, questionNumber, previousQuestions = []) => {
    const pool = questionPools[difficulty];
    if (!pool || pool.length === 0) {
      throw new Error(`No questions available for difficulty: ${difficulty}`);
    }
    
    // Get questions that haven't been used yet
    const usedQuestions = previousQuestions.map(q => q.toLowerCase().trim());
    const availableQuestions = pool.filter(q => 
      !usedQuestions.includes(q.toLowerCase().trim())
    );
    
    // If all questions from this difficulty have been used, start over
    const questionsToChooseFrom = availableQuestions.length > 0 ? availableQuestions : pool;
    
    // Select a random question from available ones
    const randomIndex = Math.floor(Math.random() * questionsToChooseFrom.length);
    return questionsToChooseFrom[randomIndex];
  };

  // Generate a complete set of 6 questions (2 easy, 2 medium, 2 hard)
  const generateQuestionSet = async () => {
    try {
      const questionSet = [];
      const difficulties = ['easy', 'easy', 'medium', 'medium', 'hard', 'hard'];
      const previousQuestions = [];
      
      for (let i = 0; i < 6; i++) {
        const difficulty = difficulties[i];
        const questionNumber = i + 1;
        
        // Generate question from predefined pool
        const questionText = await generateQuestion(difficulty, questionNumber, previousQuestions);
        
        const question = {
          id: i + 1,
          question: questionText,
          difficulty: difficulty,
          timeLimit: difficultyConfig[difficulty].timeLimit,
          points: difficultyConfig[difficulty].points,
          answered: false,
          answer: null,
          score: null,
          timeTaken: null,
          feedback: null
        };

        questionSet.push(question);
        previousQuestions.push(questionText);
        
        // Add small delay to avoid rate limiting
        if (i < 5) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      return questionSet;
    } catch (error) {
      console.error('Question generation failed:', error);
      throw error;
    }
  };

  // Check available AI services (Gemini and HuggingFace)
  const getAvailableAIService = () => {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const huggingFaceKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
    
    // Check if API keys are available
    const hasGemini = geminiKey && geminiKey !== 'your_gemini_api_key_here';
    const hasHuggingFace = huggingFaceKey && huggingFaceKey !== 'your_huggingface_api_key_here';
    
    if (!hasGemini && !hasHuggingFace) {
      throw new Error('No AI service available. Please configure either VITE_GEMINI_API_KEY or VITE_HUGGINGFACE_API_KEY in your .env file.');
    }
    
    return {
      primary: hasGemini ? 'gemini' : 'huggingface',
      hasGemini,
      hasHuggingFace
    };
  };

  // HuggingFace API evaluation
  const judgeAnswerWithHuggingFace = async (question, answer, difficulty, timeTaken) => {
    const huggingFaceKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
    
    const prompt = `Question: "${question}"\nCandidate Answer: "${answer}"\nDifficulty: ${difficulty}\nTime Taken: ${timeTaken} seconds\n\nEvaluate this answer on a scale of 1-10 and provide brief feedback. Format response as JSON: {"score": X, "feedback": "comment"}`;

    try {
      const response = await axios.post(
        import.meta.env.VITE_HUGGINGFACE_MODEL_URL || 'https://api-inference.huggingface.co/models/gpt2',
        { inputs: prompt },
        {
          headers: {
            'Authorization': `Bearer ${huggingFaceKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Parse the response and extract score/feedback
      let evaluation = { score: 5, feedback: "Evaluation completed" };
      
      try {
        const aiResponse = response.data[0]?.generated_text || '';
        const jsonMatch = aiResponse.match(/\{.*\}/);
        if (jsonMatch) {
          evaluation = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.warn('Failed to parse HuggingFace response:', parseError);
      }

      return {
        score: Math.max(1, Math.min(10, evaluation.score)),
        accuracy: Math.max(0, Math.min(100, evaluation.score * 10)),
        feedback: evaluation.feedback || "Evaluation completed"
      };
    } catch (error) {
      throw new Error(`HuggingFace evaluation failed: ${error.message}`);
    }
  };

  const judgeAnswer = async (question, answer, difficulty, timeTaken) => {
    const aiServices = getAvailableAIService();
    
    try {
      // Try Gemini first if available
      if (aiServices.hasGemini) {
        try {
          return await judgeAnswerWithGemini(question, answer, difficulty, timeTaken);
        } catch (geminiError) {
          console.error('Gemini API evaluation failed:', geminiError);
          
          // If HuggingFace is available, try it as fallback
          if (aiServices.hasHuggingFace) {

            return await judgeAnswerWithHuggingFace(question, answer, difficulty, timeTaken);
          }
          throw geminiError;
        }
      }
      
      // If Gemini not available but HuggingFace is, use HuggingFace
      if (aiServices.hasHuggingFace) {
        return await judgeAnswerWithHuggingFace(question, answer, difficulty, timeTaken);
      }

      throw new Error('No AI service available');
      
    } catch (error) {
      console.error('All AI services failed:', error);
      
      // Final fallback to local scoring
      const fallbackScore = generateFallbackScore(answer, difficulty, timeTaken);
      
      return {
        score: fallbackScore.score,
        accuracy: fallbackScore.accuracy,
        feedback: `🤖 AI services unavailable. Estimated score based on answer length and time: ${fallbackScore.feedback}`,
        error: "service_unavailable"
      };
    }
  };

  const judgeAnswerWithGemini = async (question, answer, difficulty, timeTaken) => {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    const difficultyContext = {
      easy: "This is a basic/fundamental question. A good answer should demonstrate basic understanding.",
      medium: "This is an intermediate question. A good answer should show practical knowledge and some depth.",
      hard: "This is an advanced question. A good answer should demonstrate deep understanding, system design thinking, and real-world experience."
    };

    const requestData = {
      contents: [{
        parts: [{
          text: `Rate answer: "${answer}" for question: "${question}". Scale 1-10. JSON only:
{"score":8,"feedback":"brief comment"}`
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 30
      }
    };

    try {

      
      // Add delay to prevent rate limiting (1 second between requests)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await axios.post(
        `${import.meta.env.VITE_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent'}?key=${geminiKey}`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
        throw new Error('Invalid response format from Gemini');
      }

      const aiResponse = response.data.candidates[0].content.parts[0].text;

      
      let cleanResponse = aiResponse.trim();
      
      // Clean markdown formatting
      if (cleanResponse.includes('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      if (cleanResponse.includes('```')) {
        cleanResponse = cleanResponse.replace(/```/g, '');
      }
      
      // Try to parse JSON, but if it fails, extract values using regex
      let evaluation;
      try {
        evaluation = JSON.parse(cleanResponse);
      } catch (parseError) {
        console.warn('JSON parse failed, trying regex extraction', parseError);
        
        // Extract score using regex
        const scoreMatch = cleanResponse.match(/"score"\s*:\s*(\d+)/);
        const feedbackMatch = cleanResponse.match(/"feedback"\s*:\s*"([^"]+)"/);
        
        evaluation = {
          score: scoreMatch ? parseInt(scoreMatch[1]) : 5,
          feedback: feedbackMatch ? feedbackMatch[1] : "Evaluation completed"
        };
        

      }
      
      // Validate AI response
      if (!evaluation.score) {
        evaluation.score = 5; // Default score if missing
      }
      if (!evaluation.feedback) {
        evaluation.feedback = "Brief evaluation completed";
      }
      
      return {
        score: Math.max(1, Math.min(10, evaluation.score)),
        accuracy: Math.max(0, Math.min(100, evaluation.accuracy || evaluation.score * 10)),
        comment: evaluation.comment || "AI evaluation completed",
        feedback: evaluation.feedback
      };

    } catch (error) {
      console.error('Gemini evaluation failed:', error);
      
      // Handle rate limiting with retry
      if (error.response?.status === 429) {

        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Try one more time after waiting
        try {
          const retryResponse = await axios.post(
            `${import.meta.env.VITE_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent'}?key=${geminiKey}`,
            requestData,
            {
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (retryResponse.data && retryResponse.data.candidates && retryResponse.data.candidates[0]) {
            const retryAiResponse = retryResponse.data.candidates[0].content.parts[0].text;

            
            // Use same parsing logic as before
            let cleanResponse = retryAiResponse.trim();
            if (cleanResponse.includes('```json')) {
              cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            }
            if (cleanResponse.includes('```')) {
              cleanResponse = cleanResponse.replace(/```/g, '');
            }
            
            let evaluation;
            try {
              evaluation = JSON.parse(cleanResponse);
            } catch (parseError) {
              const scoreMatch = cleanResponse.match(/"score"\s*:\s*(\d+)/);
              const feedbackMatch = cleanResponse.match(/"feedback"\s*:\s*"([^"]+)"/);
              evaluation = {
                score: scoreMatch ? parseInt(scoreMatch[1]) : 5,
                feedback: feedbackMatch ? feedbackMatch[1] : "Evaluation completed after retry"
              };
            }
            
            return {
              score: Math.max(1, Math.min(10, evaluation.score)),
              accuracy: Math.max(0, Math.min(100, evaluation.accuracy || evaluation.score * 10)),
              comment: evaluation.comment || "AI evaluation completed",
              feedback: evaluation.feedback
            };
          }
        } catch (retryError) {
          console.error('Retry also failed:', retryError);
        }
        
        throw new Error('Gemini rate limit exceeded. Please wait and try again.');
      } else if (error.response?.status === 400) {
        throw new Error('Invalid Gemini API request. Please check your input.');
      } else if (error.response?.status === 403) {
        throw new Error('Gemini API access denied. Please check your API key.');
      } else if (error.message.includes('JSON')) {
        throw new Error('Failed to parse AI response. The AI returned an invalid format.');
      } else {
        throw new Error(`Gemini evaluation failed: ${error.message}`);
      }
    }
  };

  const calculateFinalScore = (questions) => {
    const totalQuestions = questions.length;
    const totalPossiblePoints = questions.reduce((sum, q) => sum + difficultyConfig[q.difficulty].points, 0);
    const earnedPoints = questions.reduce((sum, q) => sum + (q.score * difficultyConfig[q.difficulty].points / 10), 0);
    
    const averageScore = questions.reduce((sum, q) => sum + q.score, 0) / totalQuestions;
    const percentageScore = (earnedPoints / totalPossiblePoints) * 100;
    
    const difficultyBreakdown = {
      easy: questions.filter(q => q.difficulty === 'easy'),
      medium: questions.filter(q => q.difficulty === 'medium'),
      hard: questions.filter(q => q.difficulty === 'hard')
    };

    return {
      averageScore: Math.round(averageScore * 10) / 10,
      percentageScore: Math.round(percentageScore),
      totalQuestions,
      earnedPoints: Math.round(earnedPoints),
      totalPossiblePoints,
      difficultyBreakdown,
      questions
    };
  };

  const generateCandidateSummary = async (finalResults) => {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!geminiKey || geminiKey === 'your_gemini_api_key_here') {
      // Provide a simple fallback summary if no API key
      return `Interview Complete - Score: ${finalResults.averageScore}/10 (${finalResults.percentageScore}%). Answered ${finalResults.totalQuestions} questions with ${finalResults.earnedPoints}/${finalResults.totalPossiblePoints} points.`;
    }

    const requestData = {
      contents: [{
        parts: [{
          text: `Interview summary: Score ${finalResults.averageScore}/10. Brief 1-sentence assessment:`
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 50
      }
    };

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent'}?key=${geminiKey}`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.candidates && response.data.candidates[0]) {
        return response.data.candidates[0].content.parts[0].text.trim();
      } else {
        return `Interview Complete - Score: ${finalResults.averageScore}/10 (${finalResults.percentageScore}%). Good effort on the technical assessment.`;
      }
    } catch (error) {
      console.error('Summary generation failed:', error);
      return `Interview Complete - Score: ${finalResults.averageScore}/10 (${finalResults.percentageScore}%). Answered ${finalResults.totalQuestions} questions.`;
    }
  };

  const startInterview = async () => {
    try {
      const questions = await generateQuestionSet();
      return { success: true, questions };
    } catch (error) {
      console.error('Failed to start interview:', error);
      return { success: false, error: error.message };
    }
  };

  const endInterview = async (questions) => {
    const finalResults = calculateFinalScore(questions);
    const summary = await generateCandidateSummary(finalResults);
    
    const completeResults = {
      ...finalResults,
      summary,
      completed: true,
      timestamp: new Date().toISOString()
    };

    if (onInterviewComplete) {
      onInterviewComplete(completeResults);
    }
    dispatch(resetInterview());
    
    return completeResults;
  };

  return {
    generateQuestionSet,
    generateQuestion,
    judgeAnswer,
    startInterview,
    endInterview,
    calculateFinalScore,
    generateCandidateSummary,
    difficultyConfig
  };
};

// Fallback scoring function when AI service is unavailable
const generateFallbackScore = (answer, difficulty, timeTaken) => {
  const answerLength = answer?.length || 0;
  const words = answer?.split(' ').filter(word => word.length > 0).length || 0;
  
  // Base score calculation
  let baseScore = 5; // Start with 5/10
  
  // Adjust based on answer length and quality indicators
  if (answerLength > 100) baseScore += 2; // Decent length answer
  if (answerLength > 200) baseScore += 1; // Comprehensive answer
  if (words > 20) baseScore += 1; // Good word count
  
  // Adjust based on common quality indicators
  const qualityIndicators = [
    'function', 'const', 'let', 'var', 'return', 'if', 'else', 
    'for', 'while', 'class', 'component', 'react', 'javascript',
    'algorithm', 'data', 'structure', 'api', 'database'
  ];
  
  const hasQualityIndicators = qualityIndicators.some(indicator => 
    answer.toLowerCase().includes(indicator)
  );
  
  if (hasQualityIndicators) baseScore += 1;
  
  // Adjust based on difficulty and time taken
  const difficultyMultipliers = { easy: 0.8, medium: 1.0, hard: 1.2 };
  const difficultyMultiplier = difficultyMultipliers[difficulty] || 1.0;
  
  // Time bonus/penalty
  const timeAllowed = { easy: 20, medium: 60, hard: 120 }[difficulty] || 60;
  const timeRatio = timeTaken / timeAllowed;
  
  if (timeRatio < 0.5) baseScore += 0.5; // Quick response bonus
  else if (timeRatio > 0.9) baseScore -= 0.5; // Slow response penalty
  
  // Apply difficulty multiplier
  let finalScore = Math.round(baseScore * difficultyMultiplier);
  
  // Ensure score is within bounds
  finalScore = Math.max(1, Math.min(10, finalScore));
  
  const accuracy = Math.round((finalScore / 10) * 100);
  
  const feedback = answerLength > 50 
    ? "Good attempt with reasonable detail. Answer shows understanding of the topic."
    : answerLength > 20
    ? "Basic answer provided. Could benefit from more elaboration and examples."
    : "Very brief answer. Consider providing more detailed explanations and examples.";
  
  return {
    score: finalScore,
    accuracy: accuracy,
    feedback: feedback
  };
};

export default InterviewEngine;