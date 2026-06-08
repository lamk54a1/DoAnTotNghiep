import { HomeOutlined } from '@ant-design/icons';
import { Button, Card, Divider, QRCode, Result, Tag } from 'antd';

interface PaymentSuccessProps {
  ticketCode: string;
  confirmedSeats: string[];
}

export default function PaymentSuccess({ ticketCode, confirmedSeats }: PaymentSuccessProps) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-white px-6 pb-20 pt-28 font-montserrat">
      <div className="w-full max-w-2xl">
        <Result
          status="success"
          title={<span className="text-3xl font-black italic uppercase text-[#003078]">Giao dịch thành công</span>}
          subTitle={`Mã đơn hàng của bạn là ${ticketCode}`}
        />
        <Card className="mb-8 overflow-hidden rounded-[40px] border-none bg-gray-50 shadow-2xl">
          <div className="flex flex-col items-center gap-8 p-8 md:flex-row">
            <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
              <QRCode value={ticketCode} size={180} color="#003078" bordered={false} />
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mã vé định danh</span>
                <span className="text-lg font-black italic text-[#003078]">{ticketCode}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Vị trí ghế đã mua</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {confirmedSeats.map((seat) => <Tag key={seat} color="gold" className="m-0 border-none font-bold">{seat}</Tag>)}
                </div>
              </div>
              <Divider className="my-2" />
              <p className="m-0 text-[11px] font-medium italic text-gray-500">
                * Vui lòng xuất trình mã QR này tại cửa kiểm soát Sân vận động Vinh.
              </p>
            </div>
          </div>
        </Card>
        <Button block size="large" icon={<HomeOutlined />} className="h-14 rounded-2xl font-bold" onClick={() => window.location.href = '/'}>
          VỀ TRANG CHỦ
        </Button>
      </div>
    </div>
  );
}
