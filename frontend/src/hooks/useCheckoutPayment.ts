'use client';

import { useState } from 'react';
import axios from 'axios';
import { App } from 'antd';
import axiosClient from '../api/axiosClient';
import { IOrderResponse } from '../interfaces/IOrder';

interface CheckoutPaymentParams {
  selectedSeats: string[];
  onOrderCreated: (order: IOrderResponse, confirmedSeats: string[]) => void;
}

export function useCheckoutPayment({
  selectedSeats,
  onOrderCreated,
}: CheckoutPaymentParams) {
  const { message } = App.useApp();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const createPendingOrder = async () => {
    setIsCreatingOrder(true);
    try {
      const userInfoStr = localStorage.getItem('user_info');
      const matchIdStr = localStorage.getItem('current_match_id');

      if (!userInfoStr) {
        message.error('Vui lòng đăng nhập lại để thanh toán!');
        return;
      }

      const seatsSnapshot = [...selectedSeats];
      const payload = {
        paymentMethod: 'SEPAY',
        tickets: seatsSnapshot,
        matchId: Number(matchIdStr),
      };

      const resData = await axiosClient.post<IOrderResponse>('/orders', payload);

      onOrderCreated(resData, seatsSnapshot);
      message.success('Đã tạo đơn và khóa ghế trong 15 phút.');
    } catch (error: unknown) {
      console.error(error);
      message.error(axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : 'Giao dịch thất bại, ghế không tồn tại hoặc đã có người mua!');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  return { isCreatingOrder, createPendingOrder };
}
