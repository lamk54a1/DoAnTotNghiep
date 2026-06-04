import StaticInfoPage from '../../components/Public/StaticInfoPage';

const articles = [
  { title: 'Cùng tiếp lửa cho đội bóng xứ Nghệ tại sân Vinh', category: 'Câu lạc bộ', text: 'Theo dõi lịch thi đấu và đặt vé trực tuyến để đồng hành cùng SLNA trong các trận đấu sân nhà.' },
  { title: 'Hướng dẫn vào sân nhanh với vé QR', category: 'Vé điện tử', text: 'Chuẩn bị sẵn mã QR trong mục Vé của tôi trước khi đến cổng kiểm soát để quá trình check-in thuận tiện hơn.' },
  { title: 'Thông tin dành cho hội cổ động viên SLNA', category: 'Cộng đồng', text: 'Cập nhật hoạt động cổ vũ, liên hệ hợp tác và các quyền lợi dành cho người hâm mộ đội bóng.' },
];

export default function NewsPage() {
  return (
    <StaticInfoPage eyebrow="Tin tức SLNA" title="Tin tức đội bóng" description="Cập nhật thông tin vé, lịch thi đấu và hoạt động dành cho cổ động viên Sông Lam Nghệ An.">
      <div className="grid gap-6 md:grid-cols-3">
        {articles.map((article) => (
          <article key={article.title} className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#edbb00]">{article.category}</p>
            <h2 className="mt-3 text-lg font-black leading-6 text-[#003078]">{article.title}</h2>
            <p className="mt-4 text-sm leading-6 text-gray-500">{article.text}</p>
          </article>
        ))}
      </div>
    </StaticInfoPage>
  );
}
