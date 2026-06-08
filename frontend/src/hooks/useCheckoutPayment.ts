'use client';

import { useState } from 'react';
import axios from 'axios';
import { App } from 'antd';
import axiosClient from '../api/axiosClient';
import { IOrderResponse, PaymentMethod } from '../interfaces/IOrder';

interface CheckoutPaymentParams {
  selectedSeats: string[];
  paymentMethod: PaymentMethod;
  confirmPayment: () => void;
  onSuccess: (ticketCode: string, confirmedSeats: string[]) => void;
}

export function useCheckoutPayment({
  selectedSeats,
  paymentMethod,
  confirmPayment,
  onSuccess,
}: CheckoutPaymentParams) {
  const { message } = App.useApp();
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyPayment = async () => {
    setIsVerifying(true);
    try {
      const userInfoStr = localStorage.getItem('user_info');
      const matchIdStr = localStorage.getItem('current_match_id');

      if (!userInfoStr) {
        message.error('Vui lòng đăng nhập lại để thanh toán!');
        setIsVerifying(false);
        return;
      }

      const seatsSnapshot = [...selectedSeats];
      const payload = {
        paymentMethod,
        tickets: seatsSnapshot,
        matchId: Number(matchIdStr),
      };

      const resData = await axiosClient.post('/orders', payload) as unknown as IOrderResponse;

      confirmPayment();
      onSuccess(resData.orderQrCode, seatsSnapshot);
      message.success('Thanh toán thành công!');
    } catch (error: unknown) {
      console.error(error);
      message.error(axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : 'Giao dịch thất bại, ghế không tồn tại hoặc đã có người mua!');
    } finally {
      setIsVerifying(false);
    }
  };

  return { isVerifying, verifyPayment };
}
