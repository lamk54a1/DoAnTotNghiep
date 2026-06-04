import StaticInfoPage from '../../components/Public/StaticInfoPage';

export default function HelpPage() {
  return (
    <StaticInfoPage eyebrow="Hỗ trợ" title="Hướng dẫn thanh toán" description="Hoàn tất đặt vé trực tuyến trong bốn bước đơn giản.">
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ['01', 'Chọn trận đấu', 'Mở Lịch thi đấu và chọn trận có nhãn Đang bán vé.'],
          ['02', 'Chọn ghế', 'Chọn khu vực khán đài và tối đa 4 ghế còn trống trên sơ đồ sân.'],
          ['03', 'Thanh toán', 'Đăng nhập, kiểm tra tổng tiền và quét mã VietQR để chuyển khoản.'],
          ['04', 'Nhận vé QR', 'Mở Vé của tôi để lưu mã QR và xuất trình khi vào sân.'],
        ].map(([step, title, text]) => (
          <article key={step} className="rounded-2xl bg-white p-6 shadow-sm">
            <span className="text-3xl font-black text-[#edbb00]">{step}</span>
            <h2 className="mt-3 text-lg font-black text-[#003078]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">{text}</p>
          </article>
        ))}
      </div>
    </StaticInfoPage>
  );
}
