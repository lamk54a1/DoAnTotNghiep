import { configureStore } from '@reduxjs/toolkit';
import bookingReducer from './slices/bookingSlice';

export const store = configureStore({
  reducer: {
    booking: bookingReducer,
    // Sau này thêm auth: authReducer vào đây
  },
});

// Xuất các kiểu dữ liệu để dùng cho TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;