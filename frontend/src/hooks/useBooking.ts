import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { toggleSeatSelection, resetBooking, confirmPaymentSuccess } from '../store/slices/bookingSlice';
import { App as AntApp } from 'antd';

export const useBooking = () => {
  const { message } = AntApp.useApp();
  const dispatch = useAppDispatch();
  const { selectedSeats, soldSeats, totalPrice } = useAppSelector((state) => state.booking);

  const handleToggleSeat = (seatId: string, price?: number) => {
    if (!selectedSeats.includes(seatId) && !soldSeats.includes(seatId) && selectedSeats.length >= 4) {
      message.warning("Tối đa 4 vé mỗi lần đặt!");
      return;
    }
    dispatch(toggleSeatSelection({ seatId, price }));
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
