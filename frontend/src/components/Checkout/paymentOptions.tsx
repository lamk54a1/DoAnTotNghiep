import React from 'react';
import { QrcodeOutlined } from '@ant-design/icons';

export const sepayPaymentOption: {
  title: string;
  description: string;
  icon: React.ReactNode;
} = {
  title: 'Quét Mã QR để thanh toán',
  description: 'Hệ thống chỉ phát hành vé khi chuyển đúng nội dung và xác nhận thanh toán thành công',
  icon: <QrcodeOutlined />,
};
