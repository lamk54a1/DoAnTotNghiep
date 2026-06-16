'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { Button, Card, Empty, Modal, QRCode, Spin, Tag } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import PrintableTicket, { PrintableTicketData } from '../../components/Tickets/PrintableTicket';
import { ISponsor } from '../../interfaces/ISponsor';

type MyTicket = PrintableTicketData;

interface MyOrder {
  id: number;
  totalAmount: number;
  status: 'PENDING' | 'SUCCESS' | 'CANCELLED';
  orderQrCode: string;
  createdAt: string;
  tickets: MyTicket[];
}

export default function MyTicketsPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sponsors, setSponsors] = useState<ISponsor[]>([]);
  const [printing, setPrinting] = useState<{ ticket: MyTicket; orderQrCode: string } | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('access_token')) {
      router.push('/login');
      return;
    }

    void axiosClient.get<MyOrder[]>('/orders/my')
      .then((data) => setOrders(data as unknown as MyOrder[]))
      .finally(() => setLoading(false));
    void axiosClient.get<ISponsor[]>('/sponsors')
      .then((data) => setSponsors(data as unknown as ISponsor[]))
      .catch(() => setSponsors([]));
  }, [router]);

  return (
    <main className="min-h-screen bg-gray-50 pb-20 pt-24">
      <section className="bg-[#003078] px-6 py-14 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.3em] text-[#edbb00]">Tài khoản cá nhân</p>
          <h1 className="m-0 text-4xl font-black uppercase">Vé của tôi</h1>
          <p className="mt-3 text-sm text-blue-100">Lưu mã QR và xuất trình tại cổng kiểm soát sân Vinh.</p>
        </div>
      </section>
      <section className="mx-auto max-w-5xl space-y-6 px-6 py-12">
        {loading ? (
          <div className="py-20 text-center"><Spin size="large" /></div>
        ) : orders.length > 0 ? orders.map((order) => (
          <Card
            key={order.id}
            title={<span className="font-black text-[#003078]">Đơn hàng #{order.id}</span>}
            extra={<Tag color={order.status === 'SUCCESS' ? 'green' : order.status === 'PENDING' ? 'gold' : 'red'}>{order.status}</Tag>}
            className="overflow-hidden rounded-2xl shadow-sm"
          >
            <div className="mb-5 flex flex-wrap gap-5 text-xs font-bold text-gray-500">
              <span>Tạo lúc: {dayjs(order.createdAt).format('DD/MM/YYYY HH:mm')}</span>
              <span>Tổng tiền: {Number(order.totalAmount).toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {order.tickets.map((ticket) => (
                <div key={ticket.id} className="flex gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <QRCode value={ticket.ticketQrCode || order.orderQrCode} size={90} color="#003078" bordered={false} />
                  <div className="flex-1 text-xs text-gray-500">
                    <div className="font-black text-[#003078]">SLNA FC vs {ticket.opponent || 'Đội khách'}</div>
                    <div className="mt-2">Ghế: <b>{ticket.seatCode}</b></div>
                    <div>{ticket.matchDate ? dayjs(ticket.matchDate).format('DD/MM/YYYY HH:mm') : '-'}</div>
                    <div>{ticket.stadium}</div>
                    <Button
                      size="small"
                      icon={<FilePdfOutlined />}
                      className="mt-3 font-bold"
                      onClick={() => setPrinting({ ticket, orderQrCode: order.orderQrCode })}
                    >
                      In / Lưu PDF
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )) : (
          <Empty description="Bạn chưa có vé nào" />
        )}
      </section>

      <Modal
        title="Xem trước vé điện tử"
        open={Boolean(printing)}
        onCancel={() => setPrinting(null)}
        width={470}
        footer={[
          <Button key="close" onClick={() => setPrinting(null)}>Đóng</Button>,
          <Button key="print" type="primary" icon={<FilePdfOutlined />} onClick={() => window.print()}>
            In / Lưu PDF
          </Button>,
        ]}
        destroyOnHidden
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
            .ticket-print-area,
            .ticket-print-area * {
              visibility: visible !important;
            }
            .ticket-print-area {
              position: absolute;
              inset: 0;
              width: 105mm;
              min-height: 210mm;
              margin: 0;
              padding: 4mm;
              background: white;
            }
            .ticket-print-area .slna-print-ticket {
              width: 97mm !important;
              border-radius: 0 !important;
              box-shadow: none !important;
            }
          }
        `}</style>
        {printing && (
          <div className="ticket-print-area bg-gray-100 py-5">
            <PrintableTicket
              ticket={printing.ticket}
              fallbackQrCode={printing.orderQrCode}
              sponsors={sponsors}
            />
          </div>
        )}
      </Modal>
    </main>
  );
}
