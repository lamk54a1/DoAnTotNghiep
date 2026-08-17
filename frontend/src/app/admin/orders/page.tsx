'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntApp, Button, Card, Popconfirm, Select, Space, Table, Tag } from 'antd';
import type { TableRowSelection } from 'antd/es/table/interface';
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
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchOrders = async () => {
    try {
      const data = await axiosClient.get<AdminOrder[]>('/admin/orders');
      setOrders(data);
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

  const bulkApproveOrders = async () => {
    try {
      setBulkUpdating(true);
      const res = await axiosClient.patch<{ message: string; updatedCount: number; skippedCount: number }>('/admin/orders/bulk/status', {
        ids: selectedRowKeys,
        status: 'SUCCESS',
      });

      notification.success({
        title: 'Đã duyệt hàng loạt',
        description: `${res.message}${res.skippedCount > 0 ? ` Bỏ qua ${res.skippedCount} đơn không còn chờ xử lý.` : ''}`,
      });
      setSelectedRowKeys([]);
      setLoading(true);
      fetchOrders();
    } finally {
      setBulkUpdating(false);
    }
  };

  const rowSelection: TableRowSelection<AdminOrder> = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    getCheckboxProps: (record) => ({
      disabled: record.status !== 'PENDING',
    }),
  };

  const exportExcel = async () => {
    try {
      setExporting(true);
      const blob = await axiosClient.get<Blob>('/admin/reports/orders.xlsx', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `slna-orders-report-${dayjs().format('YYYYMMDD-HHmm')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      notification.success({ title: 'Đã tải báo cáo Excel.' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminPageShell
      title="Quản lý đơn hàng"
      subtitle="Xác nhận thanh toán hoặc hủy đơn và trả ghế về kho vé."
      extra={<Button onClick={exportExcel} loading={exporting}>Xuất Excel</Button>}
    >
      <Card className="mb-4 rounded-xl shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="m-0 text-sm font-bold text-[#003078]">Đã chọn {selectedRowKeys.length} đơn chờ xử lý</p>
            <p className="m-0 text-xs text-gray-400">Chỉ các đơn trạng thái PENDING mới có thể chọn để duyệt hàng loạt.</p>
          </div>
          <Popconfirm
            title="Duyệt hàng loạt các đơn đã chọn?"
            description="Các đơn được chọn sẽ chuyển sang trạng thái SUCCESS."
            onConfirm={bulkApproveOrders}
            okText="Duyệt"
            cancelText="Hủy"
            disabled={selectedRowKeys.length === 0}
          >
            <Button type="primary" loading={bulkUpdating} disabled={selectedRowKeys.length === 0} className="bg-[#003078] font-bold">
              Duyệt hàng loạt
            </Button>
          </Popconfirm>
        </div>
      </Card>
      <Table
        rowKey="id"
        rowSelection={rowSelection}
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
