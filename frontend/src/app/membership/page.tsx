import Link from 'next/link';
import StaticInfoPage from '../../components/Public/StaticInfoPage';

export default function MembershipPage() {
  return (
    <StaticInfoPage eyebrow="Cộng đồng SLNA" title="Hội cổ động viên" description="Cùng kết nối, cổ vũ văn minh và tiếp lửa cho đội bóng xứ Nghệ trong từng trận đấu.">
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-black text-[#003078]">Cháy hết mình trên khán đài sân Vinh</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-600">Theo dõi lịch thi đấu, chuẩn bị sắc vàng truyền thống và đồng hành cùng cộng đồng người hâm mộ SLNA. Các chương trình thành viên và hoạt động cổ vũ sẽ được cập nhật tại đây.</p>
        <Link href="/contact" className="mt-6 inline-block rounded-xl bg-[#003078] px-5 py-3 text-xs font-black uppercase text-white transition hover:bg-[#edbb00] hover:text-[#003078]">
          Liên hệ tham gia
        </Link>
      </div>
    </StaticInfoPage>
  );
}
