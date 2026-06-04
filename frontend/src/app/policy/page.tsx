import StaticInfoPage from '../../components/Public/StaticInfoPage';

export default function PolicyPage() {
  return (
    <StaticInfoPage eyebrow="Hỗ trợ" title="Điều khoản mua vé" description="Các nguyên tắc cơ bản khi đặt vé trực tuyến cho trận đấu sân nhà của SLNA.">
      <div className="space-y-5 rounded-2xl bg-white p-8 text-sm leading-7 text-gray-600 shadow-sm">
        <p><b className="text-[#003078]">1. Phạm vi sử dụng:</b> Vé điện tử chỉ có giá trị cho đúng trận đấu, khu vực và ghế ghi trên vé.</p>
        <p><b className="text-[#003078]">2. Giới hạn đặt vé:</b> Mỗi giao dịch được chọn tối đa 4 ghế để bảo đảm cơ hội mua vé công bằng.</p>
        <p><b className="text-[#003078]">3. Mã QR:</b> Không chia sẻ mã QR vé với người khác. Mỗi vé chỉ được check-in một lần tại cổng sân.</p>
        <p><b className="text-[#003078]">4. Hoàn và hủy vé:</b> Liên hệ bộ phận hỗ trợ để được xem xét theo tình trạng đơn hàng và quy định của từng trận.</p>
      </div>
    </StaticInfoPage>
  );
}
