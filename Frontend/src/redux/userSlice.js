
import {  createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
  name: "user",

  initialState: {
    userData: null,
    loading: true,
    error: null,
  },

  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
      state.loading = false;
      state.error = null;
    },

    clearUserData: (state) => {
      state.userData = null;
      state.loading = false;
      state.error = null;
    },
  },
});

export const { setUserData, clearUserData } = userSlice.actions;
export default userSlice.reducer;