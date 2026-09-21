import Link from 'next/link';
import StaticInfoPage from '../../components/Public/StaticInfoPage';

export default function PrivacyPage() {
  return (
    <StaticInfoPage
      eyebrow="Quyền riêng tư"
      title="Chính sách quyền riêng tư"
      description="Cách hệ thống vé SLNA trong đồ án này xử lý thông tin khi bạn tạo tài khoản, đăng nhập và đặt vé."
    >
      <div className="space-y-6 rounded-2xl bg-white p-8 text-sm leading-7 text-gray-700 shadow-sm">
        <p>Cập nhật ngày 21/09/2026. Đơn vị vận hành: dự án đồ án SLNA Ticketing. Liên hệ: <a className="text-[#003078] underline" href="mailto:vietlam1201@gmail.com">vietlam1201@gmail.com</a>.</p>

        <section>
          <h2 className="text-lg font-bold text-[#003078]">Thông tin được xử lý</h2>
          <p>Khi sử dụng dịch vụ, hệ thống có thể lưu email, họ tên, số điện thoại, địa chỉ, mật khẩu đã băm hoặc mã định danh tài khoản Google/Facebook, cùng thông tin căn cước nếu bạn tự cung cấp để xác minh. Khi đặt vé, hệ thống lưu đơn hàng, trận đấu, ghế, trạng thái thanh toán, mã giao dịch và mã vé. Hệ thống cũng dùng cookie phiên đăng nhập, nhật ký kỹ thuật và nội dung bạn gửi qua các chức năng hỗ trợ.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#003078]">Mục đích sử dụng</h2>
          <p>Thông tin được dùng để tạo và bảo vệ tài khoản, xác minh người mua, xử lý đặt vé và thanh toán, phát hành vé điện tử, hỗ trợ người dùng, ngăn lạm dụng và xử lý sự cố. Không bán thông tin cá nhân cho bên thứ ba.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#003078]">Dịch vụ liên quan</h2>
          <p>Nếu bạn chọn đăng nhập mạng xã hội, Google hoặc Facebook xác thực tài khoản và cung cấp thông tin hồ sơ cơ bản được bạn cho phép. Chuyển khoản được đối soát qua SePay và ngân hàng nhận tiền. Nếu bạn dùng trợ lý AI, nội dung câu hỏi có thể được xử lý bởi nhà cung cấp dịch vụ AI để tạo câu trả lời. Dữ liệu cũng được xử lý trên hạ tầng lưu trữ và vận hành website.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#003078]">Lưu giữ và bảo vệ</h2>
          <p>Dữ liệu được lưu trong thời gian cần thiết để vận hành tài khoản, vé và đối soát giao dịch. Một số thông tin giao dịch có thể cần tiếp tục lưu theo nghĩa vụ áp dụng hoặc để xử lý tranh chấp. Quyền truy cập dữ liệu được giới hạn theo vai trò; bạn nên bảo mật tài khoản và không chia sẻ mã QR vé.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#003078]">Quyền của bạn</h2>
          <p>Bạn có thể xem hoặc cập nhật thông tin trong hồ sơ. Để hỏi về dữ liệu, yêu cầu sửa hoặc xóa dữ liệu tài khoản, hãy gửi email đến <a className="text-[#003078] underline" href="mailto:vietlam1201@gmail.com">vietlam1201@gmail.com</a>. Xem <Link className="text-[#003078] underline" href="/data-deletion">hướng dẫn yêu cầu xóa dữ liệu</Link> để biết cách thực hiện.</p>
        </section>
      </div>
    </StaticInfoPage>
  );
}
