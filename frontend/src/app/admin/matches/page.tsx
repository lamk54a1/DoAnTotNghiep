'use client';
import AdminPageShell from '../../../components/Admin/AdminPageShell';
import { App as AntApp, Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select, Space, Row, Col, Popconfirm, Avatar, Tag, Checkbox, Upload } from 'antd';
import { PlusOutlined, EditOutlined, RetweetOutlined, DeleteOutlined, UploadOutlined, FilePdfOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useEffect, useState } from 'react';
import axios from 'axios';
import axiosClient, { API_ORIGIN } from '../../../api/axiosClient';
import { IMatch } from '../../../interfaces/IMatch'; 
import { ITicketInventory } from '../../../interfaces/ITicketInventory';
import dayjs from 'dayjs';
import PrintableTicket from '../../../components/Tickets/PrintableTicket';
import { ISponsor } from '../../../interfaces/ISponsor';

const STAND_OPTIONS = [
  { label: 'Khán đài A - 8.000 vé', value: 'A' },
  { label: 'Khán đài B - 6.000 vé', value: 'B' },
  { label: 'Khán đài C - 3.000 vé', value: 'C' },
  { label: 'Khán đài D - 3.000 vé', value: 'D' },
];

const DEFAULT_STAND_PRICES = {
  A: 100000,
  B: 50000,
  C: 20000,
  D: 20000,
};

interface PaperTicket {
  id: number;
  seatCode: string;
  sector: string;
  row: string;
  seatNumber: number;
  price: number;
  status: 'PAPER_RESERVED' | 'PAPER_SOLD';
  ticketQrCode: string;
  opponent: string;
  matchDate: string;
  stadium: string;
  competitionName?: string;
  isPrinted: boolean;
  printedAt?: string;
}

const EMPTY_INVENTORY: ITicketInventory = {
  A: { total: 0, available: 0, sold: 0, paperReserved: 0, paperSold: 0, paperPrinted: 0, paperReservedPrinted: 0, scanned: 0, revenue: 0, paperRevenue: 0 },
  B: { total: 0, available: 0, sold: 0, paperReserved: 0, paperSold: 0, paperPrinted: 0, paperReservedPrinted: 0, scanned: 0, revenue: 0, paperRevenue: 0 },
  C: { total: 0, available: 0, sold: 0, paperReserved: 0, paperSold: 0, paperPrinted: 0, paperReservedPrinted: 0, scanned: 0, revenue: 0, paperRevenue: 0 },
  D: { total: 0, available: 0, sold: 0, paperReserved: 0, paperSold: 0, paperPrinted: 0, paperReservedPrinted: 0, scanned: 0, revenue: 0, paperRevenue: 0 },
};

const hasFullScore = (homeScore?: number | null, awayScore?: number | null) => (
  homeScore !== null
  && homeScore !== undefined
  && awayScore !== null
  && awayScore !== undefined
);

