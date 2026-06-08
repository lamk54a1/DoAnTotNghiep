import { Button, Result } from 'antd';

export default function EmptyCheckoutState() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-white px-6 pb-20 pt-28 font-montserrat">
      <Result
        status="warning"
        title="Bạn chưa chọn ghế"
        subTitle="Vui lòng quay lại lịch thi đấu, chọn trận đang mở bán và chọn ghế trước khi thanh toán."
        extra={<Button type="primary" onClick={() => window.location.href = '/matches'}>Xem lịch thi đấu</Button>}
      />
    </div>
  );
}
