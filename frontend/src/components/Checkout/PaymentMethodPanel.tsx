import Image from 'next/image';
import { LoadingOutlined } from '@ant-design/icons';
import { Button, Card, Radio, Spin } from 'antd';
import { PaymentMethod } from '../../interfaces/IOrder';
import { paymentOptions } from './paymentOptions';

interface PaymentMethodPanelProps {
  paymentMethod: PaymentMethod;
  totalPrice: number;
  vietQrUrl: string;
  isVerifying: boolean;
  onPaymentMethodChange: (paymentMethod: PaymentMethod) => void;
  onVerifyPayment: () => void;
}

export default function PaymentMethodPanel({
  paymentMethod,
  totalPrice,
  vietQrUrl,
  isVerifying,
  onPaymentMethodChange,
  onVerifyPayment,
}: PaymentMethodPanelProps) {
  const selectedOption = paymentOptions.find((option) => option.value === paymentMethod);

  return (
    <Card className="rounded-3xl border-none shadow-sm" title={<span className="font-black italic uppercase text-[#003078]">Cổng thanh toán điện tử</span>}>
      <Radio.Group onChange={(event) => onPaymentMethodChange(event.target.value)} value={paymentMethod} className="w-full">
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

      {paymentMethod === 'BANK_TRANSFER' ? (
        <div className="relative mt-6 flex flex-col items-center overflow-hidden rounded-[40px] border border-dashed border-gray-200 bg-white p-8">
          <div className="relative mb-6 rounded-[32px] border-4 border-[#003078] bg-white p-3 shadow-2xl">
            <Image src={vietQrUrl} alt="QR Ngân hàng" width={256} height={256} unoptimized className="h-64 w-64 object-contain" />
            {isVerifying && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[28px] bg-white/95 backdrop-blur-sm">
                <Spin indicator={<LoadingOutlined style={{ fontSize: 42, color: '#003078' }} spin />} />
                <p className="mt-4 animate-pulse text-xs font-black uppercase tracking-widest text-[#003078]">Đang đồng bộ hóa dữ liệu...</p>
              </div>
            )}
          </div>
          <div className="mb-6 space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">NGUYEN VIET LAM</p>
            <p className="text-4xl font-black italic tracking-tighter text-[#003078]">{totalPrice.toLocaleString()}đ</p>
          </div>
          <Button type="primary" size="large" loading={isVerifying} className="h-16 rounded-2xl border-none bg-[#edbb00] px-12 text-sm font-black uppercase tracking-wider text-[#003078] shadow-xl transition-all hover:scale-[1.02] hover:bg-[#003078] hover:text-white active:scale-95" onClick={onVerifyPayment}>
            Tôi đã chuyển khoản xong
          </Button>
        </div>
      ) : (
        <div className="mt-6 rounded-[32px] border border-dashed border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#003078] text-3xl text-[#edbb00]">
            {selectedOption?.icon}
          </div>
          <h3 className="text-xl font-black uppercase text-[#003078]">{selectedOption?.title}</h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
            Đây là môi trường mô phỏng. Khi bấm xác nhận, hệ thống sẽ tạo đơn chờ admin xác nhận thanh toán.
          </p>
          <div className="mt-6 rounded-2xl bg-gray-50 p-5">
            <p className="m-0 text-xs font-bold uppercase text-gray-400">Số tiền cần thanh toán</p>
            <p className="m-0 mt-1 text-3xl font-black italic text-[#003078]">{totalPrice.toLocaleString()}đ</p>
          </div>
          <Button type="primary" size="large" loading={isVerifying} className="mt-6 h-14 rounded-2xl px-10 font-black uppercase" onClick={onVerifyPayment}>
            Xác nhận phương thức thanh toán
          </Button>
        </div>
      )}
    </Card>
  );
}
