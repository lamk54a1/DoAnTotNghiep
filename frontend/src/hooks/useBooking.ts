import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { toggleSeatSelection, resetBooking, confirmPaymentSuccess } from '../store/slices/bookingSlice';
import { message } from 'antd';

export const useBooking = () => {
  const dispatch = useAppDispatch();
  const { selectedSeats, soldSeats, totalPrice } = useAppSelector((state) => state.booking);

  const handleToggleSeat = (seatId: string) => {
    if (!selectedSeats.includes(seatId) && !soldSeats.includes(seatId) && selectedSeats.length >= 4) {
      message.warning("Tối đa 4 vé mỗi lần đặt!");
      return;
    }
    dispatch(toggleSeatSelection(seatId));
  };

  return {
    selectedSeats,
    soldSeats,
    totalPrice,
    handleToggleSeat,
    confirmPayment: () => dispatch(confirmPaymentSuccess()),
    reset: () => dispatch(resetBooking()),
  };
};