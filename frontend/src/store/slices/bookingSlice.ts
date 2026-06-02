import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BookingState {
  selectedSeats: string[]; 
  soldSeats: string[];     
  totalPrice: number;
}

const initialState: BookingState = {
  selectedSeats: [],
  soldSeats: [], // Để trống vì dữ liệu ghế đã bán sẽ được tải trực tiếp từ DB lên Sơ đồ
  totalPrice: 0,
};

const PRICE_MAP: Record<string, number> = {
  'A': 100000, 
  'B': 50000, 
  'C': 20000, 
  'D': 20000,
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    toggleSeatSelection: (state, action: PayloadAction<string>) => {
      const seatId = action.payload; // VD: "A1-01", "B2-10"
      
      // ĐÃ SỬA: Lấy chính xác ký tự chữ cái đầu tiên (A, B, C, D) để tra bảng giá
      const standLetter = seatId.charAt(0); 
      const seatPrice = PRICE_MAP[standLetter] || 0;

      if (state.soldSeats.includes(seatId)) return;

      if (state.selectedSeats.includes(seatId)) {
        // Hủy chọn
        state.selectedSeats = state.selectedSeats.filter(id => id !== seatId);
        state.totalPrice -= seatPrice;
      } else {
        // Chọn mới (Tối đa 4 vé)
        if (state.selectedSeats.length < 4) {
          state.selectedSeats.push(seatId);
          state.totalPrice += seatPrice;
        }
      }
    },
    confirmPaymentSuccess: (state) => {
      // Chuyển từ giỏ hàng sang danh sách đã bán vĩnh viễn
      state.soldSeats = [...state.soldSeats, ...state.selectedSeats];
      state.selectedSeats = [];
      state.totalPrice = 0;
    },
    resetBooking: (state) => {
      state.selectedSeats = [];
      state.totalPrice = 0;
    },
  },
});

export const { toggleSeatSelection, resetBooking, confirmPaymentSuccess } = bookingSlice.actions;
export default bookingSlice.reducer;