'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, Col, Descriptions, Result, Row, Spin, Statistic, Tag } from 'antd';
import { CalendarOutlined, EnvironmentOutlined, ShoppingCartOutlined, TrophyOutlined } from '@ant-design/icons';
import axiosClient from '../../../api/axiosClient';
import { IMatch } from '../../../interfaces';
import { ITicketInventory } from '../../../interfaces/ITicketInventory';

const STANDS = ['A', 'B', 'C', 'D'] as const;

const emptyInventory: ITicketInventory = {
  A: { total: 0, available: 0, sold: 0, paperReserved: 0, paperSold: 0, paperPrinted: 0, paperReservedPrinted: 0, scanned: 0, revenue: 0, paperRevenue: 0 },
  B: { total: 0, available: 0, sold: 0, paperReserved: 0, paperSold: 0, paperPrinted: 0, paperReservedPrinted: 0, scanned: 0, revenue: 0, paperRevenue: 0 },
  C: { total: 0, available: 0, sold: 0, paperReserved: 0, paperSold: 0, paperPrinted: 0, paperReservedPrinted: 0, scanned: 0, revenue: 0, paperRevenue: 0 },
  D: { total: 0, available: 0, sold: 0, paperReserved: 0, paperSold: 0, paperPrinted: 0, paperReservedPrinted: 0, scanned: 0, revenue: 0, paperRevenue: 0 },
};

