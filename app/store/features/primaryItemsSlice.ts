import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface PrimaryItem {
  id: number;
  itemQty: number;
  checked?: boolean;
  [key: string]: string | number | boolean | undefined;
}

interface PrimaryGroup {
  config: Record<string, unknown>;
  items: PrimaryItem[];
}

interface PrimaryItemsState {
  list: PrimaryGroup[];
  isFetched: boolean;
  availableItems: any[];
  lastConfigSignature: string | null;
}

const initialState: PrimaryItemsState = {
  list: [],
  isFetched: false,
  availableItems: [],
  lastConfigSignature: null,
};

const primaryItemsSlice = createSlice({
  name: "primaryItems",
  initialState,
  reducers: {
    setPrimaryItems(
      state,
      action: PayloadAction<{
        data: PrimaryGroup[];
        configSignature: string;
      }>
    ) {
      state.list = action.payload.data;
      state.isFetched = true;
      state.lastConfigSignature = action.payload.configSignature;
    },
    setAvailableItems: (state, action) => {
      state.availableItems = action.payload;
    },
    toggleItem(
      state,
      action: PayloadAction<{ groupIndex: number; itemId: number }>
    ) {
      const group = state.list[action.payload.groupIndex];
      const item = group.items.find((i) => i.id === action.payload.itemId);
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
      action: PayloadAction<{ groupIndex: number; itemId: number; qty: number | "" ; direct: boolean}>
    ) {
      const group = state.list[action.payload.groupIndex];
      const item = group.items.find((i) => i.id === action.payload.itemId);
      if (item) {
        item.rcomQty = action.payload.qty;
        if(action.payload.direct){
          item.touched = item.rcomQty !== item.itemQty;
        }
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

      state.list.forEach((group) => {
        group.items.forEach((item) => {
          const isMatch =
            filterType === "online"
              ? item.mainItemName === "Online"
              : item.mainItemName === "Event";

          if (!isMatch) return;

          const base = (item.rcomQty ?? item.itemQty) as number;
          const delta = (base * percentage) / 100;

          const newQty = operator === "+" ? base + delta : base - delta;

          item.rcomQty = Math.max(0, Math.round(newQty));
          item.touched = item.rcomQty !== item.itemQty;
        });
      });
    },

    clearPrimaryItems(state) {
      state.list = [];
      state.isFetched = false;
    },

    selectSpecificItems: (state, action) => {
      const { groupIndex, itemIds, checked } = action.payload;
      const group = state.list[groupIndex];
      if (group) {
        group.items.forEach((item) => {
          if (itemIds.includes(item.id)) {
            item.checked = checked;
          }
        });
      }
    },

    applyMathToSelected: (
      state,
      action: PayloadAction<{
        groupIndex: number;
        operator: "+" | "-";
        value: number;
        mode: "PERCENT" | "VALUE";
        direct: boolean
      }>
    ) => {
      const { groupIndex, operator, value, mode } = action.payload;
      const group = state.list[groupIndex];

      if (!group) return;

      group.items.forEach((item) => {
        if (!item.checked) return;

        const currentQty = (item.rcomQty as number) || 0;

        // VALUE mode = SET
        if (mode === "VALUE") {
          item.rcomQty = Math.max(0, Math.round(value));
          return;
        }

        // PERCENT mode = +/- %
        const delta = (currentQty * value) / 100;
        let newQty =
          operator === "+"
            ? currentQty + delta
            : currentQty - delta;

        item.rcomQty = Math.max(0, Math.round(newQty));
        if(action.payload.direct){
          item.touched = item.rcomQty !== item.itemQty;
        }
      });
    },
    addItemToGroup: (state, action) => {
      const { groupIndex, item } = action.payload;
      if (state.list[groupIndex]) {
        state.list[groupIndex].items.unshift(item);

        state.list[groupIndex].items.forEach((itm, index) => {
          itm.id = index + 1;
        });
      }
    },
    markSelectedAsTouched: (
      state,
      action: PayloadAction<{ groupIndex: number,modalClose:boolean }>
    ) => {
      const { groupIndex } = action.payload;
      if(action.payload.modalClose){
        state.list[groupIndex].items.forEach(item => {
          if (item.rcomQty !== item.itemQty) {
            item.touched = true;
          }
        });
      }else{
        state.list[groupIndex].items.forEach(item => {
          if (item.checked && !item.touched) {
            item.touched = true;
            item.checked = false;
          }
        });
      }
    },

  },
});

export const {
  setPrimaryItems,
  setAvailableItems,
  toggleItem,
  selectAllInGroup,
  updateItemQty,
  bulkUpdateRcomQty,
  clearPrimaryItems,
  selectSpecificItems,
  applyMathToSelected,
  addItemToGroup,
  markSelectedAsTouched
} = primaryItemsSlice.actions;

export default primaryItemsSlice.reducer;