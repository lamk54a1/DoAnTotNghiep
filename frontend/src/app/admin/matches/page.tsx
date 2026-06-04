'use client';
import AdminPageShell from '../../../components/Admin/AdminPageShell';
import { App as AntApp, Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select, Space, Row, Col, Popconfirm, Avatar, Tag, Checkbox } from 'antd';
import { PlusOutlined, EditOutlined, RetweetOutlined, DeleteOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import axios from 'axios';
import axiosClient from '../../../api/axiosClient';
import { IMatch } from '../../../interfaces/IMatch'; 
import dayjs from 'dayjs';

const STAND_OPTIONS = [
  { label: 'Khán đài A - 8.000 vé', value: 'A' },
  { label: 'Khán đài B - 6.000 vé', value: 'B' },
  { label: 'Khán đài C - 3.000 vé', value: 'C' },
  { label: 'Khán đài D - 3.000 vé', value: 'D' },
];

export default function AdminMatchesPage() {
  const { notification } = AntApp.useApp();
  const [matches, setMatches] = useState<IMatch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState<boolean>(false);
  const [editingMatch, setEditingMatch] = useState<IMatch | null>(null);
  const [generatingMatch, setGeneratingMatch] = useState<IMatch | null>(null);
  const [selectedGenerateStands, setSelectedGenerateStands] = useState<string[]>(['A', 'B', 'C', 'D']);
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
    void Promise.resolve().then(fetchMatches);
  }, []);

  const openModal = (match: IMatch | null = null) => {
    setEditingMatch(match);
    if (match) {
      form.setFieldsValue({
        ...match,
        matchDate: dayjs(match.matchDate),
        freeStands: match.freeStands || [],
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ stadium: 'Sân vận động Vinh', status: 'ON_SALE', freeStands: [] });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (values: Omit<IMatch, 'id'>) => { 
    try {
      const payload = {
        ...values,
        matchDate: dayjs(values.matchDate).toISOString(),
      };

      if (editingMatch) {
        await axiosClient.put(`/matches/${editingMatch.id}`, payload);
        notification.success({ title: 'Cập nhật trận đấu thành công!' });
      } else {
        await axiosClient.post('/matches', payload);
        notification.success({ title: 'Thêm trận đấu mới thành công!' });
      }
      
      setIsModalOpen(false);
      setLoading(true);
      fetchMatches();
    } catch (error) {
      console.error(error);
    }
  };

  const openGenerateModal = (match: IMatch) => {
    setGeneratingMatch(match);
    setSelectedGenerateStands(['A', 'B', 'C', 'D']);
    setIsGenerateModalOpen(true);
  };

  const handleGenerateTickets = async () => {
    if (!generatingMatch) return;
    try {
      notification.info({ 
        title: 'Đang khởi tạo...',
        description: `Hệ thống đang bổ sung vé cho khán đài ${selectedGenerateStands.join(', ')}, vui lòng chờ.`,
        duration: 2
      });
      
      const res = await axiosClient.post<{ message?: string }>(`/tickets/generate/${generatingMatch.id}`, {
        stands: selectedGenerateStands,
      }) as unknown as { message?: string };
      
      notification.success({ 
        title: 'Thành công!',
        description: res.message || `Đã tạo kho vé thành công cho trận đấu #${generatingMatch.id}` 
      });
      setIsGenerateModalOpen(false);
    } catch (error: unknown) {
      notification.error({ 
        title: 'Lỗi khởi tạo',
        description: axios.isAxiosError(error) ? error.response?.data?.message : 'Không thể tạo kho vé, vui lòng kiểm tra lại server!'
      });
    }
  };

  const handleDelete = async (matchId: number) => {
    try {
      await axiosClient.delete(`/matches/${matchId}`);
      notification.success({ title: 'Đã xóa trận đấu!' });
      setLoading(true);
      fetchMatches();
    } catch (error) {
      console.error(error);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    {
      title: 'Đối thủ',
      dataIndex: 'opponent',
      key: 'opponent',
      render: (opponent: string, record: IMatch) => (
        <Space>
          <Avatar src={record.opponentLogo} size={36}>{opponent.charAt(0)}</Avatar>
          <span className="font-bold">{opponent}</span>
        </Space>
      )
    },
    { 
      title: 'Ngày thi đấu', 
      dataIndex: 'matchDate', 
      key: 'matchDate',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm') 
    },
    { title: 'Sân vận động', dataIndex: 'stadium', key: 'stadium' },
    {
      title: 'Tỷ số',
      key: 'score',
      render: (_: unknown, record: IMatch) => (
        record.homeScore != null && record.awayScore != null
          ? <Tag color="blue">SLNA {record.homeScore} - {record.awayScore} {record.opponent}</Tag>
          : <span className="text-gray-400">Chưa cập nhật</span>
      )
    },
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
      title: 'Miễn phí',
      dataIndex: 'freeStands',
      key: 'freeStands',
      render: (freeStands: string[] = []) => (
        freeStands.length > 0
          ? <Tag color="gold">Khán đài {freeStands.join(', ')}</Tag>
          : <span className="text-gray-400">Không</span>
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

          <Button icon={<RetweetOutlined />} onClick={() => openGenerateModal(record)} className="text-green-600 border-green-600 hover:bg-green-50 font-bold">
              Sinh vé
            </Button>
          <Popconfirm
            title="Xóa trận đấu này?"
            description="Chỉ có thể xóa trận chưa có vé được đặt hoặc bán."
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AdminPageShell
      title="Quản lý lịch thi đấu SLNA"
      subtitle="Thêm lịch, logo đội khách, banner, tỷ số và khởi tạo kho vé."
      extra={
          <Button type="primary" icon={<PlusOutlined />} className="bg-[#003078]" onClick={() => openModal(null)}>
            Thêm trận đấu mới
          </Button>
      }
    >

        <Table dataSource={matches} columns={columns} rowKey="id" loading={loading} className="shadow-md bg-white rounded-xl overflow-hidden" />

        <Modal
          title={editingMatch ? "CẬP NHẬT TRẬN ĐẤU" : "THÊM TRẬN ĐẤU MỚI"}
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          destroyOnHidden
          forceRender
          width={760}
        >
          <Form form={form} layout="vertical" onFinish={handleSave} className="mt-4">
            <Form.Item name="opponent" label="Tên đội đối thủ" rules={[{ required: true, message: 'Vui lòng nhập tên đối thủ!' }]}>
              <Input placeholder="Ví dụ: Hà Nội FC, Nam Định FC..." />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="opponentLogo" label="Logo đội khách (URL)">
                  <Input placeholder="https://.../logo.png" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="bannerImage" label="Ảnh banner trận đấu (URL)">
                  <Input placeholder="https://.../banner.jpg" />
                </Form.Item>
              </Col>
            </Row>

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

            <Form.Item name="description" label="Mô tả trận đấu">
              <Input.TextArea rows={2} placeholder="Ví dụ: Vòng 15 V-League" />
            </Form.Item>

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

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="homeScore" label="Tỷ số SLNA">
                  <InputNumber className="w-full" min={0} placeholder="Để trống nếu chưa thi đấu" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="awayScore" label="Tỷ số đội khách">
                  <InputNumber className="w-full" min={0} placeholder="Để trống nếu chưa thi đấu" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="freeStands"
              label="Khán đài miễn phí vé"
              extra="Có thể để trống nếu trận này không miễn phí khán đài nào. Khi sinh vé, các ghế thuộc khán đài được chọn sẽ có giá 0đ."
            >
              <Checkbox.Group options={STAND_OPTIONS} />
            </Form.Item>

            <Form.Item className="text-right mb-0 mt-4">
              <Space>
                <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
                <Button type="primary" htmlType="submit" className="bg-[#003078]">Lưu thông tin</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="CHỌN KHÁN ĐÀI CẦN SINH VÉ"
          open={isGenerateModalOpen}
          onCancel={() => setIsGenerateModalOpen(false)}
          onOk={handleGenerateTickets}
          okText="Sinh vé ngay"
          cancelText="Hủy"
          okButtonProps={{ className: 'bg-green-600', disabled: selectedGenerateStands.length === 0 }}
          destroyOnHidden
        >
          <div className="space-y-4 py-2">
            <p className="m-0 text-sm text-gray-600">
              Trận: <b>SLNA vs {generatingMatch?.opponent}</b>. Hệ thống chỉ bổ sung ghế còn thiếu, giữ nguyên vé đã bán.
            </p>
            <Checkbox.Group
              options={STAND_OPTIONS}
              value={selectedGenerateStands}
              onChange={(values) => setSelectedGenerateStands(values as string[])}
              className="grid grid-cols-1 gap-3"
            />
            <div className="rounded-xl bg-yellow-50 p-3 text-xs font-bold text-yellow-800">
              Khán đài miễn phí hiện tại: {generatingMatch?.freeStands?.length ? generatingMatch.freeStands.join(', ') : 'Không có'}.
            </div>
          </div>
        </Modal>
    </AdminPageShell>
  );
}
