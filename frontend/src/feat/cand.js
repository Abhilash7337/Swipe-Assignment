import { createSlice } from "@reduxjs/toolkit";


const candSlice = createSlice({
  name: "candidates",
  initialState: {
    info: null,
    resume: null,
  },
  reducers: {
    setCandidateInfo: (state, action) => {
      state.info = action.payload;
    },
    setResume: (state, action) => {
      state.resume = action.payload;
    },
    clearCandidate: (state) => {
      state.info = null;
      state.resume = null;
    },
  },
});

export const { setCandidateInfo, setResume, clearCandidate } = candSlice.actions;

export const selectCandidateInfo = (state) => state.candidates.info;
export const selectResume = (state) => state.candidates.resume;

export default candSlice.reducer;
