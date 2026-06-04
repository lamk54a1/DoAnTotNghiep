'use client'; // Bắt buộc vì dùng hooks
import React, { useEffect, useState } from 'react';
import { IMatch } from '../../interfaces';
import MatchCard from './MatchCard';
import axiosClient from '../../api/axiosClient'; // Import axios đã cấu hình

const MatchList = () => {
  const [matches, setMatches] = useState<IMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const data = await axiosClient.get('/matches?scope=featured');
        setMatches(data as unknown as IMatch[]);
      } catch (err) {
        console.error("Lỗi lấy danh sách trận đấu:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, []);

  if (loading) return <div className="text-center py-20">Đang tải lịch thi đấu...</div>;

  return (
    <section className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black text-slna-blue italic uppercase">Trận đấu sắp tới</h2>
        <div className="h-1 flex-1 bg-gray-100 ml-6"></div>
      </div>
      
      {matches.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {matches.map((m) => <MatchCard key={m.id} match={m} />)}
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-8 text-center text-sm font-bold text-gray-500 shadow-sm">
          Hiện chưa có trận đấu nào đang mở bán vé.
        </div>
      )}
    </section>
  );
};

export default MatchList;
