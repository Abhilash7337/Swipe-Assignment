import React, { useState } from 'react';
import {
  Card,
  Input,
  Button,
  List,
  Typography,
  Space,
  Divider,
  Alert,
  Tag,
  Radio,
  Spin
} from 'antd';
import {
  SendOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { TextArea } = Input;
const { Text, Title } = Typography;

const ApiTest = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini');
  const [apiStatus, setApiStatus] = useState({
    gemini: 'idle',
    openai: 'idle'
  });

  // Clear all messages
  const clearMessages = () => {
    setMessages([]);
  };

  // Test API connection
  const testConnection = async () => {
    setIsLoading(true);
    
    const testMessage = {
      id: Date.now(),
      type: 'user',
      content: `🔗 Testing ${selectedModel.toUpperCase()} API connection...`,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setMessages(prev => [...prev, testMessage]);
    
    try {
      let result;
      
      if (selectedModel === 'gemini') {
        result = await testGeminiConnection();
      } else {
        result = await testOpenAIConnection();
      }

      setApiStatus(prev => ({
        ...prev,
        [selectedModel]: 'success'
      }));

      const successMessage = {
        id: Date.now() + 1,
        type: 'success',
        content: `✅ ${selectedModel.toUpperCase()} API Connection Successful!\n\n${result.content}`,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prev => [...prev, successMessage]);
      
    } catch (error) {
      console.error(`${selectedModel} connection test failed:`, error);
      
      setApiStatus(prev => ({
        ...prev,
        [selectedModel]: 'error'
      }));

      let errorMessage = `❌ ${selectedModel.toUpperCase()} API Connection Failed: `;
      if (error.response?.status === 401) {
        errorMessage += 'Invalid API key or unauthorized access.';
      } else if (error.response?.status === 429) {
        errorMessage += 'Rate limit exceeded.';
      } else if (error.message.includes('API key not configured')) {
        errorMessage += 'API key not configured in environment variables.';
      } else {
        errorMessage += error.message;
      }

      const errorMsg = {
        id: Date.now() + 1,
        type: 'error',
        content: errorMessage,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Test Gemini API connection
  const testGeminiConnection = async () => {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!geminiKey || geminiKey === 'your_gemini_api_key_here') {
      throw new Error('Google Gemini API key not configured in environment variables');
    }

    const requestData = {
      contents: [{
        parts: [{
          text: "Hello! This is a connection test. Please respond with a brief confirmation message."
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 50
      }
    };

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.candidates && response.data.candidates[0]) {
      const aiResponse = response.data.candidates[0].content.parts[0].text;
      return {
        content: `**Model:** Gemini 2.0 Flash (Free)\n**Response:** ${aiResponse}`
      };
    } else {
      throw new Error('Invalid Gemini API response format');
    }
  };

  // Test OpenAI API connection  
  const testOpenAIConnection = async () => {
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!openaiKey || openaiKey === 'your_openai_api_key_here') {
      throw new Error('OpenAI API key not configured in environment variables');
    }

    const requestData = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Respond briefly to connection tests.'
        },
        {
          role: 'user',
          content: 'Hello! This is a connection test. Please respond with a brief confirmation message.'
        }
      ],
      max_tokens: 50,
      temperature: 0.7
    };

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.choices && response.data.choices[0]) {
      const aiResponse = response.data.choices[0].message.content.trim();
      const usage = response.data.usage;
      return {
        content: `**Model:** GPT-3.5-turbo (Paid)\n**Response:** ${aiResponse}\n**Tokens Used:** ${usage.total_tokens}`
      };
    } else {
      throw new Error('Invalid OpenAI API response format');
    }
  };

  // Send message to selected AI model
  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    const currentInput = inputValue.trim();
    setInputValue('');

    try {
      let result;
      
      if (selectedModel === 'gemini') {
        result = await sendMessageWithGemini(currentInput);
      } else {
        result = await sendMessageWithOpenAI(currentInput);
      }

      const aiResponse = {
        id: Date.now() + 1,
        type: 'ai',
        content: result.content,
        timestamp: new Date().toLocaleTimeString(),
        usage: result.usage,
        model: selectedModel
      };
      setMessages(prev => [...prev, aiResponse]);
      
    } catch (error) {
      console.error('Send message failed:', error);
      
      let errorMessage = `Failed to get ${selectedModel.toUpperCase()} response: `;
      if (error.response?.status === 429) {
        errorMessage += 'Rate limit exceeded. Please wait and try again.';
      } else if (error.response?.status === 401) {
        errorMessage += 'Invalid API key.';
      } else if (error.response?.status === 403) {
        errorMessage += 'API access denied.';
      } else {
        errorMessage += error.message;
      }

      const errorMsg = {
        id: Date.now() + 1,
        type: 'error',
        content: '❌ ' + errorMessage,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Send message with Gemini
  const sendMessageWithGemini = async (message) => {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!geminiKey || geminiKey === 'your_gemini_api_key_here') {
      throw new Error('Google Gemini API key not configured');
    }

    const requestData = {
      contents: [{
        parts: [{
          text: message
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 200
      }
    };

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.candidates && response.data.candidates[0]) {
      const aiResponse = response.data.candidates[0].content.parts[0].text;
      return {
        content: aiResponse,
        usage: response.data.usageMetadata || null
      };
    } else {
      throw new Error('Invalid Gemini API response format');
    }
  };

  // Send message with OpenAI
  const sendMessageWithOpenAI = async (message) => {
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!openaiKey || openaiKey === 'your_openai_api_key_here') {
      throw new Error('OpenAI API key not configured');
    }

    const requestData = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful technical assistant. Provide clear, concise responses.'
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    };

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.choices && response.data.choices[0]) {
      const aiResponse = response.data.choices[0].message.content.trim();
      return {
        content: aiResponse,
        usage: response.data.usage
      };
    } else {
      throw new Error('Invalid OpenAI API response format');
    }
  };

  // Test evaluation API
  const testEvaluationAPI = async () => {
    const testQuestion = "What is React and what are its main advantages?";
    const testAnswer = "React is a JavaScript library for building user interfaces. It uses virtual DOM for better performance and has reusable components.";

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: `🧪 **Testing Evaluation API with ${selectedModel.toUpperCase()}**\n\nQuestion: "${testQuestion}"\nAnswer: "${testAnswer}"\n\nPlease evaluate this answer and return a JSON response with score, accuracy, comment, and feedback.`,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      let result;
      
      if (selectedModel === 'gemini') {
        result = await testGeminiEvaluation(testQuestion, testAnswer);
      } else {
        result = await testOpenAIEvaluation(testQuestion, testAnswer);
      }

      const evaluationMessage = {
        id: Date.now() + 1,
        type: 'success',
        content: `✅ **${selectedModel.toUpperCase()} Evaluation API Test Successful!**\n\n${result.content}`,
        timestamp: new Date().toLocaleTimeString(),
        model: selectedModel
      };
      setMessages(prev => [...prev, evaluationMessage]);
      
    } catch (error) {
      console.error('Evaluation test failed:', error);
      const errorMsg = {
        id: Date.now() + 1,
        type: 'error',
        content: `❌ ${selectedModel.toUpperCase()} Evaluation API test failed: ${error.message}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Test Gemini evaluation
  const testGeminiEvaluation = async (question, answer) => {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    const requestData = {
      contents: [{
        parts: [{
          text: `You are a technical interviewer. Evaluate this answer and return only valid JSON format.

Question: "${question}"
Answer: "${answer}"

Return JSON only:
{
  "score": 8,
  "accuracy": 85,
  "comment": "Brief assessment",
  "feedback": "Short technical feedback"
}`
        }]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 150
      }
    };

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.candidates && response.data.candidates[0]) {
      const aiResponse = response.data.candidates[0].content.parts[0].text;
      console.log('Raw Gemini Response:', aiResponse);

      // Try to parse JSON
      try {
        let cleanResponse = aiResponse;
        if (cleanResponse.includes('```json')) {
          cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        }
        if (cleanResponse.includes('```')) {
          cleanResponse = cleanResponse.replace(/```/g, '');
        }
        
        const evaluation = JSON.parse(cleanResponse);
        
        return {
          content: `**Parsed JSON Response:**
• Score: ${evaluation.score}/10
• Accuracy: ${evaluation.accuracy}%
• Comment: ${evaluation.comment}
• Feedback: ${evaluation.feedback}

**Raw Response:**
${aiResponse}`
        };
      } catch (parseError) {
        return {
          content: `**JSON Parse Error**

Raw Response: ${aiResponse}

Parse Error: ${parseError.message}

The API responded but not in valid JSON format.`
        };
      }
    } else {
      throw new Error('Invalid Gemini API response format');
    }
  };

  // Test OpenAI evaluation
  const testOpenAIEvaluation = async (question, answer) => {
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    const requestData = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a technical interviewer. Evaluate answers and return only valid JSON format with minimal tokens.'
        },
        {
          role: 'user',
          content: `Evaluate this answer:

Question: "${question}"
Answer: "${answer}"

Return JSON only:
{
  "score": 8,
  "accuracy": 85,
  "comment": "Brief assessment",
  "feedback": "Short technical feedback"
}`
        }
      ],
      max_tokens: 150,
      temperature: 0.2
    };

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.choices && response.data.choices[0]) {
      const aiResponse = response.data.choices[0].message.content.trim();
      console.log('Raw OpenAI Response:', aiResponse);

      // Try to parse JSON
      try {
        let cleanResponse = aiResponse;
        if (cleanResponse.includes('```json')) {
          cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        }
        if (cleanResponse.includes('```')) {
          cleanResponse = cleanResponse.replace(/```/g, '');
        }
        
        const evaluation = JSON.parse(cleanResponse);
        
        return {
          content: `**Parsed JSON Response:**
• Score: ${evaluation.score}/10
• Accuracy: ${evaluation.accuracy}%
• Comment: ${evaluation.comment}
• Feedback: ${evaluation.feedback}

**Raw Response:**
${aiResponse}`
        };
      } catch (parseError) {
        return {
          content: `**JSON Parse Error**

Raw Response: ${aiResponse}

Parse Error: ${parseError.message}

The API responded but not in valid JSON format.`
        };
      }
    } else {
      throw new Error('Invalid OpenAI API response format');
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
        return { ...baseStyle, backgroundColor: '#f0f8ff', border: '1px solid #1890ff' };
      case 'ai':
        return { ...baseStyle, backgroundColor: '#f6ffed', border: '1px solid #52c41a' };
      case 'success':
        return { ...baseStyle, backgroundColor: '#f6ffed', border: '1px solid #52c41a' };
      case 'error':
        return { ...baseStyle, backgroundColor: '#fff2f0', border: '1px solid #ff7875' };
      default:
        return baseStyle;
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Title level={2}>
        <ApiOutlined /> AI API Testing Interface
      </Title>
      
      {/* Model Selection */}
      <Card style={{ marginBottom: '20px' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>Select AI Model:</Text>
            <Radio.Group 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{ marginLeft: '15px' }}
            >
              <Radio.Button value="gemini">
                <span style={{ color: '#4285f4' }}>🧠</span> Google Gemini 2.0 Flash (Free)
              </Radio.Button>
              <Radio.Button value="openai">
                <span style={{ color: '#00a67e' }}>🤖</span> OpenAI GPT-3.5 (Paid)
              </Radio.Button>
            </Radio.Group>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Text strong>API Status:</Text>
            {apiStatus[selectedModel] === 'idle' && <Tag>Not Tested</Tag>}
            {apiStatus[selectedModel] === 'testing' && <Tag color="processing">Testing...</Tag>}
            {apiStatus[selectedModel] === 'success' && <Tag color="success" icon={<CheckCircleOutlined />}>Connected</Tag>}
            {apiStatus[selectedModel] === 'error' && <Tag color="error" icon={<ExclamationCircleOutlined />}>Failed</Tag>}
          </div>
          
          <Space>
            <Button 
              type="primary" 
              icon={<ApiOutlined />}
              onClick={testConnection}
              loading={isLoading}
            >
              Test {selectedModel === 'gemini' ? 'Gemini' : 'OpenAI'} Connection
            </Button>
            <Button 
              type="default"
              onClick={testEvaluationAPI}
              loading={isLoading}
            >
              Test {selectedModel === 'gemini' ? 'Gemini' : 'OpenAI'} Evaluation
            </Button>
            <Button 
              icon={<DeleteOutlined />}
              onClick={clearMessages}
              disabled={messages.length === 0}
            >
              Clear Messages
            </Button>
          </Space>
        </Space>
      </Card>

      {/* Chat Interface */}
      <Card 
        title={`💬 Chat with ${selectedModel === 'gemini' ? 'Gemini 2.0 Flash' : 'GPT-3.5-turbo'}`}
        style={{ height: '600px', display: 'flex', flexDirection: 'column' }}
      >
        {/* Messages */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          marginBottom: '16px',
          maxHeight: '450px',
          padding: '8px'
        }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', marginTop: '50px' }}>
              <ApiOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
              <Text>No messages yet. Test the API connection or send a message to get started.</Text>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} style={getMessageStyle(message.type)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <Text strong>
                    {message.type === 'user' && '👤 You'}
                    {message.type === 'ai' && `🤖 ${message.model?.toUpperCase() || selectedModel.toUpperCase()}`}
                    {message.type === 'success' && '✅ Success'}
                    {message.type === 'error' && '❌ Error'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {message.timestamp}
                  </Text>
                </div>
                <div>{message.content}</div>
                {message.usage && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                    <Text type="secondary">
                      Tokens: {typeof message.usage === 'object' ? 
                        `${message.usage.total_tokens || message.usage.totalTokenCount || 'N/A'}` : 
                        message.usage}
                    </Text>
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '8px' }}>
                <Text>Getting response from {selectedModel.toUpperCase()}...</Text>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Type your message to test ${selectedModel === 'gemini' ? 'Gemini API' : 'OpenAI API'}...`}
            rows={2}
            style={{ flex: 1 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            loading={isLoading}
          >
            Send
          </Button>
        </div>
      </Card>

      {/* API Information */}
      <Card title="API Configuration Info">
        <Space direction="vertical" size="small">
          {selectedModel === 'gemini' ? (
            <>
              <Text>
                <strong>Endpoint:</strong> https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent
              </Text>
              <Text>
                <strong>Model:</strong> Gemini 2.0 Flash (Free Tier)
              </Text>
              <Text>
                <strong>API Key Source:</strong> VITE_GEMINI_API_KEY environment variable
              </Text>
              <Text type="secondary">
                Google Gemini 2.0 Flash provides free access with generous rate limits for testing and development.
              </Text>
            </>
          ) : (
            <>
              <Text>
                <strong>Endpoint:</strong> https://api.openai.com/v1/chat/completions
              </Text>
              <Text>
                <strong>Model:</strong> GPT-3.5-turbo (Paid Tier)
              </Text>
              <Text>
                <strong>API Key Source:</strong> VITE_OPENAI_API_KEY environment variable
              </Text>
              <Text type="secondary">
                OpenAI GPT-3.5-turbo requires payment per token usage. Monitor usage carefully.
              </Text>
            </>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default ApiTest;