import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DateObject } from "react-multi-date-picker";

type DayCode = 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';

export interface ConfigItem {
  day: DayCode;
  date: Date;
  date_range: string;
  custom_date_range: DateObject[];
  days: DayCode[];
}

interface ConfigState {
  config: ConfigItem[];
}

const initialState: ConfigState = {
  config: [],
};

const configSlice = createSlice({
  name: "config",
  initialState,
  reducers: {
    setConfig: (state, action: PayloadAction<ConfigItem[]>) => {
      state.config = action.payload;
    },
    clearConfig: (state) => {
      state.config = [];
    },
  },
});

export const { setConfig, clearConfig } = configSlice.actions;
export default configSlice.reducer;
