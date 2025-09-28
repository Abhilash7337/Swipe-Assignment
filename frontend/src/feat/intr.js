import { createSlice } from "@reduxjs/toolkit";


const intrSlice = createSlice({
  name: "interview",
  initialState: {
    questions: [],
    current: 0,
    answers: [],
    timer: 0,
    status: "idle", // idle | running | finished
    feedback: [],
  },
  reducers: {
    setQuestions: (state, action) => {
      state.questions = action.payload;
      state.current = 0;
      state.answers = [];
      state.status = "running";
    },
    answerQuestion: (state, action) => {
      state.answers[state.current] = action.payload;
    },
    nextQuestion: (state) => {
      if (state.current < state.questions.length - 1) {
        state.current += 1;
      } else {
        state.status = "finished";
      }
    },
    setTimer: (state, action) => {
      state.timer = action.payload;
    },
    setFeedback: (state, action) => {
      state.feedback[state.current] = action.payload;
    },
    resetInterview: (state) => {
      state.questions = [];
      state.current = 0;
      state.answers = [];
      state.timer = 0;
      state.status = "idle";
      state.feedback = [];
    },
  },
});

export const { setQuestions, answerQuestion, nextQuestion, setTimer, setFeedback, resetInterview } = intrSlice.actions;

export const selectQuestions = (state) => state.interview.questions;
export const selectCurrentQuestion = (state) => state.interview.questions[state.interview.current];
export const selectAnswers = (state) => state.interview.answers;
export const selectInterviewStatus = (state) => state.interview.status;
export const selectTimer = (state) => state.interview.timer;
export const selectFeedback = (state) => state.interview.feedback;

export default intrSlice.reducer;
