import StaticInfoPage from '../../components/Public/StaticInfoPage';

export default function ContactPage() {
  return (
    <StaticInfoPage eyebrow="Kết nối" title="Liên hệ" description="Kênh liên hệ của người vận hành dự án đồ án SLNA Ticketing.">
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-wider text-[#003078]">Email hỗ trợ</h2>
        <a href="mailto:vietlam1201@gmail.com" className="mt-3 inline-block text-sm text-[#003078] underline">vietlam1201@gmail.com</a>
        <p className="mt-3 text-sm leading-6 text-gray-600">Dùng địa chỉ này để hỏi về tài khoản, đặt vé hoặc gửi yêu cầu liên quan đến dữ liệu cá nhân.</p>
      </div>
    </StaticInfoPage>
  );
}
