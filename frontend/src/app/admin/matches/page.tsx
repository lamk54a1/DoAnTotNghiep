'use client';
import AdminGuard from '../../../components/Common/AdminGuard';
import { Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select, Space, notification, Row, Col, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, RetweetOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import axiosClient from '../../../api/axiosClient';
import { IMatch } from '../../../interfaces/IMatch'; 
import dayjs from 'dayjs';

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<IMatch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingMatch, setEditingMatch] = useState<IMatch | null>(null);
  const [form] = Form.useForm();

  const fetchMatches = async () => {
    try {
      const data = await axiosClient.get<IMatch[]>('/matches');
      setMatches(data as unknown as IMatch[]);
    } catch (error) {
      console.error('Lỗi tải trận đấu:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (isMounted) fetchMatches();
    return () => { isMounted = false; };
  }, []);

  const openModal = (match: IMatch | null = null) => {
    setEditingMatch(match);
    if (match) {
      form.setFieldsValue({
        ...match,
        matchDate: dayjs(match.matchDate),
      });
    } else {
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleSave = async (values: Omit<IMatch, 'id'>) => { 
    try {
      const payload = {
        ...values,
        matchDate: (values.matchDate as any).toISOString ? (values.matchDate as any).toISOString() : values.matchDate,
      };

      if (editingMatch) {
        await axiosClient.put(`/matches/${editingMatch.id}`, payload);
        notification.success({ message: 'Cập nhật trận đấu thành công!' });
      } else {
        await axiosClient.post('/matches', payload);
        notification.success({ message: 'Thêm trận đấu mới thành công!' });
      }
      
      setIsModalOpen(false);
      setLoading(true);
      fetchMatches();
    } catch (error) {
      console.error(error);
    }
  };

  // HÀM MỚI: Xử lý gọi API khởi tạo vé cho Admin
  const handleGenerateTickets = async (matchId: number) => {
    try {
      notification.info({ 
        message: 'Đang khởi tạo...', 
        description: 'Hệ thống đang nạp hơn 2000 ghế vào CSDL, vui lòng chờ 1-2 giây.',
        duration: 2
      });
      
      // Gọi API POST tới Backend
      const res: any = await axiosClient.post(`/tickets/generate/${matchId}`);
      
      notification.success({ 
        message: 'Thành công!', 
        description: res.message || `Đã tạo kho vé thành công cho trận đấu #${matchId}` 
      });
    } catch (error: any) {
      notification.error({ 
        message: 'Lỗi khởi tạo', 
        description: error.response?.data?.message || 'Không thể tạo kho vé, vui lòng kiểm tra lại server!' 
      });
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: 'Đối thủ', dataIndex: 'opponent', key: 'opponent', className: 'font-bold' },
    { 
      title: 'Ngày thi đấu', 
      dataIndex: 'matchDate', 
      key: 'matchDate',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm') 
    },
    { title: 'Sân vận động', dataIndex: 'stadium', key: 'stadium' },
    { 
      title: 'Trạng thái', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => (
        <span className={`px-2 py-1 rounded text-xs font-bold ${status === 'ON_SALE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
          {status}
        </span>
      )
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: unknown, record: IMatch) => (
        <Space>
          <Button type="primary" icon={<EditOutlined />} onClick={() => openModal(record)}>
            Sửa
          </Button>

          {/* ĐÃ THÊM: Nút Khởi tạo vé bọc trong Popconfirm để chống bấm nhầm */}
          <Popconfirm
            title="Khởi tạo kho vé cho trận này?"
            description={<>Hành động này sẽ tạo mới <b>2000+ ghế trống</b>.<br/>Lưu ý: Chỉ nên bấm khi trận đấu chưa có ai mua vé.</>}
            onConfirm={() => handleGenerateTickets(record.id)}
            okText="Khởi tạo ngay"
            cancelText="Hủy bỏ"
            okButtonProps={{ className: 'bg-green-600' }}
          >
            <Button icon={<RetweetOutlined />} className="text-green-600 border-green-600 hover:bg-green-50 font-bold">
              Sinh vé
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AdminGuard>
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-black text-[#003078] uppercase">Quản lý lịch thi đấu SLNA</h1>
          <Button type="primary" icon={<PlusOutlined />} className="bg-[#003078]" onClick={() => openModal(null)}>
            Thêm trận đấu mới
          </Button>
        </div>

        <Table dataSource={matches} columns={columns} rowKey="id" loading={loading} className="shadow-md bg-white rounded-xl overflow-hidden" />

        <Modal
          title={editingMatch ? "CẬP NHẬT TRẬN ĐẤU" : "THÊM TRẬN ĐẤU MỚI"}
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          destroyOnClose
        >
          <Form form={form} layout="vertical" onFinish={handleSave} className="mt-4">
            <Form.Item name="opponent" label="Tên đội đối thủ" rules={[{ required: true, message: 'Vui lòng nhập tên đối thủ!' }]}>
              <Input placeholder="Ví dụ: Hà Nội FC, Nam Định FC..." />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="matchDate" label="Thời gian diễn ra" rules={[{ required: true }]}>
                  <DatePicker showTime className="w-full" format="YYYY-MM-DD HH:mm:ss" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="stadium" label="Sân vận động" initialValue="Sân vận động Vinh">
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="ticketPriceMin" label="Giá vé thấp nhất (VND)" rules={[{ required: true }]}>
                  <InputNumber className="w-full" min={0} step={10000} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="status" label="Trạng thái mở bán" initialValue="ON_SALE">
                  <Select>
                    <Select.Option value="UPCOMING">Sắp diễn ra</Select.Option>
                    <Select.Option value="ON_SALE">Đang mở bán vé</Select.Option>
                    <Select.Option value="SOLD_OUT">Hết vé</Select.Option>
                    <Select.Option value="FINISHED">Đã kết thúc</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item className="text-right mb-0 mt-4">
              <Space>
                <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
                <Button type="primary" htmlType="submit" className="bg-[#003078]">Lưu thông tin</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AdminGuard>
  );
}