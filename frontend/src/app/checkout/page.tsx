'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import axios from 'axios';
import { useBooking } from '../../hooks/useBooking';
import { Card, Steps, Radio, Button, Divider, App, Tag, QRCode, Result, Spin } from 'antd';
import { BankOutlined, MobileOutlined, QrcodeOutlined, ShopOutlined, UserOutlined, CreditCardOutlined, CheckCircleOutlined, HomeOutlined, LoadingOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';

interface IOrderResponse {
  id: number;
  orderQrCode: string;
}

type PaymentMethod = 'BANK_TRANSFER' | 'MOMO' | 'VNPAY' | 'CASH';

const paymentOptions: Array<{
  value: PaymentMethod;
  title: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'BANK_TRANSFER',
    title: 'Chuyển khoản VietQR',
    description: 'Quét QR ngân hàng, nội dung chuyển khoản tự động theo đơn.',
    icon: <BankOutlined />,
  },
  {
    value: 'MOMO',
    title: 'Ví MoMo',
    description: 'Mô phỏng thanh toán ví điện tử MoMo cho đơn vé SLNA.',
    icon: <MobileOutlined />,
  },
  {
    value: 'VNPAY',
    title: 'Thẻ ATM / VNPAY',
    description: 'Thanh toán qua cổng VNPAY bằng ATM nội địa hoặc QR Pay.',
    icon: <QrcodeOutlined />,
  },
  {
    value: 'CASH',
    title: 'Thanh toán tại quầy',
    description: 'Giữ chỗ và thanh toán trực tiếp tại quầy vé sân Vinh.',
    icon: <ShopOutlined />,
  },
];

