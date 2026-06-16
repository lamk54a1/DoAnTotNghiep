'use client';

import { useEffect, useState } from 'react';

interface MatchCountdownProps {
  matchDate: Date | string;
}

export default function MatchCountdown({ matchDate }: MatchCountdownProps) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => setRemaining(Math.max(0, new Date(matchDate).getTime() - Date.now()));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [matchDate]);

  const totalSeconds = Math.floor(remaining / 1000);
  const parts = [
    ['Ngày', Math.floor(totalSeconds / 86400)],
    ['Giờ', Math.floor((totalSeconds % 86400) / 3600)],
    ['Phút', Math.floor((totalSeconds % 3600) / 60)],
    ['Giây', totalSeconds % 60],
  ];

  return (
    <div className="mt-7">
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-[#edbb00]">
        {remaining > 0 ? 'Đếm ngược đến giờ bóng lăn' : 'Trận đấu đã bắt đầu'}
      </p>
      <div className="flex flex-wrap gap-2">
        {parts.map(([label, value]) => (
          <div key={label} className="min-w-16 rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-center backdrop-blur">
            <strong className="block text-xl font-black text-white">{String(value).padStart(2, '0')}</strong>
            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-100">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
