'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import StaticInfoPage from '../../components/Public/StaticInfoPage';

interface NewsArticle {
  id: string;
  title: string;
  url: string;
  summary: string | null;
  imageUrl: string | null;
  category: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  publisher: string;
}

interface NewsResponse {
  items: NewsArticle[];
  source: {
    publisher: string;
    baseUrl: string;
    lastSyncedAt: string | null;
    lastSyncStatus: string | null;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const formatDate = (value: string | null) => {
  if (!value) return 'Chưa xác định ngày đăng';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

function ArticleImage({ article, priority = false }: { article: NewsArticle; priority?: boolean }) {
  const [failed, setFailed] = useState(false);

  if (!article.imageUrl || failed) {
    return (
      <div className="flex h-full min-h-52 items-center justify-center bg-gradient-to-br from-[#003078] to-[#0050b8] px-8 text-center text-2xl font-black uppercase text-white">
        Sông Lam Nghệ An
      </div>
    );
  }

  return (
    <Image
      src={article.imageUrl}
      alt={article.title}
      fill
      priority={priority}
      sizes="(max-width: 768px) 100vw, 50vw"
      className="object-cover transition-transform duration-500 group-hover:scale-105"
      onError={() => setFailed(true)}
    />
  );
}

export default function NewsPage() {
  const [data, setData] = useState<NewsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNews = useCallback(async (requestedPage: number) => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosClient.get<NewsResponse>(`/news?page=${requestedPage}&limit=9`);
      setData(response);
    } catch (requestError) {
      console.error('Không thể tải tin SLNAFC:', requestError);
      setError('Chưa thể tải tin từ SLNAFC. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Đồng bộ state giao diện với API khi trang phân trang thay đổi.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNews(page);
  }, [loadNews, page]);

  const changePage = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <StaticInfoPage
      eyebrow="Nguồn chính thức SLNAFC"
      title="Tin tức đội bóng"
      description="Tin tức được đồng bộ từ website chính thức của Câu lạc bộ Sông Lam Nghệ An. Nhấn vào bài viết để xem nội dung đầy đủ tại SLNAFC."
    >
      <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-white px-5 py-4 text-sm text-gray-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-black text-[#003078]">Nguồn: </span>
          <a href={data?.source.baseUrl || 'https://slnafc.com'} target="_blank" rel="noopener noreferrer" className="font-bold text-[#0050b8] hover:underline">
            {data?.source.publisher || 'SLNAFC'} ↗
          </a>
        </div>
        {data?.source.lastSyncedAt && (
          <p className="m-0 text-xs">Cập nhật lần cuối: {formatDate(data.source.lastSyncedAt)}</p>
        )}
      </div>

      {loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Đang tải tin tức">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="h-52 animate-pulse bg-gray-200" />
              <div className="space-y-3 p-6">
                <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
                <div className="h-6 animate-pulse rounded bg-gray-200" />
                <div className="h-16 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
          <p className="font-bold text-red-700">{error}</p>
          <button type="button" onClick={() => loadNews(page)} className="mt-4 rounded-full bg-[#003078] px-6 py-3 text-sm font-black text-white transition hover:bg-[#00449f]">
            Tải lại
          </button>
        </div>
      )}

      {!loading && !error && data?.items.length === 0 && (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <p className="font-bold text-gray-600">Chưa có bài viết được đồng bộ.</p>
          <a href="https://slnafc.com/tin-tuc" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block font-black text-[#003078] hover:underline">
            Xem tin trực tiếp tại SLNAFC ↗
          </a>
        </div>
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.items.map((article, index) => (
              <article key={article.id} className="group flex overflow-hidden rounded-2xl bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="flex w-full flex-col" aria-label={`${article.title} - xem tại SLNAFC`}>
                  <div className="relative h-52 overflow-hidden">
                    <ArticleImage article={article} priority={index < 3} />
                    <span className="absolute left-4 top-4 rounded-full bg-[#edbb00] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#003078] shadow-sm">
                      {article.category || article.publisher}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <p className="m-0 text-xs font-bold text-gray-400">{formatDate(article.publishedAt || article.fetchedAt)}</p>
                    <h2 className="mt-3 line-clamp-3 text-xl font-black leading-7 text-[#003078] transition group-hover:text-[#0050b8]">{article.title}</h2>
                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-500">
                      {article.summary || 'Xem nội dung chi tiết trên website chính thức của SLNAFC.'}
                    </p>
                    <span className="mt-5 text-sm font-black text-[#003078]">Đọc tại SLNAFC →</span>
                  </div>
                </a>
              </article>
            ))}
          </div>

          {data.pagination.totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-4" aria-label="Phân trang tin tức">
              <button type="button" disabled={page <= 1} onClick={() => changePage(page - 1)} className="rounded-full border border-[#003078] px-5 py-2 text-sm font-black text-[#003078] disabled:cursor-not-allowed disabled:opacity-40">
                ← Trang trước
              </button>
              <span className="text-sm font-bold text-gray-500">Trang {page}/{data.pagination.totalPages}</span>
              <button type="button" disabled={page >= data.pagination.totalPages} onClick={() => changePage(page + 1)} className="rounded-full bg-[#003078] px-5 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
                Trang sau →
              </button>
            </nav>
          )}
        </>
      )}
    </StaticInfoPage>
  );
}
