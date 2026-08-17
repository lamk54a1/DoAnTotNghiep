import { HomeOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Result, Tag } from 'antd';

interface PaymentSuccessProps {
  ticketCode: string;
  confirmedSeats: string[];
}

export default function PaymentSuccess({ ticketCode, confirmedSeats }: PaymentSuccessProps) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-white px-6 pb-20 pt-28 font-montserrat">
      <div className="w-full max-w-2xl">
        <Result
          status="info"
          title={<span className="text-3xl font-black italic uppercase text-[#003078]">Đơn đang chờ xác nhận</span>}
          subTitle={`Mã đối soát của bạn là ${ticketCode}`}
        />
        <Card className="mb-8 rounded-[40px] border-none bg-gray-50 shadow-2xl">
          <div className="space-y-6 p-8">
            <Alert
              showIcon
              type="warning"
              message="Đây chưa phải vé vào sân"
              description="QR vé chỉ xuất hiện trong mục Vé của tôi sau khi thanh toán được xác nhận. Đơn quá hạn chưa được xác nhận sẽ tự hủy và hoàn ghế."
            />
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mã đơn hàng</span>
              <p className="mt-1 text-xl font-black italic text-[#003078]">{ticketCode}</p>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ghế đang chờ xác nhận</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {confirmedSeats.map((seat) => <Tag key={seat} color="gold" className="m-0 border-none font-bold">{seat}</Tag>)}
              </div>
            </div>
          </div>
        </Card>
        <Button block size="large" icon={<HomeOutlined />} className="h-14 rounded-2xl font-bold" onClick={() => window.location.href = '/my-tickets'}>
          XEM TRẠNG THÁI ĐƠN
        </Button>
      </div>
    </div>
  );
}
