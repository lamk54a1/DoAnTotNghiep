import Image from 'next/image';
import { LoadingOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Radio, Spin, Tag } from 'antd';
import { IOrderResponse, PaymentMethod } from '../../interfaces/IOrder';
import { paymentOptions } from './paymentOptions';

interface PaymentMethodPanelProps {
  paymentMethod: PaymentMethod;
  totalPrice: number;
  order: IOrderResponse | null;
  isCreatingOrder: boolean;
  onPaymentMethodChange: (paymentMethod: PaymentMethod) => void;
  onCreateOrder: () => void;
  onFinish: () => void;
}

export default function PaymentMethodPanel({
  paymentMethod,
  totalPrice,
  order,
  isCreatingOrder,
  onPaymentMethodChange,
  onCreateOrder,
  onFinish,
}: PaymentMethodPanelProps) {
  const selectedOption = paymentOptions.find((option) => option.value === paymentMethod);
  const expiryText = order?.expiresAt ? new Date(order.expiresAt).toLocaleString('vi-VN') : '';

  return (
    <Card className="rounded-3xl border-none shadow-sm" title={<span className="font-black italic uppercase text-[#003078]">Thanh toán đơn vé</span>}>
      <Radio.Group disabled={Boolean(order)} onChange={(event) => onPaymentMethodChange(event.target.value)} value={paymentMethod} className="w-full">
        <div className="grid gap-4 md:grid-cols-2">
          {paymentOptions.map((option) => (
            <label
              key={option.value}
              className={`rounded-2xl border-2 p-5 transition-all ${order ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'} ${paymentMethod === option.value ? 'border-[#003078] bg-blue-50/70 shadow-sm' : 'border-gray-100 bg-white hover:border-blue-100'}`}
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

      {!order ? (
        <div className="mt-6 rounded-[32px] border border-dashed border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#003078] text-3xl text-[#edbb00]">
            {selectedOption?.icon}
          </div>
          <h3 className="text-xl font-black uppercase text-[#003078]">{selectedOption?.title}</h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
            Hệ thống sẽ tạo mã đơn trước, khóa ghế trong 15 phút và dùng chính mã đơn để đối soát thanh toán.
          </p>
          <p className="mt-5 text-3xl font-black italic text-[#003078]">{totalPrice.toLocaleString()}đ</p>
          <Button type="primary" size="large" loading={isCreatingOrder} className="mt-4 h-14 rounded-2xl px-10 font-black uppercase" onClick={onCreateOrder}>
            Tạo đơn và khóa ghế
          </Button>
        </div>
      ) : (
        <div className="mt-6 rounded-[32px] border border-dashed border-gray-200 bg-white p-8 text-center">
          <div className="mb-5 flex flex-wrap items-center justify-center gap-3">
            <Tag color="gold" className="m-0 px-4 py-2 text-base font-black">{order.orderQrCode}</Tag>
            <Tag color="blue" className="m-0 px-4 py-2">Hết hạn: {expiryText}</Tag>
          </div>

          {paymentMethod === 'BANK_TRANSFER' && order.paymentQrCode ? (
            <div className="flex flex-col items-center">
              <div className="relative mb-5 rounded-[32px] border-4 border-[#003078] bg-white p-3 shadow-xl">
                <Image src={order.paymentQrCode} alt={`QR thanh toán đơn ${order.orderQrCode}`} width={256} height={256} unoptimized className="h-64 w-64 object-contain" />
                {isCreatingOrder && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-[28px] bg-white/95">
                    <Spin indicator={<LoadingOutlined style={{ fontSize: 42, color: '#003078' }} spin />} />
                  </div>
                )}
              </div>
              <Alert showIcon type="info" message={`Chuyển đúng ${totalPrice.toLocaleString()}đ với nội dung: THANH TOAN VE ${order.orderQrCode}`} />
            </div>
          ) : (
            <Alert showIcon type="warning" message="Phương thức này đang ở chế độ mô phỏng. Đơn chỉ có hiệu lực sau khi admin xác nhận đã thanh toán." />
          )}

          <Button type="primary" size="large" className="mt-6 h-14 rounded-2xl px-10 font-black uppercase" onClick={onFinish}>
            {paymentMethod === 'BANK_TRANSFER' ? 'Tôi đã chuyển khoản' : 'Hoàn tất tạo đơn'}
          </Button>
        </div>
      )}
    </Card>
  );
}
