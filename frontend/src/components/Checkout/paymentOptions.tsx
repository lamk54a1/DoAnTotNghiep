import React from 'react';
import { BankOutlined, QrcodeOutlined, ShopOutlined } from '@ant-design/icons';
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
    description: 'Chuyển khoản thủ công; admin kiểm tra tiền vào rồi mới xác nhận vé.',
    icon: <BankOutlined />,
  },
  {
    value: 'SEPAY',
    title: 'SePay · xác nhận tự động',
    description: 'Quét VietQR; hệ thống chỉ phát hành vé khi SePay báo tiền vào đúng số tiền và mã đơn.',
    icon: <QrcodeOutlined />,
  },
  {
    value: 'CASH',
    title: 'Thanh toán tại quầy',
    description: 'Giữ chỗ và thanh toán trực tiếp tại quầy vé sân Vinh.',
    icon: <ShopOutlined />,
  },
];
