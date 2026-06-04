'use client';
import AdminPageShell from '../../../components/Admin/AdminPageShell';
import { App as AntApp, Card, Row, Col, Statistic, Table, Button, Space, Popconfirm, Select } from 'antd';
import { DollarOutlined, UserOutlined, TagOutlined, PlusOutlined, RetweetOutlined, ShoppingOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
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
  const [selectedYear, setSelectedYear] = useState<number | undefined>(new Date().getFullYear());
  const [selectedMatchId, setSelectedMatchId] = useState<number | undefined>();

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.set('year', String(selectedYear));
      if (selectedMatchId) params.set('matchId', String(selectedMatchId));

      // Gọi cả 2 API cùng lúc
      const [statsRes, matchesRes] = await Promise.all([
        axiosClient.get(`/admin/stats?${params.toString()}`),
        axiosClient.get('/matches')
      ]);
      setStats(statsRes as unknown as DashboardStats);
      setMatches(matchesRes as unknown as IMatch[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedMatchId, selectedYear]);

  useEffect(() => {
    void Promise.resolve().then(fetchData);
  }, [fetchData]);

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
        <Card className="mb-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="m-0 text-lg font-black uppercase text-[#003078]">Bộ lọc doanh thu</h2>
              <p className="mt-1 text-sm text-gray-500">Xem doanh thu theo năm hoặc theo từng trận đấu.</p>
            </div>
            <Space wrap>
              <Select
                allowClear
                placeholder="Tất cả các năm"
                className="w-40"
                value={selectedYear}
                onChange={setSelectedYear}
                options={Array.from({ length: 6 }, (_, index) => {
                  const year = new Date().getFullYear() - index;
                  return { value: year, label: `Năm ${year}` };
                })}
              />
              <Select
                allowClear
                showSearch
                placeholder="Tất cả trận đấu"
                className="w-72"
                value={selectedMatchId}
                optionFilterProp="label"
                onChange={setSelectedMatchId}
                options={matches.map((match) => ({
                  value: match.id,
                  label: `SLNA vs ${match.opponent} - ${dayjs(match.matchDate).format('DD/MM/YYYY')}`,
                }))}
              />
            </Space>
          </div>
        </Card>

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
