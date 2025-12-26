import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Order {
    id?: number; // Added this optional field to accommodate the UI-generated ID
    amount: number;
    canEdit: boolean | null;
    cloudKitchenId: number;
    customerPaidAmt: number;
    deliveryDate: string;
    discountAmt: number;
    itemsCount: number;
    orderId: number;
    orderPlacedDate: string;
    orderStatus: string;
    orderedItems: null;
    pantry: string;
    subTotal: number;
    tax: number;
    taxPercent: number;
    tips: number;
    totalOrderAmt: number;
}

interface OrderState {
    activeOrders: Order[];
    deliveredOrders: Order[];
}

const initialState: OrderState = {
    activeOrders: [],
    deliveredOrders: []
};

const orderSlice = createSlice({
    name: "order",
    initialState,
    reducers: {
        setDeliveredOrders: (state, action: PayloadAction<Order[]>) => {
            state.deliveredOrders = action.payload;
        },
        clearDeliveredOrders: (state) => {
            state.deliveredOrders = [];
        },
        setActiveOrders: (state, action: PayloadAction<Order[]>) => {
            state.activeOrders = action.payload;
        },
        clearActiveOrders: (state) => {
            state.activeOrders = [];
        },
    },
});

export const { setActiveOrders, clearActiveOrders, setDeliveredOrders, clearDeliveredOrders } = orderSlice.actions;
export default orderSlice.reducer;