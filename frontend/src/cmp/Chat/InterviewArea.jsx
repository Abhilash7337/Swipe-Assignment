import React from 'react';
import DataCollectionChat from './DataCollectionChat';
import InterviewChat from './InterviewChat';

const InterviewArea = ({
  currentStep,
  isInterviewStarted,
  isInterviewCompleted,
  chatContainerRef,
  chatMessages,
  botIsTyping,
  chatInput,
  setChatInput,
  handleChatInput,
  waitingForUserResponse,
  chatPhase,
  currentMissingField,
  isAnswering,
  currentTimer,
  currentQuestionIndex,
  isGeneratingQuestion,
  isEvaluating,
  submitAnswer,
  activeQuestion
}) => {
  if (isInterviewCompleted) return null;

  return (
    <>
      {/* Step 1: Data collection chat (shows when not started) */}
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

      {/* Interview interface */}
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
  );
};

export default InterviewArea;
