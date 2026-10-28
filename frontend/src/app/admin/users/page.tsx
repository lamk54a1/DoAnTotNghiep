'use client';

import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntApp, Button, Card, Descriptions, Input, Popconfirm, Select, Space, Table, Tag } from 'antd';
import { SearchOutlined, TeamOutlined } from '@ant-design/icons';
import AdminPageShell from '../../../components/Admin/AdminPageShell';
import axiosClient from '../../../api/axiosClient';
import { IUser } from '../../../interfaces/IUser';

export default function AdminUsersPage() {
  const { notification } = AntApp.useApp();
  const [users, setUsers] = useState<IUser[]>([]);
  const [canManageAdmins, setCanManageAdmins] = useState(false);
  const [protectedUserId, setProtectedUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<IUser['role'] | undefined>();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (roleFilter) params.set('role', roleFilter);
      const data = await axiosClient.get<IUser[]>(`/admin/users?${params.toString()}`);
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, roleFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    void Promise.resolve().then(fetchUsers);
  }, [fetchUsers]);

  useEffect(() => {
    axiosClient.get<{ canManageAdmins: boolean; protectedUserId: number | null }>('/admin/capabilities')
      .then((capabilities) => {
        setCanManageAdmins(capabilities.canManageAdmins);
        setProtectedUserId(capabilities.protectedUserId);
      })
      .catch(() => notification.error({ message: 'Không thể tải quyền quản trị.' }));
  }, [notification]);

  const updateStatus = async (id: number, status: IUser['status']) => {
    await axiosClient.patch(`/admin/users/${id}/status`, { status });
    notification.success({ title: status === 'BANNED' ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.' });
    setLoading(true);
    void fetchUsers();
  };

  const reviewIdentity = async (id: number, decision: 'APPROVE' | 'REJECT') => {
    await axiosClient.patch(`/admin/users/${id}/identity`, { decision });
    notification.success({ title: decision === 'APPROVE' ? 'Đã duyệt CCCD.' : 'Đã từ chối CCCD.' });
    setLoading(true);
    void fetchUsers();
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
    void fetchUsers();
  };

  const roleLabel = (role: IUser['role']) => ({ USER: 'Người dùng', ADMIN: 'Quản trị viên', SCANNER: 'Nhân viên soát vé' }[role]);
  const cccdLabel = (status: IUser['cccdStatus']) => ({
    NOT_SUBMITTED: 'Chưa gửi', PENDING: 'Chờ duyệt', VERIFIED: 'Đã xác minh', REJECTED: 'Đã từ chối',
  }[status || 'NOT_SUBMITTED']);

  const renderActions = (record: IUser) => (
    <Space wrap size={[6, 6]}>
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
              <Button danger={record.role === 'SCANNER'} disabled={record.role === 'USER' && record.status !== 'ACTIVE'} size="small">
                {record.role === 'SCANNER' ? 'Thu hồi Soát vé' : 'Cấp Soát vé'}
              </Button>
            </Popconfirm>
          )}
        </>
      )}
    </Space>
  );

  return (
    <AdminPageShell title="Quản lý người dùng" subtitle="Theo dõi tài khoản và khóa hoặc mở khóa người dùng khi cần.">
      <Card className="mb-4 rounded-2xl border-gray-100 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input
            allowClear
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            prefix={<SearchOutlined className="text-gray-400" />}
            placeholder="Nhập họ tên hoặc số điện thoại..."
            className="h-11 flex-1 rounded-xl"
            aria-label="Tìm người dùng theo tên hoặc số điện thoại"
          />
          <Select<IUser['role']>
            allowClear
            value={roleFilter}
            onChange={setRoleFilter}
            placeholder="Tất cả vai trò"
            suffixIcon={<TeamOutlined />}
            className="h-11 w-full md:w-64"
            options={[
              { value: 'USER', label: 'Người dùng' },
              { value: 'ADMIN', label: 'Quản trị viên' },
              { value: 'SCANNER', label: 'Nhân viên soát vé' },
            ]}
          />
        </div>
        <p className="mb-0 mt-3 text-xs font-semibold text-gray-400">
          {loading ? 'Đang tìm kiếm...' : `Tìm thấy ${users.length.toLocaleString('vi-VN')} tài khoản`}
        </p>
      </Card>
      <div className="space-y-3 md:hidden" aria-busy={loading}>
        {users.map((user) => (
          <Card
            key={user.id}
            size="small"
            className="overflow-hidden rounded-xl shadow-sm"
            title={<span className="break-words text-[#003078]">{user.fullName || `Người dùng #${user.id}`}</span>}
            extra={<Tag color={user.status === 'ACTIVE' ? 'green' : 'red'}>{user.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}</Tag>}
          >
            <Descriptions column={1} size="small" colon={false} className="admin-mobile-details">
              <Descriptions.Item label="ID">#{user.id}</Descriptions.Item>
              <Descriptions.Item label="Email"><span className="break-all">{user.email}</span></Descriptions.Item>
              <Descriptions.Item label="Điện thoại">{user.phoneNumber || '-'}</Descriptions.Item>
              <Descriptions.Item label="CCCD">{user.pendingCccd || user.cccd || '-'}</Descriptions.Item>
              <Descriptions.Item label="Duyệt CCCD">
                <Tag color={user.cccdStatus === 'VERIFIED' ? 'green' : user.cccdStatus === 'PENDING' ? 'gold' : user.cccdStatus === 'REJECTED' ? 'red' : 'default'}>
                  {cccdLabel(user.cccdStatus)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Địa chỉ"><span className="break-words">{user.address || '-'}</span></Descriptions.Item>
              <Descriptions.Item label="Vai trò">
                <Tag color={user.role === 'ADMIN' ? 'blue' : user.role === 'SCANNER' ? 'green' : 'default'}>{roleLabel(user.role)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">{user.createdAt ? dayjs(user.createdAt).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
            </Descriptions>
            <div className="mt-3 border-t border-gray-100 pt-3">{renderActions(user)}</div>
          </Card>
        ))}
        {!loading && users.length === 0 && <Card className="text-center text-gray-500">Chưa có người dùng.</Card>}
      </div>
      <div className="hidden md:block">
      <Table
        rowKey="id"
        dataSource={users}
        loading={loading}
        className="overflow-hidden rounded-xl bg-white shadow-md"
        scroll={{ x: 1500 }}
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
                  {cccdLabel(record.cccdStatus)}
                </Tag>
                {record.pendingCccd && <div className="mt-1 text-xs font-bold text-[#003078]">{record.pendingCccd}</div>}
              </div>
            )
          },
          { title: 'Địa chỉ', dataIndex: 'address', ellipsis: true, render: (value) => value || '-' },
          { title: 'Vai trò', dataIndex: 'role', render: (role) => <Tag color={role === 'ADMIN' ? 'blue' : role === 'SCANNER' ? 'green' : 'default'}>{roleLabel(role)}</Tag> },
          { title: 'Ngày tạo', dataIndex: 'createdAt', render: (value: string) => value ? dayjs(value).format('DD/MM/YYYY') : '-' },
          { title: 'Trạng thái', dataIndex: 'status', render: (status) => <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>{status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}</Tag> },
          {
            title: 'Hành động',
            render: (_, record) => renderActions(record)
          },
        ]}
      />
      </div>
    </AdminPageShell>
  );
}
