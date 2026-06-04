'use client';

import { useEffect, useState } from 'react';
import { Empty, Spin } from 'antd';
import axiosClient from '../../api/axiosClient';
import MatchCard from '../../components/Home/MatchCard';
import { IMatch } from '../../interfaces';

export default function MatchesPage() {
  const [matches, setMatches] = useState<IMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void axiosClient.get<IMatch[]>('/matches?scope=schedule')
      .then((data) => setMatches(data as unknown as IMatch[]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 pb-20 pt-24">
      <section className="bg-[#003078] px-6 py-14 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.3em] text-[#edbb00]">SLNA Ticketing</p>
          <h1 className="m-0 text-4xl font-black uppercase">Lịch thi đấu</h1>
          <p className="mt-3 text-sm text-blue-100">Theo dõi các trận sắp tới và chọn trận đang mở bán để đặt vé.</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-12">
        {loading ? (
          <div className="py-20 text-center"><Spin size="large" /></div>
        ) : matches.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => <MatchCard key={match.id} match={match} />)}
          </div>
        ) : (
          <Empty description="Chưa có lịch thi đấu sắp tới" />
        )}
      </section>
    </main>
  );
}
