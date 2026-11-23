'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Alert, App, Button, Input, Modal, Space, Table, Tag } from 'antd';
import AdminPageShell from '../../../components/Admin/AdminPageShell';
import axiosClient from '../../../api/axiosClient';

interface ReviewTransaction {
  transactionId: string;
  orderId: number | null;
  paymentCode: string | null;
  accountNumber: string;
  amount: number;
  status: string;
  refundStatus: 'NOT_REQUIRED' | 'REQUIRED' | 'PROCESSING' | 'REFUNDED';
  refundNote?: string | null;
  refundedAt?: string | null;
  receivedAt: string;
}

const REFUND_LABELS = {
  NOT_REQUIRED: 'Chưa yêu cầu',
  REQUIRED: 'Cần hoàn tiền',
  PROCESSING: 'Đang xử lý',
  REFUNDED: 'Đã hoàn tiền',
};

export default function AdminPaymentReviewsPage() {
  const { message } = App.useApp();
  const [items, setItems] = useState<ReviewTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refundItem, setRefundItem] = useState<ReviewTransaction | null>(null);
  const [refundNote, setRefundNote] = useState('');
  const [savingRefund, setSavingRefund] = useState(false);

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

  const updateRefund = async (item: ReviewTransaction, refundStatus: 'REQUIRED' | 'PROCESSING' | 'REFUNDED', note = '') => {
    setSavingRefund(true);
    try {
      await axiosClient.patch(`/admin/payments/sepay/${item.transactionId}/refund`, { refundStatus, refundNote: note });
      message.success(refundStatus === 'REFUNDED' ? 'Đã ghi nhận hoàn tiền.' : 'Đã cập nhật tiến độ hoàn tiền.');
      setRefundItem(null);
      setRefundNote('');
      await refresh();
    } catch {
      message.error('Không thể cập nhật trạng thái hoàn tiền.');
    } finally {
      setSavingRefund(false);
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
      <Alert showIcon type="warning" className="mb-4" message="Đây là sổ theo dõi hoàn tiền. Admin vẫn phải thực hiện chuyển tiền thực tế trên ngân hàng/SePay rồi mới bấm Đã hoàn tiền; hệ thống không tự chuyển tiền." />
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
          {
            title: 'Hoàn tiền', dataIndex: 'refundStatus',
            render: (value: ReviewTransaction['refundStatus']) => (
              <Tag color={value === 'REFUNDED' ? 'green' : value === 'PROCESSING' ? 'blue' : value === 'REQUIRED' ? 'red' : 'default'}>
                {REFUND_LABELS[value] || value}
              </Tag>
            ),
          },
          { title: 'Nhận lúc', dataIndex: 'receivedAt', render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm:ss') },
          {
            title: 'Xử lý', fixed: 'right', width: 210,
            render: (_: unknown, record: ReviewTransaction) => record.status === 'IGNORED_OUTGOING' || record.refundStatus === 'REFUNDED' ? '-' : (
              <Space wrap>
                {record.refundStatus !== 'PROCESSING' && (
                  <Button size="small" onClick={() => void updateRefund(record, 'PROCESSING', record.refundNote || '')}>Tiếp nhận</Button>
                )}
                <Button size="small" type="primary" onClick={() => { setRefundItem(record); setRefundNote(record.refundNote || ''); }}>
                  Đã hoàn tiền
                </Button>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={`Xác nhận hoàn giao dịch ${refundItem?.transactionId || ''}`}
        open={Boolean(refundItem)}
        onCancel={() => setRefundItem(null)}
        onOk={() => refundItem && void updateRefund(refundItem, 'REFUNDED', refundNote)}
        okText="Xác nhận đã hoàn"
        cancelText="Hủy"
        confirmLoading={savingRefund}
        okButtonProps={{ disabled: refundNote.trim().length < 3 }}
      >
        <Alert showIcon type="info" className="mb-4" message="Chỉ xác nhận sau khi tiền đã được chuyển trả thực tế cho khách." />
        <Input.TextArea rows={4} value={refundNote} onChange={(event) => setRefundNote(event.target.value)} placeholder="Nhập mã giao dịch hoàn tiền hoặc ghi chú đối soát..." maxLength={500} showCount />
      </Modal>
    </AdminPageShell>
  );
}
