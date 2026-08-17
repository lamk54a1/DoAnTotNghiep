'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Table, Tag } from 'antd';
import AdminPageShell from '../../../components/Admin/AdminPageShell';
import axiosClient from '../../../api/axiosClient';

interface AuditLog {
  id: number;
  userEmail?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get<AuditLog[]>('/admin/audit-logs')
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminPageShell title="Lịch sử hoạt động" subtitle="Theo dõi các thao tác quan trọng trong hệ thống.">
      <Table
        rowKey="id"
        dataSource={logs}
        loading={loading}
        className="overflow-hidden rounded-xl bg-white shadow-md"
        columns={[
          { title: 'Thời gian', dataIndex: 'createdAt', render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm:ss') },
          { title: 'Người thao tác', dataIndex: 'userEmail', render: (value) => value || 'Hệ thống' },
          { title: 'Hành động', dataIndex: 'action', render: (value: string) => <Tag color="blue">{value}</Tag> },
          { title: 'Đối tượng', render: (_, record) => `${record.entityType || '-'} #${record.entityId || '-'}` },
          { title: 'Dữ liệu', dataIndex: 'metadata', render: (value) => <pre className="m-0 max-w-md whitespace-pre-wrap text-xs">{JSON.stringify(value || {}, null, 2)}</pre> },
        ]}
      />
    </AdminPageShell>
  );
}
