import { ShoppingCartOutlined } from '@ant-design/icons';
import { Button, Card, Divider, Statistic, Tag } from 'antd';

interface BookingOrderCardProps {
  purchasedTicketCount: number;
  remainingTicketQuota: number;
  selectedSeats: string[];
  totalPrice: number;
  onCheckout: () => void;
  onToggleSeat: (seatId: string) => void;
}

export default function BookingOrderCard({
  purchasedTicketCount,
  remainingTicketQuota,
  selectedSeats,
  totalPrice,
  onCheckout,
  onToggleSeat,
}: BookingOrderCardProps) {
  return (
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
              selectedSeats.map((seat) => (
                <Tag key={seat} closable onClose={() => onToggleSeat(seat)} className="m-0 rounded-full border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-black text-[#003078]">
                  {seat}
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
          type="primary"
          block
          size="large"
          disabled={selectedSeats.length === 0 || remainingTicketQuota === 0}
          onClick={onCheckout}
          className="flex h-16 items-center justify-center gap-2 rounded-2xl border-none bg-[#003078] text-lg font-black italic uppercase shadow-xl transition-all hover:bg-[#edbb00] active:scale-95"
        >
          <ShoppingCartOutlined /> {remainingTicketQuota === 0 ? 'ĐÃ ĐẠT GIỚI HẠN' : 'TIẾP TỤC'}
        </Button>
      </div>
    </Card>
  );
}