export default function AdminMatchesPage() {
  const { notification } = AntApp.useApp();
  const [matches, setMatches] = useState<IMatch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState<boolean>(false);
  const [editingMatch, setEditingMatch] = useState<IMatch | null>(null);
  const [generatingMatch, setGeneratingMatch] = useState<IMatch | null>(null);
  const [inventoryMatch, setInventoryMatch] = useState<IMatch | null>(null);
  const [inventory, setInventory] = useState<ITicketInventory>(EMPTY_INVENTORY);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [paperStand, setPaperStand] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [paperQuantity, setPaperQuantity] = useState(100);
  const [updatingPaperTickets, setUpdatingPaperTickets] = useState(false);
  const [paperTickets, setPaperTickets] = useState<PaperTicket[]>([]);
  const [sponsors, setSponsors] = useState<ISponsor[]>([]);
  const [isPaperPrintOpen, setIsPaperPrintOpen] = useState(false);
  const [loadingPaperTickets, setLoadingPaperTickets] = useState(false);
  const [selectedGenerateStands, setSelectedGenerateStands] = useState<string[]>(['A', 'B', 'C', 'D']);
  const [form] = Form.useForm();

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);

    const res = await axiosClient.post('/uploads/match-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }) as unknown as { path: string };

    return res.path.startsWith('http') ? res.path : `${API_ORIGIN}${res.path}`;
  };

  const createUploadProps = (fieldName: 'opponentLogo' | 'bannerImage'): UploadProps => ({
    accept: 'image/*',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: async (file) => {
      try {
        const imageUrl = await uploadImage(file);
        form.setFieldValue(fieldName, imageUrl);
        notification.success({ title: 'Upload ảnh thành công', description: imageUrl });
      } catch (error) {
        notification.error({
          title: 'Upload ảnh thất bại',
          description: axios.isAxiosError(error) ? error.response?.data?.message : 'Vui lòng thử lại với ảnh khác.',
        });
      }

      return false;
    },
  });

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
        standPrices: { ...DEFAULT_STAND_PRICES, ...(match.standPrices || {}) },
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        stadium: 'Sân vận động Vinh',
        status: 'ON_SALE',
        competitionName: 'V-League 2026',
        freeStands: [],
        standPrices: DEFAULT_STAND_PRICES,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (values: Omit<IMatch, 'id'>) => { 
    try {
      const payload = {
        ...values,
        matchDate: dayjs(values.matchDate).toISOString(),
        status: hasFullScore(values.homeScore, values.awayScore) ? 'FINISHED' : values.status,
      };

      if (editingMatch) {
        await axiosClient.put(`/matches/${editingMatch.id}`, payload);
        notification.success({
          title: 'Cập nhật trận đấu thành công!',
          description: hasFullScore(values.homeScore, values.awayScore)
            ? 'Trận đấu đã được tự chuyển sang trạng thái Đã kết thúc.'
            : undefined,
        });
      } else {
        await axiosClient.post('/matches', payload);
        notification.success({
          title: 'Thêm trận đấu mới thành công!',
          description: hasFullScore(values.homeScore, values.awayScore)
            ? 'Trận đấu đã được tự chuyển sang trạng thái Đã kết thúc.'
            : undefined,
        });
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

  const loadInventory = async (matchId: number) => {
    try {
      const data = await axiosClient.get<ITicketInventory>(`/tickets/admin/inventory/${matchId}`);
      setInventory({ ...EMPTY_INVENTORY, ...(data as unknown as Partial<ITicketInventory>) });
    } finally {
      setLoadingInventory(false);
    }
  };

  const openInventoryModal = async (match: IMatch) => {
    setInventoryMatch(match);
    setPaperStand('A');
    setLoadingInventory(true);
    await loadInventory(match.id);
  };

  const handleUpdatePaperTickets = async (mode: 'RESERVE' | 'RELEASE' | 'MARK_SOLD' | 'UNMARK_SOLD') => {
    if (!inventoryMatch) return;
    try {
      setUpdatingPaperTickets(true);
      const res = await axiosClient.patch<{ message: string }>(`/tickets/paper/${inventoryMatch.id}`, {
        stand: paperStand,
        quantity: paperQuantity,
        mode,
      }) as unknown as { message?: string };
      notification.success({
        title: {
          RESERVE: 'Đã giữ vé giấy',
          RELEASE: 'Đã trả vé về online',
          MARK_SOLD: 'Đã ghi nhận bán giấy',
          UNMARK_SOLD: 'Đã hoàn trạng thái vé giấy',
        }[mode],
        description: res.message,
      });
      setLoadingInventory(true);
      await loadInventory(inventoryMatch.id);
    } catch (error) {
      notification.error({
        title: 'Không thể cập nhật vé giấy',
        description: axios.isAxiosError(error) ? error.response?.data?.message : 'Vui lòng thử lại.',
      });
    } finally {
      setUpdatingPaperTickets(false);
    }
  };

  const openPaperPrintModal = async () => {
    if (!inventoryMatch) return;
    try {
      setLoadingPaperTickets(true);
      setIsPaperPrintOpen(true);
      const [ticketData, sponsorData] = await Promise.all([
        axiosClient.get<PaperTicket[]>(`/tickets/paper/${inventoryMatch.id}?stand=${paperStand}`),
        axiosClient.get<ISponsor[]>('/sponsors'),
      ]);
      setPaperTickets(ticketData as unknown as PaperTicket[]);
      setSponsors(sponsorData as unknown as ISponsor[]);
    } catch (error) {
      notification.error({
        title: 'Không thể tải vé giấy',
        description: axios.isAxiosError(error) ? error.response?.data?.message : 'Vui lòng thử lại.',
      });
    } finally {
      setLoadingPaperTickets(false);
    }
  };

  const printPaperTickets = async () => {
    if (!inventoryMatch || paperTickets.length === 0) return;
    try {
      setLoadingPaperTickets(true);
      const response = await axiosClient.post(`/tickets/paper/${inventoryMatch.id}/print`, {
        ticketIds: paperTickets.map((ticket) => ticket.id),
      }) as unknown as { message?: string };
      setPaperTickets((current) => current.map((ticket) => ({ ...ticket, isPrinted: true })));
      await loadInventory(inventoryMatch.id);
      notification.warning({
        title: 'Vé đã được khóa sau khi in',
        description: response.message,
        duration: 6,
      });
      window.setTimeout(() => window.print(), 100);
    } catch (error) {
      notification.error({
        title: 'Không thể in vé PDF',
        description: axios.isAxiosError(error) ? error.response?.data?.message : 'Vui lòng thử lại.',
      });
    } finally {
      setLoadingPaperTickets(false);
    }
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
    } catch (error: unknown) {
      notification.error({
        title: 'Không thể xóa trận đấu',
        description: axios.isAxiosError(error)
          ? error.response?.data?.message || 'Trận đấu đã phát sinh dữ liệu vé.'
          : 'Vui lòng thử lại sau.',
      });
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    {
      title: 'Đối thủ',
      dataIndex: 'opponent',
      key: 'opponent',
      width: 190,
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
      width: 140,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm') 
    },
    { title: 'Sân vận động', dataIndex: 'stadium', key: 'stadium', width: 120 },
    {
      title: 'Giải đấu',
      dataIndex: 'competitionName',
      key: 'competitionName',
      width: 130,
      render: (value: string) => value || 'V-League 2026',
    },
    {
      title: 'Tỷ số',
      key: 'score',
      width: 220,
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
      width: 120,
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
      width: 100,
      render: (freeStands: string[] = []) => (
        freeStands.length > 0
          ? <Tag color="gold">Khán đài {freeStands.join(', ')}</Tag>
          : <span className="text-gray-400">Không</span>
      )
    },
    {
      title: 'Hành động',
      key: 'action',
      fixed: 'right' as const,
      width: 390,
      render: (_: unknown, record: IMatch) => (
        <Space wrap size={[8, 8]}>
          <Button type="primary" icon={<EditOutlined />} onClick={() => openModal(record)}>
            Sửa
          </Button>

          <Button icon={<RetweetOutlined />} onClick={() => openGenerateModal(record)} className="text-green-600 border-green-600 hover:bg-green-50 font-bold">
              Sinh vé
            </Button>
          <Button onClick={() => openInventoryModal(record)}>
            Tồn kho
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

        <Table
          dataSource={matches}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1480 }}
          className="shadow-md bg-white rounded-xl overflow-hidden"
        />

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

            <Form.Item name="competitionName" label="Tên giải đấu" rules={[{ required: true, message: 'Vui lòng nhập tên giải đấu!' }]}>
              <Input placeholder="Ví dụ: V-League 2026, Cúp Quốc gia, Giao hữu quốc tế..." />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="opponentLogo" label="Logo đội khách (URL)">
                  <Space.Compact className="w-full">
                    <Input placeholder="Dán URL hoặc upload ảnh từ máy" />
                    <Upload {...createUploadProps('opponentLogo')}>
                      <Button icon={<UploadOutlined />}>Upload</Button>
                    </Upload>
                  </Space.Compact>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="bannerImage" label="Ảnh banner trận đấu (URL)">
                  <Space.Compact className="w-full">
                    <Input placeholder="Dán URL hoặc upload ảnh từ máy" />
                    <Upload {...createUploadProps('bannerImage')}>
                      <Button icon={<UploadOutlined />}>Upload</Button>
                    </Upload>
                  </Space.Compact>
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
              <Col span={24}>
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

            <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="mb-3 text-xs font-black uppercase text-[#003078]">Giá vé từng khán đài</p>
              <Row gutter={16}>
                {(['A', 'B', 'C', 'D'] as const).map((stand) => (
                  <Col key={stand} span={6}>
                    <Form.Item name={['standPrices', stand]} label={`Khán đài ${stand}`} rules={[{ required: true, message: 'Nhập giá vé' }]}>
                      <InputNumber className="w-full" min={0} step={10000} />
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            </div>

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

        <Modal
          title={`THỐNG KÊ TỒN KHO - SLNA vs ${inventoryMatch?.opponent || ''}`}
          open={Boolean(inventoryMatch)}
          onCancel={() => setInventoryMatch(null)}
          footer={null}
          width={820}
          loading={loadingInventory}
        >
          <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="mb-3 text-xs font-black uppercase text-[#003078]">Quản lý vé giấy</div>
            <Space wrap>
              <Select
                value={paperStand}
                onChange={(value) => setPaperStand(value)}
                options={STAND_OPTIONS.map((item) => ({ label: item.label.replace(/ - .+$/, ''), value: item.value }))}
                className="min-w-36"
              />
              <InputNumber
                min={1}
                max={inventory[paperStand]?.total || 1}
                value={paperQuantity}
                onChange={(value) => setPaperQuantity(Number(value || 1))}
                addonAfter="vé"
              />
              <Button
                type="primary"
                loading={updatingPaperTickets}
                onClick={() => handleUpdatePaperTickets('RESERVE')}
              >
                Giữ vé giấy
              </Button>
              <Button
                loading={updatingPaperTickets}
                disabled={inventory[paperStand].paperReserved <= inventory[paperStand].paperReservedPrinted}
                onClick={() => handleUpdatePaperTickets('RELEASE')}
              >
                Trả về online
              </Button>
              <Button
                type="primary"
                ghost
                loading={updatingPaperTickets}
                onClick={() => handleUpdatePaperTickets('MARK_SOLD')}
              >
                Đã bán giấy
              </Button>
              <Button
                loading={updatingPaperTickets}
                onClick={() => handleUpdatePaperTickets('UNMARK_SOLD')}
              >
                Hoàn về vé giấy
              </Button>
              <Button onClick={openPaperPrintModal}>
                In vé giấy
              </Button>
            </Space>
            <div className="mt-3 text-xs text-gray-500">
              Vé giấy sẽ bị trừ khỏi số vé khách có thể mua trên web. Khi bán tại quầy, bấm Đã bán giấy để hệ thống ghi nhận tồn kho và doanh thu riêng.
            </div>
          </div>
          <Row gutter={[16, 16]}>
            {(['A', 'B', 'C', 'D'] as const).map((stand) => {
              const item = inventory[stand];
              const unavailable = item.sold + item.paperReserved + item.paperSold;
              const percent = item.total ? Math.round((unavailable / item.total) * 100) : 0;
              return (
                <Col span={12} key={stand}>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-black text-[#003078]">Khán đài {stand}</span>
                      <Tag color="blue">{percent}% không còn online</Tag>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <span>Tổng vé: <b>{item.total.toLocaleString('vi-VN')}</b></span>
                      <span>Còn lại: <b>{item.available.toLocaleString('vi-VN')}</b></span>
                      <span>Đã bán: <b>{item.sold.toLocaleString('vi-VN')}</b></span>
                      <span>Vé giấy: <b>{item.paperReserved.toLocaleString('vi-VN')}</b></span>
                      <span>Giấy đã bán: <b>{item.paperSold.toLocaleString('vi-VN')}</b></span>
                      <span>Đã in PDF: <b>{item.paperPrinted.toLocaleString('vi-VN')}</b></span>
                      <span>Đã soát: <b>{item.scanned.toLocaleString('vi-VN')}</b></span>
                      <span>DT vé giấy: <b>{item.paperRevenue.toLocaleString('vi-VN')}đ</b></span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                      <div className="h-full bg-[#003078]" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        </Modal>

        <Modal
          title={`IN VÉ GIẤY - KHÁN ĐÀI ${paperStand}`}
          open={isPaperPrintOpen}
          onCancel={() => setIsPaperPrintOpen(false)}
          width={520}
          footer={[
            <Button key="close" onClick={() => setIsPaperPrintOpen(false)}>Đóng</Button>,
            <Popconfirm
              key="print"
              title="Khóa vé và in PDF?"
              description="Sau thao tác này, các vé đang hiển thị sẽ không thể trả về bán online."
              okText="Khóa và in"
              cancelText="Hủy"
              onConfirm={printPaperTickets}
              disabled={paperTickets.length === 0}
            >
              <Button type="primary" icon={<FilePdfOutlined />} disabled={paperTickets.length === 0}>
                Khóa và In PDF
              </Button>
            </Popconfirm>,
          ]}
          loading={loadingPaperTickets}
        >
          <style jsx global>{`
            @page {
              size: 105mm 210mm;
              margin: 0;
            }
            @media print {
              body * {
                visibility: hidden !important;
              }
              .paper-print-area, .paper-print-area * {
                visibility: visible !important;
              }
              .paper-print-area {
                position: absolute;
                inset: 0;
                width: 105mm;
                padding: 0;
                background: white;
              }
              .paper-ticket-page {
                width: 105mm;
                min-height: 210mm;
                padding: 4mm;
                break-inside: avoid;
                page-break-inside: avoid;
                page-break-after: always;
              }
              .paper-ticket-page:last-child {
                page-break-after: auto;
              }
              .paper-ticket-page .slna-print-ticket {
                width: 97mm !important;
                border-radius: 0 !important;
                box-shadow: none !important;
              }
              .paper-print-summary,
              .paper-print-status {
                display: none !important;
              }
            }
          `}</style>
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-bold leading-5 text-red-700">
            Khi bấm “Khóa và In PDF”, toàn bộ vé đang hiển thị sẽ được đánh dấu đã in và không thể trả về bán online.
          </div>
          <div className="paper-print-area bg-gray-100 py-4">
            <div className="paper-print-summary mb-4 flex items-center justify-between">
              <div>
                <p className="m-0 text-lg font-black text-[#003078]">SLNA Ticketing - Vé giấy</p>
                <p className="m-0 text-xs text-gray-500">
                  {inventoryMatch ? `SLNA vs ${inventoryMatch.opponent}` : ''} - Khán đài {paperStand}
                </p>
              </div>
              <Tag color="blue">{paperTickets.length.toLocaleString('vi-VN')} vé</Tag>
            </div>
            <div className="space-y-5">
              {paperTickets.map((ticket) => (
                <div key={ticket.id} className="paper-ticket-page">
                  <PrintableTicket
                    ticket={ticket}
                    fallbackQrCode={ticket.ticketQrCode}
                    sponsors={sponsors}
                  />
                  {ticket.isPrinted && (
                    <div className="paper-print-status mx-auto mt-2 w-[390px] text-center">
                      <Tag color="red">Đã in - Không thể trả online</Tag>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {paperTickets.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
                Chưa có vé giấy nào ở khán đài này. Hãy giữ vé giấy trước khi in.
              </div>
            )}
          </div>
        </Modal>
    </AdminPageShell>
  );
}
