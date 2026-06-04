'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntApp, Button, Popconfirm, Select, Space, Table, Tag } from 'antd';
import AdminPageShell from '../../../components/Admin/AdminPageShell';
import axiosClient from '../../../api/axiosClient';

interface AdminOrder {
  id: number;
  customerName?: string;
  customerEmail?: string;
  totalAmount: number;
  status: 'PENDING' | 'SUCCESS' | 'CANCELLED';
  paymentMethod: string;
  createdAt: string;
  ticketCount: number;
  opponents?: string;
}

const statusColors = { PENDING: 'gold', SUCCESS: 'green', CANCELLED: 'red' };

export default function AdminOrdersPage() {
  const { notification } = AntApp.useApp();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const data = await axiosClient.get<AdminOrder[]>('/admin/orders');
      setOrders(data as unknown as AdminOrder[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (id: number, status: AdminOrder['status']) => {
    await axiosClient.patch(`/admin/orders/${id}/status`, { status });
    notification.success({ title: 'Đã cập nhật trạng thái đơn hàng.' });
    setLoading(true);
    fetchOrders();
  };

  return (
    <AdminPageShell title="Quản lý đơn hàng" subtitle="Xác nhận thanh toán hoặc hủy đơn và trả ghế về kho vé.">
      <Table
        rowKey="id"
        dataSource={orders}
        loading={loading}
        className="overflow-hidden rounded-xl bg-white shadow-md"
        scroll={{ x: 1000 }}
        columns={[
          { title: 'Mã đơn', dataIndex: 'id', width: 85, render: (id) => `#${id}` },
          {
            title: 'Khách hàng',
            render: (_, record) => (
              <div>
                <div className="font-bold">{record.customerName || 'Không rõ'}</div>
                <div className="text-xs text-gray-400">{record.customerEmail}</div>
              </div>
            )
          },
          { title: 'Trận đấu', dataIndex: 'opponents', render: (value) => value || '-' },
          { title: 'Số vé', dataIndex: 'ticketCount', width: 80 },
          { title: 'Tổng tiền', dataIndex: 'totalAmount', render: (value: number) => `${Number(value).toLocaleString('vi-VN')}đ` },
          { title: 'Tạo lúc', dataIndex: 'createdAt', render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm') },
          { title: 'Trạng thái', dataIndex: 'status', render: (status: AdminOrder['status']) => <Tag color={statusColors[status]}>{status}</Tag> },
          {
            title: 'Cập nhật',
            render: (_, record) => (
              record.status === 'SUCCESS' ? (
                <Tag color="green">Đã xác nhận, không thể hủy</Tag>
              ) : record.status === 'CANCELLED' ? (
                <Tag color="red">Đã hủy</Tag>
              ) : (
              <Space>
                <Select
                  value={record.status}
                  className="w-32"
                  onChange={(status) => updateStatus(record.id, status)}
                  options={[
                    { value: 'PENDING', label: 'Chờ xử lý' },
                    { value: 'SUCCESS', label: 'Thành công' },
                  ]}
                />
                <Popconfirm title="Hủy đơn và trả lại ghế?" onConfirm={() => updateStatus(record.id, 'CANCELLED')}>
                  <Button danger size="small">Hủy</Button>
                </Popconfirm>
              </Space>
              )
            )
          },
        ]}
      />
    </AdminPageShell>
  );
}
