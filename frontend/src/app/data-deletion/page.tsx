import Link from 'next/link';
import StaticInfoPage from '../../components/Public/StaticInfoPage';

export default function DataDeletionPage() {
  return (
    <StaticInfoPage
      eyebrow="Quyền riêng tư"
      title="Yêu cầu xóa dữ liệu"
      description="Hướng dẫn yêu cầu xóa dữ liệu đã cung cấp cho hệ thống vé SLNA, kể cả khi bạn đăng nhập bằng Facebook hoặc Google."
    >
      <div className="space-y-6 rounded-2xl bg-white p-8 text-sm leading-7 text-gray-700 shadow-sm">
        <section>
          <h2 className="text-lg font-bold text-[#003078]">Cách gửi yêu cầu</h2>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Gửi email từ địa chỉ dùng để đăng ký tài khoản đến <a className="text-[#003078] underline" href="mailto:vietlam1201@gmail.com?subject=Yeu%20cau%20xoa%20du%20lieu%20SLNA%20Ticketing">vietlam1201@gmail.com</a>.</li>
            <li>Ghi tiêu đề “Yêu cầu xóa dữ liệu SLNA Ticketing”, nêu email tài khoản và yêu cầu xóa tài khoản hoặc dữ liệu cụ thể.</li>
            <li>Chờ phản hồi để xác minh quyền sở hữu tài khoản và xác nhận phạm vi xóa. Không gửi mật khẩu, mã OTP hoặc ảnh căn cước qua email.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#003078]">Sau khi xác minh</h2>
          <p>Người vận hành xem xét và xử lý thủ công dữ liệu tài khoản theo yêu cầu. Dữ liệu không còn cần thiết được xóa hoặc tách khỏi tài khoản; thông tin giao dịch cần lưu để đối soát, giải quyết tranh chấp hoặc tuân thủ nghĩa vụ áp dụng có thể được giữ lại ở mức cần thiết. Việc xóa tài khoản có thể khiến bạn không còn truy cập được vé và lịch sử đặt vé; hãy lưu lại thông tin cần thiết trước khi yêu cầu.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#003078]">Nếu bạn dùng Facebook Login</h2>
          <p>Bạn có thể gỡ quyền truy cập của ứng dụng trong phần cài đặt Facebook. Thao tác gỡ quyền tại Facebook không tự xóa dữ liệu đơn hàng đã lưu trên website; hãy gửi yêu cầu theo các bước trên nếu muốn xóa dữ liệu tại đây.</p>
        </section>

        <p>Đọc thêm <Link className="text-[#003078] underline" href="/privacy">chính sách quyền riêng tư</Link> hoặc liên hệ email trên nếu bạn cần hỗ trợ.</p>
      </div>
    </StaticInfoPage>
  );
}
