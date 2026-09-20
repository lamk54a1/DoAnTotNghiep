'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Alert, Button, Table, Tag } from 'antd';
import AdminPageShell from '../../../components/Admin/AdminPageShell';
import axiosClient from '../../../api/axiosClient';

interface ReviewTransaction {
  transactionId: string;
  orderId: number | null;
  paymentCode: string | null;
  accountNumber: string;
  amount: number;
  status: string;
  receivedAt: string;
}

export default function AdminPaymentReviewsPage() {
  const [items, setItems] = useState<ReviewTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      setItems(await axiosClient.get<ReviewTransaction[]>('/admin/payments/sepay/review'));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void axiosClient.get<ReviewTransaction[]>('/admin/payments/sepay/review')
      .then(setItems)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminPageShell title="Giao dịch SePay cần đối soát" subtitle="Giao dịch sai mã, sai số tiền hoặc sau khi đơn hết hạn không được tự động phát hành vé." extra={<Button onClick={refresh} loading={loading}>Tải lại</Button>}>
      <Alert showIcon type="warning" className="mb-4" message="Nếu khách đã chuyển tiền nhưng đơn không được xác nhận, kiểm tra giao dịch trên SePay và ngân hàng trước khi xử lý hoàn tiền. Không tạo vé thủ công cho đơn SePay chưa đối soát." />
      {error && <Alert showIcon type="error" className="mb-4" message="Không tải được danh sách giao dịch; vui lòng thử lại." />}
      <Table
        rowKey="transactionId"
        dataSource={items}
        loading={loading}
        scroll={{ x: 800 }}
        className="overflow-hidden rounded-xl bg-white shadow-md"
        columns={[
          { title: 'Mã giao dịch', dataIndex: 'transactionId' },
          { title: 'Đơn', dataIndex: 'orderId', render: (id: number | null) => id ? `#${id}` : '-' },
          { title: 'Mã chuyển khoản', dataIndex: 'paymentCode', render: (value: string | null) => value || '-' },
          { title: 'Tài khoản nhận', dataIndex: 'accountNumber' },
          { title: 'Số tiền', dataIndex: 'amount', render: (value: number) => `${Number(value).toLocaleString('vi-VN')}đ` },
          { title: 'Lý do', dataIndex: 'status', render: (value: string) => <Tag color="orange">{value}</Tag> },
          { title: 'Nhận lúc', dataIndex: 'receivedAt', render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm:ss') },
        ]}
      />
    </AdminPageShell>
  );
}
