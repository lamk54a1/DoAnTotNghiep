import Image from 'next/image';
import Link from 'next/link';
import StaticInfoPage from '../../components/Public/StaticInfoPage';

export default function StadiumPage() {
  return (
    <StaticInfoPage eyebrow="Sân nhà SLNA" title="Sân vận động Vinh" description="Tìm hiểu khu vực khán đài trước khi chọn trận đấu và đặt ghế.">
      <div className="space-y-6">
        <div className="overflow-hidden rounded-[28px] border border-blue-100 bg-[#06377d] p-2 shadow-xl sm:p-4">
          <Image
            src="/images/stadium-vinh-map.jpg"
            alt="Sơ đồ các khu khán đài sân vận động Vinh"
            width={1200}
            height={800}
            priority
            className="h-auto w-full rounded-2xl object-contain"
          />
        </div>

        <div className="rounded-[28px] bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="m-0 text-xs font-black uppercase tracking-[0.22em] text-[#d99f00]">Hướng dẫn chọn khu</p>
              <h2 className="m-0 mt-2 text-2xl font-black text-[#003078]">Các khu vé trên sơ đồ sân Vinh</h2>
              <p className="mb-0 mt-3 max-w-3xl text-sm leading-7 text-gray-600">
                Mỗi mã trên sơ đồ là một khu vé riêng. Khi trận đấu mở bán, bạn chọn đúng khu để xem giá và các ghế còn trống. Giá vé có thể thay đổi theo từng trận.
              </p>
            </div>
            <Link href="/matches" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#edbb00] px-5 py-3 text-xs font-black uppercase text-[#003078] transition hover:-translate-y-0.5 hover:shadow-md">
              Chọn trận và mua vé
            </Link>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
              <strong className="text-lg text-red-700">Khán đài A</strong>
              <p className="mb-0 mt-2 text-sm font-bold text-gray-600">Khu A1, A2, A3 và A5</p>
              <p className="mb-0 mt-2 text-xs leading-5 text-gray-500">Nằm dọc đường biên, gần khu VIP và khu kỹ thuật.</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
              <strong className="text-lg text-amber-700">Khán đài B</strong>
              <p className="mb-0 mt-2 text-sm font-bold text-gray-600">Khu B8, B9 và B10</p>
              <p className="mb-0 mt-2 text-xs leading-5 text-gray-500">Nằm đối diện khán đài A, quan sát toàn bộ mặt sân.</p>
            </div>
            <div className="rounded-2xl border border-lime-100 bg-lime-50 p-5">
              <strong className="text-lg text-lime-700">Khán đài C</strong>
              <p className="mb-0 mt-2 text-sm font-bold text-gray-600">Khu C6 và C7</p>
              <p className="mb-0 mt-2 text-xs leading-5 text-gray-500">Nằm phía sau cầu môn bên trái trên sơ đồ.</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <strong className="text-lg text-blue-700">Khán đài D</strong>
              <p className="mb-0 mt-2 text-sm font-bold text-gray-600">Khu D11, D12 và D13</p>
              <p className="mb-0 mt-2 text-xs leading-5 text-gray-500">Nằm phía sau cầu môn bên phải trên sơ đồ.</p>
            </div>
          </div>
        </div>
      </div>
    </StaticInfoPage>
  );
}
