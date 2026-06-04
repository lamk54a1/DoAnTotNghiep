'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntApp, Button, Popconfirm, Table, Tag } from 'antd';
import AdminPageShell from '../../../components/Admin/AdminPageShell';
import axiosClient from '../../../api/axiosClient';
import { IUser } from '../../../interfaces/IUser';

export default function AdminUsersPage() {
  const { notification } = AntApp.useApp();
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const data = await axiosClient.get<IUser[]>('/admin/users');
      setUsers(data as unknown as IUser[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateStatus = async (id: number, status: IUser['status']) => {
    await axiosClient.patch(`/admin/users/${id}/status`, { status });
    notification.success({ title: status === 'BANNED' ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.' });
    setLoading(true);
    fetchUsers();
  };

  return (
    <AdminPageShell title="Quản lý người dùng" subtitle="Theo dõi tài khoản và khóa hoặc mở khóa người dùng khi cần.">
      <Table
        rowKey="id"
        dataSource={users}
        loading={loading}
        className="overflow-hidden rounded-xl bg-white shadow-md"
        columns={[
          { title: 'ID', dataIndex: 'id', width: 70 },
          { title: 'Họ tên', dataIndex: 'fullName', render: (value) => <span className="font-bold">{value}</span> },
          { title: 'Email', dataIndex: 'email' },
          { title: 'Số điện thoại', dataIndex: 'phoneNumber', render: (value) => value || '-' },
          { title: 'CCCD', dataIndex: 'cccd', render: (value) => value || '-' },
          { title: 'Địa chỉ', dataIndex: 'address', ellipsis: true, render: (value) => value || '-' },
          { title: 'Vai trò', dataIndex: 'role', render: (role) => <Tag color={role === 'ADMIN' ? 'blue' : 'default'}>{role}</Tag> },
          { title: 'Ngày tạo', dataIndex: 'createdAt', render: (value: string) => value ? dayjs(value).format('DD/MM/YYYY') : '-' },
          { title: 'Trạng thái', dataIndex: 'status', render: (status) => <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>{status}</Tag> },
          {
            title: 'Hành động',
            render: (_, record) => record.role === 'ADMIN' ? null : (
              <Popconfirm
                title={record.status === 'ACTIVE' ? 'Khóa tài khoản này?' : 'Mở khóa tài khoản này?'}
                onConfirm={() => updateStatus(record.id, record.status === 'ACTIVE' ? 'BANNED' : 'ACTIVE')}
              >
                <Button danger={record.status === 'ACTIVE'} size="small">
                  {record.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}
                </Button>
              </Popconfirm>
            )
          },
        ]}
      />
    </AdminPageShell>
  );
}
