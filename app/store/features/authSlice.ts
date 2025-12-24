import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface LoginDetails {
  userId: string;
  cloudKitchenName: string;
  cloudKitchenId: number;
}

interface AuthState {
  login_Details: LoginDetails | null;
}

const initialState: AuthState = {
  login_Details: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setLoginDetails: (state, action: PayloadAction<LoginDetails>) => {
      state.login_Details = action.payload;
    },
    clearLoginDetails: (state) => {
      state.login_Details = null;
    },
  },
});

export const { setLoginDetails, clearLoginDetails } = authSlice.actions;
export default authSlice.reducer;
