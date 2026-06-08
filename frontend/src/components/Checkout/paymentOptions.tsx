import React from 'react';
import { BankOutlined, MobileOutlined, QrcodeOutlined, ShopOutlined } from '@ant-design/icons';
import { PaymentMethod } from '../../interfaces/IOrder';

export const paymentOptions: Array<{
  value: PaymentMethod;
  title: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'BANK_TRANSFER',
    title: 'Chuyển khoản VietQR',
    description: 'Quét QR ngân hàng, nội dung chuyển khoản tự động theo đơn.',
    icon: <BankOutlined />,
  },
  {
    value: 'MOMO',
    title: 'Ví MoMo',
    description: 'Mô phỏng thanh toán ví điện tử MoMo cho đơn vé SLNA.',
    icon: <MobileOutlined />,
  },
  {
    value: 'VNPAY',
    title: 'Thẻ ATM / VNPAY',
    description: 'Thanh toán qua cổng VNPAY bằng ATM nội địa hoặc QR Pay.',
    icon: <QrcodeOutlined />,
  },
  {
    value: 'CASH',
    title: 'Thanh toán tại quầy',
    description: 'Giữ chỗ và thanh toán trực tiếp tại quầy vé sân Vinh.',
    icon: <ShopOutlined />,
  },
];
