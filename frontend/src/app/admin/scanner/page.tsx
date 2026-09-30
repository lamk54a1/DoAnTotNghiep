'use client';

import { useEffect, useState } from 'react';
import { Alert, App as AntApp, Button, Card, Descriptions, Input, Result, Select, Space, Tag } from 'antd';
import { QrcodeOutlined } from '@ant-design/icons';
import axios from 'axios';
import AdminPageShell from '../../../components/Admin/AdminPageShell';
import MobileQrScanner from '../../../components/Admin/MobileQrScanner';
import axiosClient from '../../../api/axiosClient';
import { IMatch } from '../../../interfaces/IMatch';

interface ScanTicket {
  matchId: number;
  seatCode: string;
  customerName?: string;
  opponent?: string;
  matchDate?: string;
  stadium?: string;
  isScanned: boolean;
}

type ScanStatus = 'info' | 'success' | 'warning' | 'error';

const signalResult = (status: ScanStatus) => {
  if (status === 'info') return;
  if ('vibrate' in navigator) {
    navigator.vibrate(status === 'success' ? 120 : status === 'warning' ? [160, 80, 160] : 450);
  }
  try {
    const legacyWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextClass = window.AudioContext || legacyWindow.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = status === 'success' ? 1050 : status === 'warning' ? 620 : 240;
    gain.gain.setValueAtTime(0.13, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + (status === 'error' ? 0.45 : 0.18));
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + (status === 'error' ? 0.45 : 0.18));
    oscillator.addEventListener('ended', () => { void context.close(); });
  } catch {
    // Một số trình duyệt chặn âm thanh tự động; rung và màu vẫn hoạt động.
  }
};

export default function AdminScannerPage() {
  const { notification } = AntApp.useApp();
  const [matches, setMatches] = useState<IMatch[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number>();
  const [ticketQrCode, setTicketQrCode] = useState('');
  const [ticket, setTicket] = useState<ScanTicket | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('info');
  const [scanMessage, setScanMessage] = useState('Sẵn sàng soát vé');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void axiosClient.get<IMatch[]>('/matches')
      .then((data) => {
        const available = data
          .filter((match) => match.status !== 'FINISHED')
          .sort((a, b) => Math.abs(new Date(a.matchDate).getTime() - Date.now()) - Math.abs(new Date(b.matchDate).getTime() - Date.now()));
        setMatches(available);
        if (available[0]) setSelectedMatchId(available[0].id);
      })
      .catch(() => notification.error({ title: 'Không tải được danh sách trận đấu.' }));
  }, [notification]);

  const handleScan = async (rawCode?: string) => {
    const code = String(rawCode || ticketQrCode).trim();
    if (!selectedMatchId) {
      setScanStatus('error');
      setScanMessage('Vui lòng chọn trận đấu trước khi quét.');
      signalResult('error');
      return;
    }
    if (!code || loading) return;

    setTicketQrCode(code);
    try {
      setLoading(true);
      const res = await axiosClient.post<{ message: string; ticket: ScanTicket }>('/tickets/scan', {
        ticketQrCode: code,
        matchId: selectedMatchId,
      });
      setTicket(res.ticket);
      setScanStatus('success');
      setScanMessage(res.message);
      signalResult('success');
    } catch (error: unknown) {
      const responseData = axios.isAxiosError(error)
        ? error.response?.data as { message?: string; ticket?: ScanTicket } | undefined
        : undefined;
      const message = responseData?.message || 'Không thể soát vé. Vui lòng thử lại.';
      const status = axios.isAxiosError(error) && error.response?.status === 409 ? 'warning' : 'error';
      setTicket(responseData?.ticket || null);
      setScanStatus(status);
      setScanMessage(message);
      signalResult(status);
    } finally {
      setLoading(false);
    }
  };

  const selectedMatch = matches.find((match) => match.id === selectedMatchId);

  return (
    <AdminPageShell title="Soát vé QR" subtitle="Chọn đúng trận, mở camera sau và đưa liên tiếp từng mã QR vào khung.">
      <Card className="mb-4 rounded-2xl shadow-md">
        <label className="mb-2 block text-xs font-black uppercase text-slate-500">Trận đấu đang kiểm soát</label>
        <Select
          size="large"
          className="w-full"
          value={selectedMatchId}
          placeholder="Chọn trận đấu"
          onChange={(value) => {
            setSelectedMatchId(value);
            setTicket(null);
            setScanStatus('info');
            setScanMessage('Sẵn sàng soát vé');
          }}
          options={matches.map((match) => ({
            value: match.id,
            label: `SLNA vs ${match.opponent} — ${new Date(match.matchDate).toLocaleString('vi-VN')}`,
          }))}
        />
        {selectedMatch && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Tag color="blue">SLNA vs {selectedMatch.opponent}</Tag>
            <Tag>{selectedMatch.stadium}</Tag>
            <Tag color="gold">{new Date(selectedMatch.matchDate).toLocaleString('vi-VN')}</Tag>
          </div>
        )}
      </Card>

      {!selectedMatchId && <Alert className="mb-4" type="warning" showIcon message="Chưa có trận đấu để soát vé." />}

      <MobileQrScanner
        disabled={!selectedMatchId}
        feedback={{
          status: scanStatus,
          message: scanStatus === 'success' && ticket ? `HỢP LỆ — GHẾ ${ticket.seatCode}` : scanMessage,
        }}
        onDetected={handleScan}
      />

      <Card className="mt-4 rounded-2xl shadow-md">
        <Space.Compact className="w-full">
          <Input
            size="large"
            value={ticketQrCode}
            onChange={(event) => setTicketQrCode(event.target.value)}
            onPressEnter={() => void handleScan()}
            prefix={<QrcodeOutlined />}
            placeholder="Nhập mã vé thủ công"
          />
          <Button type="primary" size="large" loading={loading} onClick={() => void handleScan()}>
            Soát vé
          </Button>
        </Space.Compact>
      </Card>

      <Card className={`mt-4 rounded-2xl border-4 shadow-lg ${scanStatus === 'success' ? 'border-green-500' : scanStatus === 'warning' ? 'border-amber-400' : scanStatus === 'error' ? 'border-red-500' : 'border-blue-400'}`}>
        <Result
          status={scanStatus}
          title={scanStatus === 'success' ? 'Vé hợp lệ' : scanStatus === 'warning' ? 'Vé cần kiểm tra' : scanStatus === 'error' ? 'Vé không hợp lệ' : 'Sẵn sàng soát vé'}
          subTitle={scanStatus === 'success' && ticket ? `Ghế ${ticket.seatCode} đã được đánh dấu vào sân.` : scanMessage}
        />
        {ticket && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Khách hàng">{ticket.customerName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Trận đấu">SLNA vs {ticket.opponent}</Descriptions.Item>
            <Descriptions.Item label="Ghế"><b>{ticket.seatCode}</b></Descriptions.Item>
            <Descriptions.Item label="Thời gian">{ticket.matchDate ? new Date(ticket.matchDate).toLocaleString('vi-VN') : '-'}</Descriptions.Item>
            <Descriptions.Item label="Sân">{ticket.stadium || '-'}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">{ticket.isScanned ? 'Đã soát' : 'Chưa soát'}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>
    </AdminPageShell>
  );
}
