import React from 'react';
import { QrcodeOutlined } from '@ant-design/icons';

export const sepayPaymentOption: {
  title: string;
  description: string;
  icon: React.ReactNode;
} = {
  title: 'SePay · xác nhận tự động',
  description: 'Quét VietQR; hệ thống chỉ phát hành vé khi SePay báo tiền vào đúng số tiền và mã đơn.',
  icon: <QrcodeOutlined />,
};
