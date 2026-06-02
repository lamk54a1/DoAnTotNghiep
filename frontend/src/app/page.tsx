'use client'
import Hero from "../components/Home/Hero";
import MatchList from "../components/Home/MatchList";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 pt-16">
      {/* Phần Banner */}
      <Hero />

      {/* Phần danh sách trận đấu */}
      <MatchList />

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