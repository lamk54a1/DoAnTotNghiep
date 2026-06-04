'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBooking } from '../../../hooks/useBooking';
import { Button, Card, Statistic, Divider, Modal, Tag, Tabs, App as AntApp, Result, Spin } from 'antd';
import { ShoppingCartOutlined, InfoCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';
import axiosClient from '../../../api/axiosClient';
import { IMatch, ITicket } from '../../../interfaces';

interface StandDetail {
  name: string;
  rows: number;
  seatsPerRow: number;
  price: number;
  color: string;
}

interface StandMap {
  [key: string]: StandDetail;
}

const STAND_CONFIGS: StandMap = {
  A: { name: 'Khán đài A', rows: 80, seatsPerRow: 100, price: 100000, color: '#003078' },
  B: { name: 'Khán đài B', rows: 60, seatsPerRow: 100, price: 50000, color: '#edbb00' },
  C: { name: 'Khán đài C', rows: 30, seatsPerRow: 100, price: 20000, color: '#2ecc71' },
  D: { name: 'Khán đài D', rows: 30, seatsPerRow: 100, price: 20000, color: '#e74c3c' },
};

const BookingPage = () => {
  const router = useRouter(); 
  const { id } = useParams();
  const { message } = AntApp.useApp(); 
  const { selectedSeats, handleToggleSeat, totalPrice } = useBooking();
  
  const [localSoldSeats, setLocalSoldSeats] = useState<string[]>([]);
  const [existingSeats, setExistingSeats] = useState<string[]>([]);
  const [ticketPrices, setTicketPrices] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<string>('A');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [match, setMatch] = useState<IMatch | null>(null);
  const [loadingMatch, setLoadingMatch] = useState(true);
  const [purchasedTicketCount, setPurchasedTicketCount] = useState(0);

  const current = STAND_CONFIGS[activeTab];
  const currentRows = current.rows;
  const currentDisplayPrice = match?.freeStands?.includes(activeTab as 'A' | 'B' | 'C' | 'D') ? 0 : current.price;

  const fetchSoldSeats = useCallback(async () => {
    if (!id) return;
    try {
      const matchData = await axiosClient.get<IMatch>(`/matches/${id}`) as unknown as IMatch;
      setMatch(matchData);
      if (matchData.status !== 'ON_SALE') return;

      const token = localStorage.getItem('access_token');
      const [ticketsData, countData] = await Promise.all([
        axiosClient.get<ITicket[]>(`/tickets/${id}`),
        token
          ? axiosClient.get<{ ticketCount: number }>(`/orders/match/${id}/count`)
          : Promise.resolve({ ticketCount: 0 }),
      ]);
      const tickets = ticketsData as unknown as ITicket[];
      setExistingSeats(tickets.map((ticket) => ticket.seatCode));
      setTicketPrices(Object.fromEntries(tickets.map((ticket) => [ticket.seatCode, Number(ticket.price || 0)])));
      setLocalSoldSeats(tickets.filter((ticket) => ticket.status === 'SOLD').map((ticket) => ticket.seatCode));
      setPurchasedTicketCount(Number((countData as { ticketCount: number }).ticketCount || 0));
    } catch (error) {
      console.error('Lỗi khi tải danh sách ghế đã bán:', error);
    } finally {
      setLoadingMatch(false);
    }
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(fetchSoldSeats);
  }, [fetchSoldSeats]);

  const rows = useMemo(() => {
    return Array.from({ length: currentRows }, (_, i) => i + 1);
  }, [currentRows]);

  const existingSeatSet = useMemo(() => new Set(existingSeats), [existingSeats]);
  const soldSeatSet = useMemo(() => new Set(localSoldSeats), [localSoldSeats]);
  const remainingTicketQuota = Math.max(0, 4 - purchasedTicketCount);

  const handlePayment = () => {
    if (match?.status !== 'ON_SALE') {
      message.error('Trận đấu này hiện không mở bán vé.');
      return;
    }

    if (selectedSeats.length > remainingTicketQuota) {
      message.warning(`Bạn chỉ còn được mua thêm ${remainingTicketQuota} vé cho trận này.`);
      return;
    }

    message.loading('Đang khởi tạo đơn hàng...', 1).then(() => {
      setIsModalOpen(false);
      localStorage.setItem('current_match_id', id as string); 
      router.push('/checkout'); 
    });
  };

  if (loadingMatch) {
    return <div className="flex min-h-screen items-center justify-center"><Spin size="large" /></div>;
  }

  if (!match || match.status !== 'ON_SALE') {
    return (
      <div className="min-h-screen bg-gray-50 pt-24">
        <Result
          status="warning"
          title="Trận đấu hiện không mở bán vé"
          subTitle="Trận đấu có thể đã hết vé, chưa mở bán hoặc đã kết thúc."
          extra={<Button type="primary" onClick={() => router.push('/matches')}>Xem lịch thi đấu</Button>}
        />
      </div>
    );
  }

  if (existingSeats.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24">
        <Result
          status="info"
          title="Kho vé trận này chưa được khởi tạo"
          subTitle="Admin cần vào Quản lý lịch thi đấu và bấm Sinh vé trước khi người dùng có thể chọn ghế."
          extra={<Button type="primary" onClick={() => router.push('/matches')}>Quay lại lịch thi đấu</Button>}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20 pt-24 font-montserrat text-gray-900">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        
        {/* Header Section */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:flex-row md:items-center">
          <div>
            <h1 className="m-0 text-3xl font-black italic uppercase leading-none text-[#003078]">
              Sơ đồ vé trực tuyến
            </h1>
            <div className="mt-3 flex items-center gap-4 text-sm font-bold text-gray-500">
              <span className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-[#003078]">
                <EnvironmentOutlined /> {current.name}
              </span>
              <span className="font-black italic text-red-600 uppercase">
                Giá vé: {currentDisplayPrice === 0 ? 'Miễn phí' : `${currentDisplayPrice.toLocaleString()}đ`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-2">
            <InfoCircleOutlined className="text-yellow-600" />
            <span className="text-[11px] font-black uppercase tracking-tighter text-yellow-800 italic">Mã trận đấu: #{id}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="space-y-6 lg:col-span-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
              <Tabs
                centered
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key)}
                items={Object.keys(STAND_CONFIGS).map(key => ({
                  label: <span className="px-6 text-xs font-black italic uppercase">{STAND_CONFIGS[key].name}</span>,
                  key: key
                }))}
              />
            </div>

            <div className="relative min-h-[500px] overflow-hidden rounded-[40px] border border-gray-100 bg-white p-6 shadow-sm md:p-10">
              <div className="relative z-10 mb-12 text-center">
                <div className="mx-auto mb-3 h-1.5 w-1/3 rounded-full bg-gray-800 opacity-10"></div>
                <p className="text-[10px] font-black uppercase italic tracking-[0.5em] text-gray-400">Mặt sân Vinh (Pitch Side)</p>
              </div>

              <div className="custom-scrollbar max-h-[550px] overflow-x-auto overflow-y-auto pb-10">
                <div className="flex min-w-max flex-col items-center gap-3 px-8">
                  {rows.map((rowNumber) => (
                    <div key={rowNumber} className="flex items-center gap-4">
                      <span className="w-8 text-xs font-black text-gray-300">{rowNumber}</span>
                      <div className="flex gap-2">
                        {Array.from({ length: current.seatsPerRow }).map((_, index) => {
                          const seatNum = index + 1;
                          const sectorName = `${activeTab}${rowNumber}`; // VD: 'A1', 'B2'
                          const paddedSeat = String(seatNum).padStart(2, '0'); // VD: '01', '10', '100'
                          const seatId = `${sectorName}-${paddedSeat}`; // Kết quả sinh ra: "A1-01", "B2-10", "A1-100"

                          const isSelected = selectedSeats.includes(seatId);
                          const isCreated = existingSeatSet.has(seatId);
                          const isSold = soldSeatSet.has(seatId);
                          const seatPrice = ticketPrices[seatId] ?? currentDisplayPrice;
                          const isQuotaReached = !isSelected && selectedSeats.length >= remainingTicketQuota;
                          
                          return (
                            <button
                              key={seatId}
                              disabled={!isCreated || isSold || isQuotaReached}
                              onClick={() => {
                                if (!isCreated) return;
                                if (isQuotaReached) {
                                  message.warning(`Bạn chỉ còn được mua thêm ${remainingTicketQuota} vé cho trận này.`);
                                  return;
                                }
                                if (!isSold) handleToggleSeat(seatId, seatPrice);
                              }}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg border text-[9px] font-black transition-all duration-200 ${
                                !isCreated
                                  ? 'bg-gray-50 border-gray-100 text-gray-200 cursor-not-allowed opacity-40'
                                  : isSold
                                  ? 'bg-gray-200 border-gray-100 text-gray-400 cursor-not-allowed opacity-40 line-through' 
                                  : isSelected 
                                    ? 'z-10 scale-110 border-[#FFD700] bg-[#FFD700] text-[#003078] shadow-lg shadow-yellow-200' 
                                    : isQuotaReached
                                      ? 'border-gray-100 bg-gray-100 text-gray-300 cursor-not-allowed opacity-60'
                                    : 'border-gray-100 bg-white text-gray-400 hover:border-[#003078] hover:text-[#003078]'
                              }`}
                            >
                              {seatNum}
                            </button>
                          );
                        })}
                      </div>
                      <span className="w-8 text-right text-xs font-black text-gray-300">{rowNumber}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Cột thông tin đơn hàng */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 overflow-hidden rounded-[32px] border-none shadow-xl shadow-blue-900/5">
              <div className="-m-6 mb-8 flex items-center justify-center gap-2 bg-[#003078] p-5">
                <ShoppingCartOutlined className="text-xl text-white" />
                <h3 className="m-0 text-lg font-black italic uppercase tracking-tighter text-white">Đơn hàng</h3>
              </div>
              
              <div className="space-y-8">
                <div>
                  <p className="mb-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Ghế đã chọn ({selectedSeats.length}/{remainingTicketQuota})
                  </p>
                  <p className="mb-4 text-center text-[11px] font-bold text-gray-400">
                    Bạn đã mua {purchasedTicketCount}/4 vé cho trận này.
                  </p>
                  <div className="flex min-h-[60px] flex-wrap justify-center gap-2">
                    {selectedSeats.length > 0 ? (
                      selectedSeats.map((s: string) => (
                        <Tag key={s} closable onClose={() => handleToggleSeat(s)} className="m-0 rounded-full border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-black text-[#003078]">
                          {s}
                        </Tag>
                      ))
                    ) : (
                      <span className="text-center text-xs italic text-gray-300">Vui lòng chọn ghế</span>
                    )}
                  </div>
                </div>

                <Divider className="my-0 border-gray-100" />

                <div className="rounded-[24px] border border-gray-100 bg-gray-50 p-6">
                  <Statistic 
                    title={<span className="mb-1 block text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Tổng cộng</span>} 
                    value={totalPrice} 
                    suffix="đ" 
                    styles={{ content: { color: '#003078', fontStyle: 'italic', fontWeight: 950, fontSize: '36px', textAlign: 'center' } }}
                  />
                </div>

                <Button 
                  type="primary" block size="large" 
                  disabled={selectedSeats.length === 0 || remainingTicketQuota === 0}
                  onClick={() => setIsModalOpen(true)}
                  className="flex h-16 items-center justify-center gap-2 rounded-2xl border-none bg-[#003078] text-lg font-black shadow-xl transition-all hover:bg-[#edbb00] active:scale-95 italic uppercase"
                >
                  <ShoppingCartOutlined /> {remainingTicketQuota === 0 ? 'ĐÃ ĐẠT GIỚI HẠN' : 'TIẾP TỤC'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Modal
        title={<span className="text-2xl font-black italic uppercase tracking-tighter text-[#003078]">Xác nhận</span>}
        open={isModalOpen} onOk={handlePayment} onCancel={() => setIsModalOpen(false)}
        okText="Thanh toán ngay" centered width={450}
        okButtonProps={{ className: 'bg-[#003078] h-12 px-10 font-bold rounded-xl border-none shadow-lg' }}
      >
        <div className="space-y-5 py-6">
          <div className="flex justify-between border-b border-dashed pb-3 text-xs">
            <span className="font-bold uppercase text-gray-500">Số lượng vé</span>
            <span className="font-black text-lg text-[#003078]">{selectedSeats.length} vé</span>
          </div>
          <div className="bg-[#003078] mt-4 rounded-3xl p-6 shadow-lg shadow-blue-900/20">
            <div className="flex items-center justify-between text-white font-black italic uppercase">
              <span className="text-[10px] tracking-widest opacity-70">Tổng tiền</span>
              <span className="text-2xl tracking-tighter">{totalPrice.toLocaleString()}đ</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BookingPage;
