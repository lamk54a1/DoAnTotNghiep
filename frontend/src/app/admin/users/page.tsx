'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntApp, Button, Popconfirm, Space, Table, Tag } from 'antd';
import AdminPageShell from '../../../components/Admin/AdminPageShell';
import axiosClient from '../../../api/axiosClient';
import { IUser } from '../../../interfaces/IUser';

export default function AdminUsersPage() {
  const { notification } = AntApp.useApp();
  const [users, setUsers] = useState<IUser[]>([]);
  const [canManageAdmins, setCanManageAdmins] = useState(false);
  const [protectedUserId, setProtectedUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const [data, capabilities] = await Promise.all([
        axiosClient.get<IUser[]>('/admin/users'),
        axiosClient.get<{ canManageAdmins: boolean; protectedUserId: number | null }>('/admin/capabilities'),
      ]);
      setUsers(data);
      setCanManageAdmins(capabilities.canManageAdmins);
      setProtectedUserId(capabilities.protectedUserId);
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

  const reviewIdentity = async (id: number, decision: 'APPROVE' | 'REJECT') => {
    await axiosClient.patch(`/admin/users/${id}/identity`, { decision });
    notification.success({ title: decision === 'APPROVE' ? 'Đã duyệt CCCD.' : 'Đã từ chối CCCD.' });
    setLoading(true);
    fetchUsers();
  };

  const updateRole = async (id: number, role: IUser['role']) => {
    await axiosClient.patch(`/admin/users/${id}/role`, { role });
    notification.success({
      title: role === 'ADMIN'
        ? 'Đã cấp quyền quản trị viên.'
        : role === 'SCANNER'
          ? 'Đã cấp quyền nhân viên soát vé.'
          : 'Đã thu hồi quyền đặc biệt.',
    });
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
          {
            title: 'Duyệt CCCD',
            render: (_, record) => (
              <div>
                <Tag color={record.cccdStatus === 'VERIFIED' ? 'green' : record.cccdStatus === 'PENDING' ? 'gold' : record.cccdStatus === 'REJECTED' ? 'red' : 'default'}>
                  {record.cccdStatus || 'NOT_SUBMITTED'}
                </Tag>
                {record.pendingCccd && <div className="mt-1 text-xs font-bold text-[#003078]">{record.pendingCccd}</div>}
              </div>
            )
          },
          { title: 'Địa chỉ', dataIndex: 'address', ellipsis: true, render: (value) => value || '-' },
          { title: 'Vai trò', dataIndex: 'role', render: (role) => <Tag color={role === 'ADMIN' ? 'blue' : role === 'SCANNER' ? 'green' : 'default'}>{role}</Tag> },
          { title: 'Ngày tạo', dataIndex: 'createdAt', render: (value: string) => value ? dayjs(value).format('DD/MM/YYYY') : '-' },
          { title: 'Trạng thái', dataIndex: 'status', render: (status) => <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>{status}</Tag> },
          {
            title: 'Hành động',
            render: (_, record) => (
              <Space>
                {record.role !== 'ADMIN' && record.cccdStatus === 'PENDING' && (
                  <>
                    <Button size="small" type="primary" onClick={() => reviewIdentity(record.id, 'APPROVE')}>Duyệt CCCD</Button>
                    <Button size="small" danger onClick={() => reviewIdentity(record.id, 'REJECT')}>Từ chối</Button>
                  </>
                )}
                {record.role !== 'ADMIN' && (
                  <Popconfirm
                    title={record.status === 'ACTIVE' ? 'Khóa tài khoản này?' : 'Mở khóa tài khoản này?'}
                    onConfirm={() => updateStatus(record.id, record.status === 'ACTIVE' ? 'BANNED' : 'ACTIVE')}
                  >
                    <Button danger={record.status === 'ACTIVE'} size="small">
                      {record.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}
                    </Button>
                  </Popconfirm>
                )}
                {canManageAdmins && record.id !== protectedUserId && (
                  <>
                    <Popconfirm
                      title={record.role === 'ADMIN' ? 'Thu hồi quyền quản trị của tài khoản này?' : 'Cấp quyền quản trị cho tài khoản này?'}
                      onConfirm={() => updateRole(record.id, record.role === 'ADMIN' ? 'USER' : 'ADMIN')}
                    >
                      <Button
                        type={record.role === 'ADMIN' ? 'default' : 'primary'}
                        danger={record.role === 'ADMIN'}
                        disabled={record.role !== 'ADMIN' && record.status !== 'ACTIVE'}
                        size="small"
                      >
                        {record.role === 'ADMIN' ? 'Thu hồi Admin' : 'Cấp Admin'}
                      </Button>
                    </Popconfirm>
                    {record.role !== 'ADMIN' && (
                      <Popconfirm
                        title={record.role === 'SCANNER' ? 'Thu hồi quyền soát vé?' : 'Cấp quyền chỉ được soát vé?'}
                        onConfirm={() => updateRole(record.id, record.role === 'SCANNER' ? 'USER' : 'SCANNER')}
                      >
                        <Button
                          danger={record.role === 'SCANNER'}
                          disabled={record.role === 'USER' && record.status !== 'ACTIVE'}
                          size="small"
                        >
                          {record.role === 'SCANNER' ? 'Thu hồi Soát vé' : 'Cấp Soát vé'}
                        </Button>
                      </Popconfirm>
                    )}
                  </>
                )}
              </Space>
            )
          },
        ]}
      />
    </AdminPageShell>
  );
}
