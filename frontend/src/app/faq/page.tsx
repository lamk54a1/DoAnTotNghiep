import StaticInfoPage from '../../components/Public/StaticInfoPage';

const questions = [
  ['Tôi xem vé đã mua ở đâu?', 'Đăng nhập và mở mục Vé của tôi trên thanh điều hướng. Mã QR của từng vé sẽ hiển thị trong đơn hàng tương ứng.'],
  ['Vì sao tôi không thể mua vé của một trận?', 'Chỉ các trận có trạng thái Đang bán vé mới mở sơ đồ ghế. Trận sắp mở bán, hết vé hoặc đã kết thúc sẽ bị khóa đặt vé.'],
  ['Tôi có thể mua bao nhiêu vé?', 'Mỗi lần đặt vé bạn có thể chọn tối đa 4 ghế.'],
  ['Cần làm gì khi đến sân?', 'Mở sẵn mã QR của vé trong mục Vé của tôi và xuất trình tại cổng kiểm soát.'],
];

export default function FaqPage() {
  return (
    <StaticInfoPage eyebrow="Hỗ trợ" title="Câu hỏi thường gặp" description="Giải đáp nhanh các câu hỏi thường gặp khi sử dụng hệ thống vé SLNA.">
      <div className="space-y-4">
        {questions.map(([question, answer]) => (
          <article key={question} className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="m-0 text-base font-black text-[#003078]">{question}</h2>
            <p className="mb-0 mt-3 text-sm leading-6 text-gray-600">{answer}</p>
          </article>
        ))}
      </div>
    </StaticInfoPage>
  );
}
