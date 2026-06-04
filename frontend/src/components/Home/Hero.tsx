'use client';

import React, { useEffect, useState } from 'react';
import { CalendarOutlined, EnvironmentOutlined, FireOutlined, TrophyOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import { IMatch } from '../../interfaces';

const Hero = () => {
  const [featuredMatch, setFeaturedMatch] = useState<IMatch | null>(null);

  useEffect(() => {
    void axiosClient.get<IMatch[]>('/matches?scope=featured')
      .then((data) => {
        const matches = data as unknown as IMatch[];
        setFeaturedMatch(matches[0] || null);
      })
      .catch(() => setFeaturedMatch(null));
  }, []);

  const bannerImage = featuredMatch?.bannerImage || '/images/sVinh.jpg';

  return (
    <section className="bg-gray-50 px-6 pb-12 pt-10">
      <div className="mx-auto max-w-7xl text-center">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.45em] text-[#edbb00]">Official SLNA Ticketing</p>
        <h1 className="m-0 text-5xl font-black italic tracking-tight text-[#003078] md:text-7xl">
          SÔNG LAM NGHỆ AN
        </h1>
        <p className="mt-4 text-base font-bold uppercase tracking-[0.22em] text-gray-500 md:text-xl">
          Ngoan cường chất Nghệ - Khí thế sông Lam
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-7xl overflow-hidden rounded-[44px] bg-[#003078] shadow-2xl">
        <div
          className="relative min-h-[480px] bg-cover bg-center"
          style={{ backgroundImage: `url("${bannerImage}")` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#003078]/95 via-[#003078]/70 to-black/20" />
          <div className="relative z-10 flex min-h-[480px] flex-col justify-end p-8 text-left text-white md:p-12">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#edbb00] px-4 py-2 text-[11px] font-black uppercase tracking-widest text-[#003078]">
                <FireOutlined /> Trận cầu tâm điểm
              </div>
              <h2 className="m-0 text-3xl font-black uppercase leading-tight md:text-5xl">
                {featuredMatch ? `SLNA FC vs ${featuredMatch.opponent}` : 'Sân Vinh chờ ngày rực lửa'}
              </h2>
              <p className="mt-4 max-w-xl text-sm font-medium leading-7 text-blue-100">
                {featuredMatch?.description || 'Cập nhật trận đấu đang mở bán, thông tin khán đài và trải nghiệm vé điện tử chính thức của câu lạc bộ.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-xs font-black uppercase tracking-wider text-white">
                <span className="rounded-full bg-white/10 px-4 py-2 backdrop-blur">
                  <CalendarOutlined /> {featuredMatch ? new Date(featuredMatch.matchDate).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : 'Lịch thi đấu SLNA'}
                </span>
                <span className="rounded-full bg-white/10 px-4 py-2 backdrop-blur">
                  <EnvironmentOutlined /> {featuredMatch?.stadium || 'Sân vận động Vinh'}
                </span>
                <span className="rounded-full bg-white/10 px-4 py-2 backdrop-blur">
                  <TrophyOutlined /> V-League 2026
                </span>
              </div>
            </div>
          </div>
          <div className="absolute right-8 top-8 text-[120px] font-black italic leading-none text-white/10 md:text-[180px]">
            SLNA
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
