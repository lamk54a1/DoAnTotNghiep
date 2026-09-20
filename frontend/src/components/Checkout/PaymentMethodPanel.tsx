import Image from 'next/image';
import { Alert, Button, Card, Tag } from 'antd';
import { IOrderResponse } from '../../interfaces/IOrder';
import { sepayPaymentOption } from './paymentOptions';

interface PaymentMethodPanelProps {
  totalPrice: number;
  order: IOrderResponse | null;
  orderStatus: 'PENDING' | 'SUCCESS' | 'CANCELLED';
  isCreatingOrder: boolean;
  sepayAvailable: boolean;
  onCreateOrder: () => void;
  onFinish: () => void;
}

export default function PaymentMethodPanel({
  totalPrice,
  order,
  orderStatus,
  isCreatingOrder,
  sepayAvailable,
  onCreateOrder,
  onFinish,
}: PaymentMethodPanelProps) {
  const expiryText = order?.expiresAt ? new Date(order.expiresAt).toLocaleString('vi-VN') : '';

  return (
    <Card className="rounded-3xl border-none shadow-sm" title={<span className="font-black italic uppercase text-[#003078]">Thanh toán đơn vé</span>}>
      <div className="rounded-2xl border-2 border-[#003078] bg-blue-50/70 p-5">
        <div className="flex items-start gap-3">
          <span className="text-lg text-[#003078]">{sepayPaymentOption.icon}</span>
          <div>
            <div className="font-black text-[#003078]">{sepayPaymentOption.title}</div>
            <p className="mt-2 text-xs font-medium leading-5 text-gray-500">{sepayPaymentOption.description}</p>
          </div>
        </div>
      </div>

      {!sepayAvailable && !order && <Alert showIcon type="warning" className="mt-5" message="SePay hiện chưa sẵn sàng. Vui lòng thử lại sau." />}

      {!order ? (
        <div className="mt-6 rounded-[32px] border border-dashed border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#003078] text-3xl text-[#edbb00]">
            {sepayPaymentOption.icon}
          </div>
          <h3 className="text-xl font-black uppercase text-[#003078]">{sepayPaymentOption.title}</h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
            Hệ thống sẽ tạo mã đơn trước, khóa ghế trong 15 phút và dùng chính mã đơn để đối soát thanh toán.
          </p>
          <p className="mt-5 text-3xl font-black italic text-[#003078]">{totalPrice.toLocaleString()}đ</p>
          <Button type="primary" size="large" disabled={!sepayAvailable} loading={isCreatingOrder} className="mt-4 h-14 rounded-2xl px-10 font-black uppercase" onClick={onCreateOrder}>
            Tạo đơn và khóa ghế
          </Button>
        </div>
      ) : (
        <div className="mt-6 rounded-[32px] border border-dashed border-gray-200 bg-white p-8 text-center">
          <div className="mb-5 flex flex-wrap items-center justify-center gap-3">
            <Tag color="gold" className="m-0 px-4 py-2 text-base font-black">{order.orderQrCode}</Tag>
            <Tag color="blue" className="m-0 px-4 py-2">Hết hạn: {expiryText}</Tag>
          </div>

          {orderStatus === 'CANCELLED' ? (
            <Alert showIcon type="error" message="Đơn đã hết hạn; không chuyển khoản bằng mã QR này." />
          ) : order.paymentQrCode ? (
            <div className="flex flex-col items-center">
              <div className="relative mb-5 rounded-[32px] border-4 border-[#003078] bg-white p-3 shadow-xl">
                <Image src={order.paymentQrCode} alt={`QR thanh toán đơn ${order.orderQrCode}`} width={256} height={256} unoptimized className="h-64 w-64 object-contain" />
              </div>
              <Alert showIcon type="info" message={`Chuyển đúng ${Number(order.totalAmount).toLocaleString('vi-VN')}đ với nội dung: ${order.orderQrCode}`} />
              <p className="mt-3 text-sm text-blue-800">Đang tự kiểm tra giao dịch qua SePay. Không cần bấm xác nhận đã chuyển khoản.</p>
            </div>
          ) : (
            <Alert showIcon type="error" message="Không thể hiển thị QR thanh toán. Vui lòng liên hệ quản trị viên." />
          )}

          <Button type="primary" size="large" className="mt-6 h-14 rounded-2xl px-10 font-black uppercase" onClick={onFinish}>
            Xem trạng thái đơn
          </Button>
        </div>
      )}
    </Card>
  );
}
