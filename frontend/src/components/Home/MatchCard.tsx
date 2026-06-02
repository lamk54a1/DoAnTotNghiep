import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { IMatch } from '../../interfaces';

interface Props {
  match: IMatch;
}

const MatchCard = ({ match }: Props) => {
  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-100 group">
      
      {/* Banner Header Trận đấu */}
      <div className="bg-[#003078] p-6 relative">
        {/* Badge Trạng thái */}
        <div className={`absolute top-4 right-4 text-[10px] font-black px-3 py-1 rounded-full z-20 shadow-lg ${
          match.status === 'ON_SALE' ? 'bg-[#FFD700] text-[#003078]' : 'bg-red-600 text-white'
        }`}>
          {match.status === 'ON_SALE' ? '• ĐANG BÁN VÉ' : 'HẾT VÉ'}
        </div>

        {/* Khu vực đối đầu (Matchup) */}
        <div className="flex items-center justify-around py-4 relative z-10">
          
          {/* Đội chủ nhà SLNA */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 bg-white rounded-full p-2 shadow-inner border-4 border-[#FFD700] transform group-hover:rotate-6 transition-transform">
              <Image 
                src="/images/logo.png" 
                alt="SLNA FC" 
                width={80} 
                height={80} 
                className="object-contain"
              />
            </div>
            <span className="text-white font-black text-sm tracking-widest uppercase">SLNA FC</span>
          </div>

          {/* VS & Time */}
          <div className="flex flex-col items-center">
            <span className="text-[#FFD700] font-black text-3xl italic drop-shadow-md">VS</span>
            <div className="bg-white/10 px-3 py-1 rounded mt-2">
               <span className="text-white text-[10px] font-bold">18:00</span>
            </div>
          </div>

          {/* Đội khách */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 bg-white rounded-full p-2 shadow-inner border-4 border-gray-300 transform group-hover:-rotate-6 transition-transform">
              <Image 
                src={match.opponentLogo || "/images/logos/default-team.png"} 
                alt={match.opponent} 
                width={80} 
                height={80} 
                className="object-contain"
              />
            </div>
            <span className="text-white font-black text-sm tracking-widest uppercase truncate max-w-[100px]">
              {match.opponent}
            </span>
          </div>
        </div>

        {/* Họa tiết trang trí chìm */}
        <div className="absolute inset-0 opacity-10 flex items-center justify-center font-black text-6xl text-white pointer-events-none italic">
            SLNA
        </div>
      </div>

      {/* Thông tin chi tiết bên dưới */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
            <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded">V-LEAGUE 2026</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500 text-xs font-medium italic">{match.description || "Vòng thi đấu"}</span>
        </div>

        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-lg">🏟️</span>
            <span className="text-sm font-semibold">{match.stadium}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-lg">📅</span>
            <span className="text-sm font-semibold">
                {new Date(match.matchDate).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-dashed border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Giá chỉ từ</p>
            <p className="text-[#003078] font-black text-2xl">{match.ticketPriceMin?.toLocaleString('en-US')}đ</p>
          </div>
          
          <Link href={`/booking/${match.id}`}>
            <button className={`px-6 py-3 rounded-xl font-black text-sm transition-all shadow-md ${
              match.status === 'ON_SALE' 
              ? 'bg-[#FFD700] text-[#003078] hover:bg-[#003078] hover:text-[#FFD700]' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}>
              {match.status === 'ON_SALE' ? 'MUA VÉ NGAY' : 'HẾT VÉ'}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MatchCard;