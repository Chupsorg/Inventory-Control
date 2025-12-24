import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface PrimaryItem {
  id: number;
  itemQty: number;
  checked?: boolean;
  [key: string]: any;
}

interface PrimaryGroup {
  config: any;
  items: PrimaryItem[];
}

interface PrimaryItemsState {
  list: PrimaryGroup[];
  isFetched: boolean;
}

const initialState: PrimaryItemsState = {
  list: [],
  isFetched: false,
};

const primaryItemsSlice = createSlice({
  name: "primaryItems",
  initialState,
  reducers: {
    setPrimaryItems(state, action: PayloadAction<PrimaryGroup[]>) {
      state.list = action.payload;
      state.isFetched = true;
    },

    toggleItem(state, action: PayloadAction<{ groupIndex: number; itemId: number }>) {
      const group = state.list[action.payload.groupIndex];
      const item = group.items.find(i => i.id === action.payload.itemId);
      if (item) {
        item.checked = !item.checked;
      }
    },
    selectAllInGroup(
      state,
      action: PayloadAction<{ groupIndex: number; checked: boolean }>
    ) {
      const group = state.list[action.payload.groupIndex];
      if (group) {
        group.items.forEach((item) => {
          item.checked = action.payload.checked;
        });
      }
    },

    updateItemQty(
      state,
      action: PayloadAction<{ groupIndex: number; itemId: number; qty: number }>
    ) {
      const group = state.list[action.payload.groupIndex];
      const item = group.items.find(i => i.id === action.payload.itemId);
      if (item) {
        item.rcomQty = action.payload.qty;
      }
    },

    bulkUpdateRcomQty(
      state,
      action: PayloadAction<{
        filterType: "online" | "event";
        operator: "+" | "-";
        percentage: number;
      }>
    ) {
      const { filterType, operator, percentage } = action.payload;

      state.list.forEach(group => {
        group.items.forEach(item => {
          const isMatch =
            filterType === "online"
              ? item.mainItemName === "Online"
              : item.mainItemName === "Event";

          if (!isMatch) return;

          const base = item.rcomQty ?? item.itemQty;
          const delta = (base * percentage) / 100;

          let newQty =
            operator === "+" ? base + delta : base - delta;

          item.rcomQty = Math.max(0, Math.round(newQty));
        });
      });
    },


    clearPrimaryItems(state) {
      state.list = [];
      state.isFetched = false;
    },
  },
});

export const {
  setPrimaryItems,
  toggleItem,
  selectAllInGroup,
  updateItemQty,
  bulkUpdateRcomQty,
  clearPrimaryItems,
} = primaryItemsSlice.actions;

export default primaryItemsSlice.reducer;
