'use client';
import AdminPageShell from '../../../components/Admin/AdminPageShell';
import { App as AntApp, Card, Row, Col, Statistic, Table, Button, Space, Popconfirm, Select } from 'antd';
import { DollarOutlined, UserOutlined, TagOutlined, PlusOutlined, RetweetOutlined, ShoppingOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import axiosClient from '../../../api/axiosClient';
import { IMatch } from '../../../interfaces/IMatch';
import dayjs from 'dayjs';
import axios from 'axios';

interface DashboardStats {
  totalRevenue: number;
  totalTicketsSold: number;
  totalUsers: number;
  pendingOrders: number;
  monthlyRevenue?: Array<{ month: string; revenue: number }>;
  ticketsByMatch?: Array<{ id: number; opponent: string; ticketsSold: number }>;
}

export default function AdminDashboard() {
  const { notification } = AntApp.useApp();
  const [stats, setStats] = useState<DashboardStats>({ totalRevenue: 0, totalTicketsSold: 0, totalUsers: 0, pendingOrders: 0 });
  const [matches, setMatches] = useState<IMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(new Date().getFullYear());
  const [selectedMatchId, setSelectedMatchId] = useState<number | undefined>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.set('year', String(selectedYear));
      if (selectedMatchId) params.set('matchId', String(selectedMatchId));

      const [statsResult, matchesResult] = await Promise.allSettled([
        axiosClient.get(`/admin/stats?${params.toString()}`),
        axiosClient.get('/matches'),
      ]);

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value as unknown as DashboardStats);
      } else if (axios.isAxiosError(statsResult.reason) && statsResult.reason.response?.status === 403) {
        notification.warning({
          message: 'Phiên quản trị không hợp lệ',
          description: 'Vui lòng đăng xuất rồi đăng nhập lại bằng tài khoản admin.',
        });
      } else {
        notification.error({ message: 'Không thể tải thống kê doanh thu.' });
      }

      if (matchesResult.status === 'fulfilled') {
        setMatches(matchesResult.value as unknown as IMatch[]);
      } else {
        notification.error({ message: 'Không thể tải danh sách trận đấu cho bộ lọc.' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [notification, selectedMatchId, selectedYear]);

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

        <Row gutter={16} className="mb-8">
          <Col xs={24} lg={12}>
            <Card title={<span className="font-black uppercase text-[#003078]">Doanh thu theo tháng</span>} className="mb-4 shadow-md">
              <div className="space-y-3">
                {(stats.monthlyRevenue || []).map((item) => {
                  const maxRevenue = Math.max(...(stats.monthlyRevenue || []).map((row) => Number(row.revenue)), 1);
                  return (
                    <div key={item.month}>
                      <div className="mb-1 flex justify-between text-xs font-bold text-gray-500">
                        <span>{item.month}</span>
                        <span>{Number(item.revenue).toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-[#003078]" style={{ width: `${Math.max(4, (Number(item.revenue) / maxRevenue) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
                {(stats.monthlyRevenue || []).length === 0 && <p className="text-sm text-gray-400">Chưa có dữ liệu doanh thu.</p>}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title={<span className="font-black uppercase text-[#003078]">Vé bán theo trận</span>} className="mb-4 shadow-md">
              <div className="space-y-3">
                {(stats.ticketsByMatch || []).map((item) => {
                  const maxTickets = Math.max(...(stats.ticketsByMatch || []).map((row) => Number(row.ticketsSold)), 1);
                  return (
                    <div key={item.id}>
                      <div className="mb-1 flex justify-between text-xs font-bold text-gray-500">
                        <span>SLNA vs {item.opponent}</span>
                        <span>{item.ticketsSold} vé</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-[#edbb00]" style={{ width: `${Math.max(4, (Number(item.ticketsSold) / maxTickets) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
                {(stats.ticketsByMatch || []).length === 0 && <p className="text-sm text-gray-400">Chưa có dữ liệu vé bán.</p>}
              </div>
            </Card>
          </Col>
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
