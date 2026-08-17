'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBooking } from '../../../hooks/useBooking';
import { Button, App as AntApp, Result, Spin } from 'antd';
import BookingHeader from '../../../components/Booking/BookingHeader';
import BookingOrderCard from '../../../components/Booking/BookingOrderCard';
import PaymentConfirmModal from '../../../components/Booking/PaymentConfirmModal';
import SeatMap from '../../../components/Booking/SeatMap';
import StandTabs from '../../../components/Booking/StandTabs';
import { STAND_CONFIGS, StandKey } from '../../../components/Booking/standConfigs';
import { useBookingMatch } from '../../../hooks/useBookingMatch';
import { authApi } from '../../../api/authApi';
import { IUser } from '../../../interfaces/IUser';
import CccdVerificationCard from '../../../components/Profile/CccdVerificationCard';
import axiosClient from '../../../api/axiosClient';

const BookingPage = () => {
  const router = useRouter(); 
  const { id } = useParams<{ id: string }>();
  const { message } = AntApp.useApp(); 
  const { selectedSeats, handleToggleSeat, totalPrice, replaceHeldSeats, reset } = useBooking();
  
  const [activeTab, setActiveTab] = useState<StandKey>('A');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [profile, setProfile] = useState<IUser | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const {
    existingSeats,
    loadingMatch,
    localSoldSeats,
    match,
    purchasedTicketCount,
    standInventory,
    ticketPrices,
    heldSeats,
    holdExpiresAt,
    refreshSeats,
  } = useBookingMatch(id);

  useEffect(() => {
    replaceHeldSeats(heldSeats, ticketPrices);
  }, [heldSeats, replaceHeldSeats, ticketPrices]);

  const handleSeatToggle = async (seatId: string, price: number) => {
    try {
      if (selectedSeats.includes(seatId)) {
        await axiosClient.post(`/tickets/release/${id}`, { seats: [seatId] });
        handleToggleSeat(seatId, price);
      } else {
        await axiosClient.post(`/tickets/hold/${id}`, { seats: [...selectedSeats, seatId] });
        handleToggleSeat(seatId, price);
      }
      await refreshSeats();
    } catch {
      message.warning('Ghế này vừa được người khác giữ. Vui lòng chọn ghế khác.');
      await refreshSeats();
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      const storedUser = localStorage.getItem('user_info');
      if (!storedUser) {
        setUnauthorized(true);
        setLoadingProfile(false);
        return;
      }

      authApi.getProfile()
        .then(setProfile)
        .catch(() => setUnauthorized(true))
        .finally(() => setLoadingProfile(false));
    });
  }, []);

  const current = STAND_CONFIGS[activeTab];
  const currentDisplayPrice = match?.freeStands?.includes(activeTab) ? 0 : Number(match?.standPrices?.[activeTab] ?? current.price);
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

  if (loadingMatch || loadingProfile) {
    return <div className="flex min-h-screen items-center justify-center"><Spin size="large" /></div>;
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24">
        <Result
          status="403"
          title="Bạn cần đăng nhập"
          subTitle="Vui lòng đăng nhập để chọn ghế và mua vé."
          extra={<Button type="primary" onClick={() => router.push('/login')}>Đăng nhập</Button>}
        />
      </div>
    );
  }

  if (!profile?.cccd) {
    return (
      <div className="min-h-screen bg-[#f8fafc] px-4 pb-16 pt-28 font-montserrat">
        <div className="mx-auto max-w-2xl">
          <Result
            status="info"
            title="Xác minh CCCD trước khi mua vé"
            subTitle="Bạn chỉ cần upload mặt trước CCCD một lần. Sau khi admin duyệt, tài khoản sẽ được phép mua vé."
          />
          <CccdVerificationCard
            cccd={profile?.cccd}
            pendingCccd={profile?.pendingCccd}
            cccdStatus={profile?.cccdStatus}
            onVerified={setProfile}
          />
        </div>
      </div>
    );
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
        <BookingHeader currentStand={current} currentDisplayPrice={currentDisplayPrice} matchId={id} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="space-y-6 lg:col-span-3">
            <StandTabs activeTab={activeTab} onChange={setActiveTab} standInventory={standInventory} />

            <SeatMap
              activeTab={activeTab}
              currentStand={current}
              currentDisplayPrice={currentDisplayPrice}
              existingSeats={existingSeats}
              localSoldSeats={localSoldSeats}
              remainingTicketQuota={remainingTicketQuota}
              selectedSeats={selectedSeats}
              ticketPrices={ticketPrices}
              onQuotaReached={() => message.warning(`Bạn chỉ còn được mua thêm ${remainingTicketQuota} vé cho trận này.`)}
              onToggleSeat={handleSeatToggle}
            />
          </div>

          <div className="lg:col-span-1">
            <BookingOrderCard
              purchasedTicketCount={purchasedTicketCount}
              remainingTicketQuota={remainingTicketQuota}
              selectedSeats={selectedSeats}
              totalPrice={totalPrice}
              onCheckout={() => setIsModalOpen(true)}
              onToggleSeat={(seatId) => void handleSeatToggle(seatId, ticketPrices[seatId] || 0)}
              holdExpiresAt={holdExpiresAt}
              onHoldExpired={() => {
                reset();
                void refreshSeats();
                message.warning('Thời gian giữ ghế đã hết. Các ghế đã được mở bán lại.');
              }}
            />
          </div>
        </div>
      </div>

      <PaymentConfirmModal
        open={isModalOpen}
        selectedSeatCount={selectedSeats.length}
        totalPrice={totalPrice}
        onCancel={() => setIsModalOpen(false)}
        onConfirm={handlePayment}
      />
    </div>
  );
};

export default BookingPage;