const CheckoutPage = () => {
  const { selectedSeats, totalPrice, confirmPayment } = useBooking();
  const { message } = App.useApp();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [ticketCode, setTicketCode] = useState('');
  const [confirmedSeats, setConfirmedSeats] = useState<string[]>([]);

  const BANK_ID = "vietcombank";
  const ACCOUNT_NO = "1027799416";
  const ACCOUNT_NAME = "NGUYEN VIET LAM";

  const vietQrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${totalPrice}&addInfo=${encodeURIComponent(`Thanh toan ve SLNA ${selectedSeats.join(' ')}`)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

  const handleVerifyPayment = async () => {
    setIsVerifying(true);
    try {
      const userInfoStr = localStorage.getItem('user_info');
      const matchIdStr = localStorage.getItem('current_match_id');

      if (!userInfoStr) {
        message.error('Vui lòng đăng nhập lại để thanh toán!');
        setIsVerifying(false);
        return;
      }

      const seatsSnapshot = [...selectedSeats];
      const payload = {
        paymentMethod: paymentMethod,
        tickets: seatsSnapshot,
        matchId: Number(matchIdStr)
      };

      const resData = await axiosClient.post('/orders', payload) as unknown as IOrderResponse;

      setTicketCode(resData.orderQrCode);
      setConfirmedSeats(seatsSnapshot);
      confirmPayment(); 
      setIsSuccess(true);
      setCurrentStep(2);
      message.success('Thanh toán thành công!');
    } catch (error: unknown) {
      console.error(error);
      message.error(axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : 'Giao dịch thất bại, ghế không tồn tại hoặc đã có người mua!');
    } finally {
      setIsVerifying(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white pt-28 pb-20 font-montserrat flex flex-col items-center px-6">
        <div className="max-w-2xl w-full">
          <Result
            status="success"
            title={<span className="text-3xl font-black italic uppercase text-[#003078]">Giao dịch thành công</span>}
            subTitle={`Mã đơn hàng của bạn là ${ticketCode}`}
          />
          <Card className="rounded-[40px] border-none shadow-2xl bg-gray-50 overflow-hidden mb-8">
            <div className="flex flex-col md:flex-row items-center gap-8 p-8">
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                <QRCode value={ticketCode} size={180} color="#003078" bordered={false} />
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mã vé định danh</span>
                  <span className="font-black text-[#003078] text-lg italic">{ticketCode}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vị trí ghế đã mua</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {confirmedSeats.map(s => <Tag key={s} color="gold" className="m-0 font-bold border-none">{s}</Tag>)}
                  </div>
                </div>
                <Divider className="my-2" />
                <p className="text-[11px] font-medium text-gray-500 italic m-0">
                  * Vui lòng xuất trình mã QR này tại cửa kiểm soát Sân vận động Vinh.
                </p>
              </div>
            </div>
          </Card>
          <div className="flex gap-4">
            <Button block size="large" icon={<HomeOutlined />} className="h-14 rounded-2xl font-bold" onClick={() => window.location.href = '/'}>
              VỀ TRANG CHỦ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedSeats.length === 0) {
    return (
      <div className="min-h-screen bg-white pt-28 pb-20 font-montserrat flex flex-col items-center px-6">
        <Result
          status="warning"
          title="Bạn chưa chọn ghế"
          subTitle="Vui lòng quay lại lịch thi đấu, chọn trận đang mở bán và chọn ghế trước khi thanh toán."
          extra={<Button type="primary" onClick={() => window.location.href = '/matches'}>Xem lịch thi đấu</Button>}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pt-28 pb-20 font-montserrat">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-10 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <Steps current={currentStep} items={[{ title: 'Chọn vị trí ghế', icon: <UserOutlined /> }, { title: 'Tiến hành thanh toán', icon: <CreditCardOutlined /> }, { title: 'Nhận vé hoàn tất', icon: <CheckCircleOutlined /> }]} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-3xl border-none shadow-sm" title={<span className="font-black italic uppercase text-[#003078]">Cổng thanh toán điện tử</span>}>
              <Radio.Group onChange={(e) => setPaymentMethod(e.target.value)} value={paymentMethod} className="w-full">
                <div className="grid gap-4 md:grid-cols-2">
                  {paymentOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${paymentMethod === option.value ? 'border-[#003078] bg-blue-50/70 shadow-sm' : 'border-gray-100 bg-white hover:border-blue-100'}`}
                    >
                      <div className="flex items-start gap-3">
                        <Radio value={option.value} />
                        <div>
                          <div className="flex items-center gap-2 font-black text-[#003078]">
                            <span className="text-lg">{option.icon}</span>
                            {option.title}
                          </div>
                          <p className="mt-2 text-xs font-medium leading-5 text-gray-500">{option.description}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </Radio.Group>
              {paymentMethod === 'BANK_TRANSFER' && (
                <div className="mt-6 flex flex-col items-center bg-white border border-dashed border-gray-200 rounded-[40px] p-8 relative overflow-hidden">
                  <div className="relative p-3 bg-white border-4 border-[#003078] rounded-[32px] mb-6 shadow-2xl">
                    <Image src={vietQrUrl} alt="QR Ngân hàng" width={256} height={256} unoptimized className="h-64 w-64 object-contain" />
                    {isVerifying && (
                      <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center rounded-[28px] backdrop-blur-sm">
                        <Spin indicator={<LoadingOutlined style={{ fontSize: 42, color: '#003078' }} spin />} />
                        <p className="mt-4 font-black text-[#003078] text-xs tracking-widest animate-pulse uppercase">Đang đồng bộ hóa dữ liệu...</p>
                      </div>
                    )}
                  </div>
                  <div className="text-center space-y-2 mb-6">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{ACCOUNT_NAME}</p>
                    <p className="text-4xl font-black text-[#003078] tracking-tighter italic">{totalPrice.toLocaleString()}đ</p>
                  </div>
                  <Button type="primary" size="large" loading={isVerifying} className="h-16 px-12 bg-[#edbb00] text-[#003078] border-none font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl hover:bg-[#003078] hover:text-white transition-all transform hover:scale-[1.02] active:scale-95" onClick={handleVerifyPayment}>
                    Tôi đã chuyển khoản xong
                  </Button>
                </div>
              )}
              {paymentMethod !== 'BANK_TRANSFER' && (
                <div className="mt-6 rounded-[32px] border border-dashed border-gray-200 bg-white p-8 text-center">
                  <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#003078] text-3xl text-[#edbb00]">
                    {paymentOptions.find((option) => option.value === paymentMethod)?.icon}
                  </div>
                  <h3 className="text-xl font-black uppercase text-[#003078]">
                    {paymentOptions.find((option) => option.value === paymentMethod)?.title}
                  </h3>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
                    Đây là môi trường mô phỏng. Khi bấm xác nhận, hệ thống sẽ tạo đơn chờ admin xác nhận thanh toán.
                  </p>
                  <div className="mt-6 rounded-2xl bg-gray-50 p-5">
                    <p className="m-0 text-xs font-bold uppercase text-gray-400">Số tiền cần thanh toán</p>
                    <p className="m-0 mt-1 text-3xl font-black italic text-[#003078]">{totalPrice.toLocaleString()}đ</p>
                  </div>
                  <Button type="primary" size="large" loading={isVerifying} className="mt-6 h-14 rounded-2xl px-10 font-black uppercase" onClick={handleVerifyPayment}>
                    Xác nhận phương thức thanh toán
                  </Button>
                </div>
              )}
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card className="rounded-[32px] border-none shadow-xl sticky top-28 overflow-hidden">
              <div className="bg-[#003078] p-5 -m-6 mb-6 text-center text-white">
                <h3 className="font-black italic text-base uppercase tracking-tighter m-0">Tóm tắt đơn hàng</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-bold uppercase">Địa điểm tổ chức</span>
                  <span className="font-black text-[#003078]">SÂN VẬN ĐỘNG VINH</span>
                </div>
                <div className="flex justify-between text-xs border-t pt-4 items-center">
                  <span className="text-gray-400 font-black uppercase">Tổng cộng</span>
                  <span className="text-2xl font-black italic text-[#003078]">{totalPrice.toLocaleString()}đ</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
