import Image from 'next/image';
import Link from 'next/link';
import StaticInfoPage from '../../components/Public/StaticInfoPage';

export default function StadiumPage() {
  return (
    <StaticInfoPage eyebrow="Sân nhà SLNA" title="Sân vận động Vinh" description="Tìm hiểu khu vực khán đài trước khi chọn trận đấu và đặt ghế.">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <Image src="/images/sVinh.jpg" alt="Sân vận động Vinh" width={800} height={520} className="h-full min-h-72 w-full object-cover" />
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-black text-[#003078]">Bốn khu vực khán đài</h2>
          <p className="mt-4 text-sm leading-7 text-gray-600">Hệ thống vé trực tuyến chia sân thành khán đài A, B, C và D. Khi một trận mở bán, bạn có thể xem sơ đồ chi tiết và chọn ghế còn trống trực tiếp.</p>
          <ul className="mt-5 space-y-2 text-sm font-bold text-gray-600">
            <li>Khán đài A: 100.000đ</li>
            <li>Khán đài B: 50.000đ</li>
            <li>Khán đài C và D: 20.000đ</li>
          </ul>
          <Link href="/matches" className="mt-6 inline-block rounded-xl bg-[#edbb00] px-5 py-3 text-xs font-black uppercase text-[#003078]">
            Xem lịch thi đấu
          </Link>
        </div>
      </div>
    </StaticInfoPage>
  );
}
