import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";

import { apiSlice } from "./services/apiSlice";
import orderReducer from './features/orderSlice';
import authReducer from "./features/authSlice";
import configReducer from "./features/configSlice"
import primaryItemsReducer from "./features/primaryItemsSlice"
// Combine reducers
const rootReducer = combineReducers({
  auth: authReducer,
  config: configReducer,
  primaryItems: primaryItemsReducer,
  order: orderReducer,
  [apiSlice.reducerPath]: apiSlice.reducer,
});

// Persist config
const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth","config","primaryItems"], // 👈 only persist what you need
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          FLUSH,
          REHYDRATE,
          PAUSE,
          PERSIST,
          PURGE,
          REGISTER,
        ],
      },
    }).concat(apiSlice.middleware),
});

// Persistor
export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
