import React from "react";
import InterviewResults from "./InterviewResults";

const InterviewResultsContainer = ({
  isInterviewCompleted,
  finalCandidateInfo,
  allAnswers,
  onReset
}) => (
  isInterviewCompleted && (
    <InterviewResults 
      candidateInfo={finalCandidateInfo}
      allAnswers={allAnswers}
      totalQuestions={6}
      onClose={onReset}
    />
  )
);

export default InterviewResultsContainer;
