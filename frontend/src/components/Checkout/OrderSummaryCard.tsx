import { Card } from 'antd';

interface OrderSummaryCardProps {
  totalPrice: number;
}

export default function OrderSummaryCard({ totalPrice }: OrderSummaryCardProps) {
  return (
    <Card className="sticky top-28 overflow-hidden rounded-[32px] border-none shadow-xl">
      <div className="-m-6 mb-6 bg-[#003078] p-5 text-center text-white">
        <h3 className="m-0 text-base font-black italic uppercase tracking-tighter">Tóm tắt đơn hàng</h3>
      </div>
      <div className="space-y-4">
        <div className="flex justify-between text-xs">
          <span className="font-bold uppercase text-gray-400">Địa điểm tổ chức</span>
          <span className="font-black text-[#003078]">SÂN VẬN ĐỘNG VINH</span>
        </div>
        <div className="flex items-center justify-between border-t pt-4 text-xs">
          <span className="font-black uppercase text-gray-400">Tổng cộng</span>
          <span className="text-2xl font-black italic text-[#003078]">{totalPrice.toLocaleString()}đ</span>
        </div>
      </div>
    </Card>
  );
}