export default function MatchDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<IMatch | null>(null);
  const [inventory, setInventory] = useState<ITicketInventory>(emptyInventory);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axiosClient.get<IMatch>(`/matches/${id}`),
      axiosClient.get<ITicketInventory>(`/tickets/inventory/${id}`).catch(() => emptyInventory),
    ])
      .then(([matchData, inventoryData]) => {
        setMatch(matchData as unknown as IMatch);
        setInventory({ ...emptyInventory, ...(inventoryData as unknown as Partial<ITicketInventory>) });
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50"><Spin size="large" /></div>;
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24">
        <Result status="404" title="Không tìm thấy trận đấu" extra={<Button onClick={() => router.push('/matches')}>Quay lại lịch thi đấu</Button>} />
      </div>
    );
  }

  const bannerImage = match.bannerImage || '/images/sVinh.jpg';
  const canBook = match.status === 'ON_SALE';
  const totalTickets = STANDS.reduce((sum, stand) => sum + Number(inventory[stand]?.total || 0), 0);
  const availableTickets = STANDS.reduce((sum, stand) => sum + Number(inventory[stand]?.available || 0), 0);
  const paperTickets = STANDS.reduce((sum, stand) => sum + Number(inventory[stand]?.paperReserved || 0), 0);
  const soldPaperTickets = STANDS.reduce((sum, stand) => sum + Number(inventory[stand]?.paperSold || 0), 0);

  return (
    <main className="min-h-screen bg-[#f8fafc] pb-16 pt-24 font-montserrat">
      <section className="relative min-h-[420px] overflow-hidden bg-[#003078] text-white">
        <Image src={bannerImage} alt={`SLNA vs ${match.opponent}`} fill priority unoptimized className="object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#003078] via-[#003078]/85 to-[#003078]/20" />
        <div className="relative z-10 mx-auto flex min-h-[420px] max-w-7xl flex-col justify-end px-6 py-12">
          <div className="mb-5 flex flex-wrap gap-3">
            <Tag color={canBook ? 'gold' : 'default'} className="rounded-full px-4 py-1 font-black">{match.status}</Tag>
            <Tag color="blue" className="rounded-full px-4 py-1 font-black">{match.competitionName || 'Giải đấu'}</Tag>
          </div>
          <h1 className="m-0 text-4xl font-black uppercase italic tracking-tight md:text-6xl">SLNA vs {match.opponent}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100">{match.description || 'Thông tin trận đấu và vé điện tử chính thức từ SLNA Ticketing.'}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs font-black uppercase">
            <span className="rounded-full bg-white/10 px-4 py-2"><CalendarOutlined /> {new Date(match.matchDate).toLocaleString('vi-VN')}</span>
            <span className="rounded-full bg-white/10 px-4 py-2"><EnvironmentOutlined /> {match.stadium}</span>
            <span className="rounded-full bg-white/10 px-4 py-2"><TrophyOutlined /> {match.competitionName}</span>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-10 grid max-w-7xl gap-6 px-6 lg:grid-cols-3">
        <Card className="rounded-[28px] border-none shadow-xl lg:col-span-2">
          <h2 className="m-0 mb-5 text-xl font-black uppercase text-[#003078]">Tồn kho vé theo khán đài</h2>
          <Row gutter={[16, 16]}>
            {STANDS.map((stand) => {
              const standPrice = match.freeStands?.includes(stand) ? 0 : Number(match.standPrices?.[stand] || 0);
              const unavailable = (inventory[stand]?.sold || 0) + (inventory[stand]?.paperReserved || 0) + (inventory[stand]?.paperSold || 0);
              const percent = inventory[stand]?.total ? Math.round((unavailable / inventory[stand].total) * 100) : 0;
              return (
                <Col xs={24} md={12} key={stand}>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-lg font-black text-[#003078]">Khán đài {stand}</span>
                      <Tag color={standPrice === 0 ? 'green' : 'gold'}>{standPrice === 0 ? 'Miễn phí' : `${standPrice.toLocaleString('vi-VN')}đ`}</Tag>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <Statistic title="Còn" value={inventory[stand]?.available || 0} />
                      <Statistic title="Đã bán" value={inventory[stand]?.sold || 0} />
                      <Statistic title="Vé giấy" value={inventory[stand]?.paperReserved || 0} />
                    </div>
                    <p className="mb-0 mt-3 text-xs font-bold text-gray-400">Đã soát: {(inventory[stand]?.scanned || 0).toLocaleString('vi-VN')} vé</p>
                    <p className="mb-0 mt-1 text-xs font-bold text-gray-400">Giấy đã bán: {(inventory[stand]?.paperSold || 0).toLocaleString('vi-VN')} vé</p>
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full bg-[#003078]" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="mb-0 mt-2 text-xs font-bold text-gray-400">Không còn online: {percent}%</p>
                  </div>
                </Col>
              );
            })}
          </Row>
        </Card>

        <Card className="rounded-[28px] border-none shadow-xl">
          <h2 className="m-0 mb-5 text-xl font-black uppercase text-[#003078]">Thông tin trận</h2>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Tổng vé">{totalTickets.toLocaleString('vi-VN')}</Descriptions.Item>
            <Descriptions.Item label="Còn lại">{availableTickets.toLocaleString('vi-VN')}</Descriptions.Item>
            <Descriptions.Item label="Vé giấy">{paperTickets.toLocaleString('vi-VN')}</Descriptions.Item>
            <Descriptions.Item label="Giấy đã bán">{soldPaperTickets.toLocaleString('vi-VN')}</Descriptions.Item>
            <Descriptions.Item label="Giá từ">{Number(match.ticketPriceMin || 0).toLocaleString('vi-VN')}đ</Descriptions.Item>
            <Descriptions.Item label="Sân">{match.stadium}</Descriptions.Item>
          </Descriptions>
          <div className="mt-6 space-y-3">
            <Link href={`/booking/${match.id}`}>
              <Button block type="primary" size="large" disabled={!canBook} icon={<ShoppingCartOutlined />} className="h-12 rounded-xl bg-[#003078] font-black">
                {canBook ? 'Mua vé ngay' : 'Chưa mở bán'}
              </Button>
            </Link>
            <Link href="/matches">
              <Button block size="large" className="h-12 rounded-xl font-bold">Quay lại lịch thi đấu</Button>
            </Link>
          </div>
        </Card>
      </section>
    </main>
  );
}
