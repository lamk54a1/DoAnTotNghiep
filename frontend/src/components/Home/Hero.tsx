import React from 'react';
import Image from 'next/image';

const Hero = () => {
  return (
    <section className="relative h-[600px] w-full flex items-center justify-center overflow-hidden">
      {/* Lớp phủ ảnh tối ưu */}
      <div className="absolute inset-0 bg-[#003078]">
        <Image 
          src="/images/sVinh.jpg"
          alt="Sân vận động Vinh"
          fill
          className="object-cover opacity-40"
          priority
        />
        {/* Lớp gradient làm nổi bật chữ */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#003078]/80"></div>
      </div>
      
      {/* Nội dung Banner */}
      <div className="relative z-10 text-center px-4">
        <h2 className="text-6xl md:text-8xl font-black text-[#FFD700] mb-4 drop-shadow-2xl italic tracking-tighter animate-fade-in-up">
          SÔNG LAM NGHỆ AN
        </h2>
        <p className="text-white text-xl md:text-2xl font-bold tracking-[0.2em] uppercase opacity-90">
          Ngoan cường chất Nghệ - Khí thế sông Lam
        </p>
        
        <div className="flex justify-center gap-6 mt-10">
          <button className="bg-[#FFD700] text-[#003078] font-black px-12 py-4 rounded-full text-lg hover:scale-110 transition-all shadow-[0_0_20px_rgba(255,215,0,0.4)]">
            MUA VÉ NGAY
          </button>
          <button className="border-2 border-white text-white font-bold px-12 py-4 rounded-full text-lg hover:bg-white hover:text-[#003078] transition-all">
            LỊCH THI ĐẤU
          </button>
        </div>
      </div>

      {/* Trang trí góc banner */}
      <div className="absolute bottom-10 left-10 text-white/20 font-black text-9xl select-none hidden lg:block">
        SLNA
      </div>
    </section>
  );
};

export default Hero;