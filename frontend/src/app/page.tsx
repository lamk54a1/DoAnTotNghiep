'use client'
import Hero from "../components/Home/Hero";
import MatchList from "../components/Home/MatchList";
import SponsorsSection from "../components/Home/SponsorsSection";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 pt-16">
      {/* Phần Banner */}
      <Hero />

      {/* Phần danh sách trận đấu */}
      <MatchList />

      <SponsorsSection />

      <section className="bg-[#003078] py-16 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 md:grid-cols-3">
          {[
            ['Vé điện tử QR', 'Nhận mã QR ngay sau khi đặt vé, lưu trong mục Vé của tôi và xuất trình tại cổng sân.'],
            ['Sơ đồ ghế trực quan', 'Chọn khán đài A, B, C, D với trạng thái ghế được cập nhật theo từng trận đấu.'],
            ['Kết quả & lịch đấu', 'Theo dõi trận sắp tới, trận đã kết thúc và kết quả do admin xác nhận.'],
          ].map(([title, text]) => (
            <article key={title} className="rounded-3xl border border-white/10 bg-white/5 p-7 shadow-lg backdrop-blur">
              <h3 className="text-xl font-black uppercase text-[#edbb00]">{title}</h3>
              <p className="mt-4 text-sm leading-7 text-blue-100">{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Section kêu gọi tham gia Hội cổ động viên */}
      <section className="bg-white py-20 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-block p-3 bg-slna-yellow/10 rounded-full mb-4">
             <span className="text-slna-blue font-bold text-sm uppercase tracking-widest px-4">Hào khí quê hương</span>
          </div>
          <h2 className="text-4xl font-black text-slna-blue mb-6">CHÁY HẾT MÌNH TRÊN KHÁN ĐÀI</h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg leading-relaxed">
            Hãy cùng hàng vạn cổ động viên nhuộm vàng khán đài Sân vận động Vinh, 
            tạo nên sức mạnh tiếp lửa cho đoàn quân áo vàng trong mọi trận đấu.
          </p>
        </div>
      </section>
    </main>
  );
}
