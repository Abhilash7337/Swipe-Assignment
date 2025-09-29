import React, { forwardRef } from "react";
import { Card, Progress, Typography } from "antd";
import InterviewStatusBar from "./InterviewStatusBar";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import LoadingIndicator from "./LoadingIndicator";

const { Text } = Typography;

const InterviewChat = forwardRef(({
  isAnswering,
  currentTimer,
  currentQuestionIndex,
  chatMessages,
  isGeneratingQuestion,
  isEvaluating,
  chatInput,
  setChatInput,
  submitAnswer,
  activeQuestion,
}, chatContainerRef) => (
  <Card 
    title={
      <InterviewStatusBar 
        isAnswering={isAnswering} 
        currentTimer={currentTimer} 
        currentQuestionIndex={currentQuestionIndex} 
        label="💬 Technical Interview in Progress"
        totalQuestions={6}
        timerWarningColor="#ff4d4f"
        timerNormalColor="#1890ff"
      />
    }
    style={{ marginBottom: '20px' }}
  >
    {/* Chat Messages */}
    <div 
      ref={chatContainerRef}
      style={{ 
        height: '500px', 
        overflowY: 'auto', 
        marginBottom: '16px',
        padding: '10px',
        border: '1px solid #f0f0f0',
        borderRadius: '6px'
      }}
    >
      <ChatMessages messages={chatMessages} />
      {/* Loading indicators */}
      {isGeneratingQuestion && (
        <LoadingIndicator text="AI is generating your next question..." spinnerSize="large" padding="20px" />
      )}
      {isEvaluating && (
        <LoadingIndicator text="AI is evaluating your answer..." spinnerSize="large" padding="20px" />
      )}
    </div>

    {/* Answer Input */}
    {isAnswering && (
      <ChatInput
        value={chatInput}
        onChange={(e) => setChatInput(e.target.value)}
        onSend={submitAnswer}
        placeholder="Type your answer here... (keep it simple for testing)"
        disabled={!chatInput.trim() || isEvaluating}
        buttonText="Submit"
      />
    )}

    {/* Timer Progress */}
    {isAnswering && activeQuestion && (
      <div style={{ marginTop: '10px' }}>
        <Progress 
          percent={((activeQuestion.timeLimit - currentTimer) / activeQuestion.timeLimit) * 100}
          status={currentTimer <= 10 ? 'exception' : 'normal'}
          showInfo={false}
          strokeColor={currentTimer <= 10 ? '#ff4d4f' : '#1890ff'}
        />
        <div style={{ textAlign: 'center', marginTop: '4px' }}>
          <Text type="secondary">
            Question {currentQuestionIndex + 1} of 6 • {activeQuestion.difficulty.toUpperCase()} • {currentTimer}s remaining
          </Text>
        </div>
      </div>
    )}
  </Card>
));

export default InterviewChat;
