'use client';
import AdminGuard from '../../../components/Common/AdminGuard';
import { Card, Row, Col, Statistic, Table, Spin, Button, Space, notification, Popconfirm } from 'antd';
import { DollarOutlined, UserOutlined, TagOutlined, LoadingOutlined, PlusOutlined, EditOutlined, RetweetOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import axiosClient from '../../../api/axiosClient';
import dayjs from 'dayjs';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>({ totalRevenue: 0, totalTicketsSold: 0, totalUsers: 0 });
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const fetchData = async () => {
    try {
      // Gọi cả 2 API cùng lúc
      const [statsRes, matchesRes] = await Promise.all([
        axiosClient.get('/admin/stats'),
        axiosClient.get('/matches')
      ]);
      setStats(statsRes);
      setMatches(matchesRes as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchData();
  }, []);

  const handleGenerateTickets = async (matchId: number) => {
    try {
      await axiosClient.post(`/tickets/generate/${matchId}`);
      notification.success({ message: `Đã khởi tạo xong kho vé cho trận #${matchId}` });
    } catch (err) {
      notification.error({ message: 'Lỗi khởi tạo vé' });
    }
  };

  if (!isMounted) return <div className="flex justify-center items-center h-screen"><Spin /></div>;

  return (
    <AdminGuard>
      <div className="p-8 bg-gray-50 min-h-screen">
        <h1 className="text-2xl font-black text-[#003078] mb-8 uppercase tracking-tight">Bảng Điều Khiển Quản Trị</h1>

        {/* PHẦN THỐNG KÊ */}
        <Row gutter={16} className="mb-8">
          <Col span={8}><Card className="shadow-md border-t-4 border-blue-600"><Statistic title="Doanh Thu" value={stats.totalRevenue} prefix={<DollarOutlined />} suffix="VND" valueStyle={{color: '#3f8600'}} /></Card></Col>
          <Col span={8}><Card className="shadow-md border-t-4 border-yellow-500"><Statistic title="Vé Đã Bán" value={stats.totalTicketsSold} prefix={<TagOutlined />} suffix="Vé" /></Card></Col>
          <Col span={8}><Card className="shadow-md border-t-4 border-green-500"><Statistic title="Người Dùng" value={stats.totalUsers} prefix={<UserOutlined />} suffix="User" /></Card></Col>
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
              { title: 'Hành động', render: (_, record: any) => (
                <Space>
                  <Popconfirm title="Sinh vé cho trận này?" onConfirm={() => handleGenerateTickets(record.id)}>
                    <Button icon={<RetweetOutlined />} size="small">Sinh vé</Button>
                  </Popconfirm>
                </Space>
              )}
            ]}
          />
        </div>
      </div>
    </AdminGuard>
  );
}