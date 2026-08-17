'use client';

import { useState } from 'react';
import { App as AntApp, Button, Card, Input, Result, Descriptions } from 'antd';
import { QrcodeOutlined } from '@ant-design/icons';
import axios from 'axios';
import AdminPageShell from '../../../components/Admin/AdminPageShell';
import axiosClient from '../../../api/axiosClient';

interface ScanTicket {
  seatCode: string;
  customerName?: string;
  opponent?: string;
  matchDate?: string;
  stadium?: string;
  isScanned: boolean;
}

type ScanStatus = 'success' | 'warning' | 'error';

export default function AdminScannerPage() {
  const { notification } = AntApp.useApp();
  const [ticketQrCode, setTicketQrCode] = useState('');
  const [ticket, setTicket] = useState<ScanTicket | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('success');
  const [scanMessage, setScanMessage] = useState('Vé hợp lệ');
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    if (!ticketQrCode.trim()) return;
    try {
      setLoading(true);
      const res = await axiosClient.post<{ message: string; ticket: ScanTicket }>('/tickets/scan', { ticketQrCode });
      setTicket(res.ticket);
      setScanStatus('success');
      setScanMessage(res.message);
      notification.success({ title: res.message });
    } catch (error: unknown) {
      const responseData = axios.isAxiosError(error)
        ? error.response?.data as { message?: string; ticket?: ScanTicket } | undefined
        : undefined;

      const message = responseData?.message || 'Không thể soát vé. Vui lòng thử lại.';
      setTicket(responseData?.ticket || null);

      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setScanStatus('warning');
        setScanMessage(message);
        notification.warning({ title: 'Cảnh báo soát vé', description: message });
      } else {
        setScanStatus('error');
        setScanMessage(message);
        notification.error({ title: 'Soát vé thất bại', description: message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminPageShell title="Soát vé QR" subtitle="Nhập mã TICKET trên vé hoặc dùng máy quét QR đang focus vào ô nhập.">
      <Card className="rounded-2xl shadow-md">
        <div className="flex flex-col gap-3 md:flex-row">
          <Input
            autoFocus
            size="large"
            value={ticketQrCode}
            onChange={(event) => setTicketQrCode(event.target.value)}
            onPressEnter={handleScan}
            prefix={<QrcodeOutlined />}
            placeholder="Ví dụ: TICKET-ABC123..."
          />
          <Button type="primary" size="large" loading={loading} onClick={handleScan} className="bg-[#003078] font-bold">
            Soát vé
          </Button>
        </div>
      </Card>

      {ticket && (
        <Card className="mt-6 rounded-2xl shadow-md">
          <Result
            status={scanStatus}
            title={scanStatus === 'success' ? 'Vé hợp lệ' : scanStatus === 'warning' ? 'Vé cần kiểm tra' : 'Vé không hợp lệ'}
            subTitle={scanStatus === 'success' ? `Ghế ${ticket.seatCode} đã được đánh dấu vào sân.` : scanMessage}
          />
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Khách hàng">{ticket.customerName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Trận đấu">SLNA vs {ticket.opponent}</Descriptions.Item>
            <Descriptions.Item label="Thời gian">{ticket.matchDate ? new Date(ticket.matchDate).toLocaleString('vi-VN') : '-'}</Descriptions.Item>
            <Descriptions.Item label="Sân">{ticket.stadium || '-'}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">{ticket.isScanned ? 'Đã soát' : 'Chưa soát'}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </AdminPageShell>
  );
}
