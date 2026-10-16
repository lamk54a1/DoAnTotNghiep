'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Card, Descriptions, Table, Tag } from 'antd';
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
      <div className="space-y-3 md:hidden" aria-busy={loading}>
        {logs.map((log) => (
          <Card
            key={log.id}
            size="small"
            className="overflow-hidden rounded-xl shadow-sm"
            title={<Tag color="blue" className="m-0 max-w-full whitespace-normal break-words">{log.action}</Tag>}
            extra={<span className="text-xs text-gray-500">#{log.id}</span>}
          >
            <Descriptions column={1} size="small" colon={false} className="admin-mobile-details">
              <Descriptions.Item label="Thời gian">{dayjs(log.createdAt).format('DD/MM/YYYY HH:mm:ss')}</Descriptions.Item>
              <Descriptions.Item label="Người thao tác"><span className="break-all">{log.userEmail || 'Hệ thống'}</span></Descriptions.Item>
              <Descriptions.Item label="Đối tượng">{log.entityType || '-'} #{log.entityId || '-'}</Descriptions.Item>
              <Descriptions.Item label="Dữ liệu">
                <pre className="m-0 max-w-full whitespace-pre-wrap break-all rounded-lg bg-gray-50 p-2 text-xs leading-5">
                  {JSON.stringify(log.metadata || {}, null, 2)}
                </pre>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        ))}
        {!loading && logs.length === 0 && <Card className="text-center text-gray-500">Chưa có nhật ký hoạt động.</Card>}
      </div>
      <div className="hidden md:block">
      <Table
        rowKey="id"
        dataSource={logs}
        loading={loading}
        className="overflow-hidden rounded-xl bg-white shadow-md"
        scroll={{ x: 1100 }}
        columns={[
          { title: 'Thời gian', dataIndex: 'createdAt', render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm:ss') },
          { title: 'Người thao tác', dataIndex: 'userEmail', render: (value) => value || 'Hệ thống' },
          { title: 'Hành động', dataIndex: 'action', render: (value: string) => <Tag color="blue">{value}</Tag> },
          { title: 'Đối tượng', render: (_, record) => `${record.entityType || '-'} #${record.entityId || '-'}` },
          { title: 'Dữ liệu', dataIndex: 'metadata', render: (value) => <pre className="m-0 max-w-md whitespace-pre-wrap break-all text-xs">{JSON.stringify(value || {}, null, 2)}</pre> },
        ]}
      />
      </div>
    </AdminPageShell>
  );
}
