'use client';
import AdminPageShell from '../../../components/Admin/AdminPageShell';
import { App as AntApp, Card, Row, Col, Statistic, Table, Button, Space, Popconfirm } from 'antd';
import { DollarOutlined, UserOutlined, TagOutlined, PlusOutlined, RetweetOutlined, ShoppingOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import axiosClient from '../../../api/axiosClient';
import { IMatch } from '../../../interfaces/IMatch';
import dayjs from 'dayjs';

interface DashboardStats {
  totalRevenue: number;
  totalTicketsSold: number;
  totalUsers: number;
  pendingOrders: number;
}

export default function AdminDashboard() {
  const { notification } = AntApp.useApp();
  const [stats, setStats] = useState<DashboardStats>({ totalRevenue: 0, totalTicketsSold: 0, totalUsers: 0, pendingOrders: 0 });
  const [matches, setMatches] = useState<IMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // Gọi cả 2 API cùng lúc
      const [statsRes, matchesRes] = await Promise.all([
        axiosClient.get('/admin/stats'),
        axiosClient.get('/matches')
      ]);
      setStats(statsRes as unknown as DashboardStats);
      setMatches(matchesRes as unknown as IMatch[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchData);
  }, []);

  const handleGenerateTickets = async (matchId: number) => {
    try {
      await axiosClient.post(`/tickets/generate/${matchId}`);
      notification.success({ title: `Đã khởi tạo xong kho vé cho trận #${matchId}` });
    } catch {
      notification.error({ title: 'Lỗi khởi tạo vé' });
    }
  };

  return (
    <AdminPageShell title="Bảng điều khiển quản trị" subtitle="Theo dõi nhanh hoạt động bán vé của câu lạc bộ.">
        {/* PHẦN THỐNG KÊ */}
        <Row gutter={16} className="mb-8">
          <Col xs={24} md={12} xl={6}><Card className="mb-4 border-t-4 border-blue-600 shadow-md"><Statistic title="Doanh Thu" value={stats.totalRevenue} prefix={<DollarOutlined />} suffix="VND" styles={{ content: { color: '#3f8600' } }} /></Card></Col>
          <Col xs={24} md={12} xl={6}><Card className="mb-4 border-t-4 border-yellow-500 shadow-md"><Statistic title="Vé Đã Bán" value={stats.totalTicketsSold} prefix={<TagOutlined />} suffix="Vé" /></Card></Col>
          <Col xs={24} md={12} xl={6}><Card className="mb-4 border-t-4 border-green-500 shadow-md"><Statistic title="Người Dùng" value={stats.totalUsers} prefix={<UserOutlined />} suffix="User" /></Card></Col>
          <Col xs={24} md={12} xl={6}><Card className="mb-4 border-t-4 border-orange-500 shadow-md"><Statistic title="Đơn Chờ Xử Lý" value={stats.pendingOrders} prefix={<ShoppingOutlined />} suffix="Đơn" /></Card></Col>
        </Row>

        {/* PHẦN DANH SÁCH TRẬN ĐẤU (TÍCH HỢP NGAY TẠI DASHBOARD) */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="flex justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-700">Danh sách trận đấu</h2>
            <Button type="primary" icon={<PlusOutlined />} href="/admin/matches">Quản lý lịch thi đấu</Button>
          </div>
          <Table 
            dataSource={matches} 
            loading={loading}
            rowKey="id"
            columns={[
              { title: 'Đối thủ', dataIndex: 'opponent' },
              { title: 'Ngày', dataIndex: 'matchDate', render: (d) => dayjs(d).format('DD/MM/YYYY') },
              { title: 'Hành động', render: (_, record: IMatch) => (
                <Space>
                  <Popconfirm title="Sinh vé cho trận này?" onConfirm={() => handleGenerateTickets(record.id)}>
                    <Button icon={<RetweetOutlined />} size="small">Sinh vé</Button>
                  </Popconfirm>
                </Space>
              )}
            ]}
          />
        </div>
    </AdminPageShell>
  );
}
