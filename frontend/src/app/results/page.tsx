'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Empty, Spin } from 'antd';
import axiosClient from '../../api/axiosClient';
import { IMatch } from '../../interfaces';

export default function ResultsPage() {
  const [matches, setMatches] = useState<IMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void axiosClient.get<IMatch[]>('/matches?scope=results')
      .then((data) => setMatches(data as unknown as IMatch[]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 pb-20 pt-24">
      <section className="bg-[#003078] px-6 py-14 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.3em] text-[#edbb00]">SLNA FC</p>
          <h1 className="m-0 text-4xl font-black uppercase">Kết quả thi đấu</h1>
          <p className="mt-3 text-sm text-blue-100">Các trận đã được ban quản trị xác nhận kết thúc.</p>
        </div>
      </section>
      <section className="mx-auto max-w-5xl space-y-4 px-6 py-12">
        {loading ? (
          <div className="py-20 text-center"><Spin size="large" /></div>
        ) : matches.length > 0 ? matches.map((match) => (
          <article key={match.id} className="grid gap-4 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-[160px_1fr_160px] md:items-center">
            <div className="text-xs font-bold text-gray-500">
              <div>{new Date(match.matchDate).toLocaleDateString('vi-VN')}</div>
              <div className="mt-1">{match.stadium}</div>
            </div>
            <div className="flex items-center justify-center gap-6">
              <div className="flex w-28 flex-col items-center gap-2 text-center">
                <Image src="/images/logo.png" alt="SLNA FC" width={52} height={52} className="h-13 w-13 object-contain" />
                <span className="text-xs font-black">SLNA FC</span>
              </div>
              <div className="rounded-xl bg-[#003078] px-5 py-3 text-2xl font-black text-[#edbb00]">
                {match.homeScore ?? 0} - {match.awayScore ?? 0}
              </div>
              <div className="flex w-28 flex-col items-center gap-2 text-center">
                <Image src={match.opponentLogo || '/images/logo.png'} alt={match.opponent} width={52} height={52} unoptimized className="h-13 w-13 object-contain" />
                <span className="text-xs font-black">{match.opponent}</span>
              </div>
            </div>
            <div className="text-right text-xs font-bold uppercase text-gray-400">{match.description || 'V-League'}</div>
          </article>
        )) : (
          <Empty description="Chưa có kết quả trận đấu" />
        )}
      </section>
    </main>
  );
}
