import StaticInfoPage from '../../components/Public/StaticInfoPage';

export default function ContactPage() {
  return (
    <StaticInfoPage eyebrow="Kết nối" title="Liên hệ hợp tác" description="Thông tin liên hệ dành cho cổ động viên, đối tác và đơn vị truyền thông.">
      <div className="grid gap-6 md:grid-cols-3">
        {[
          ['Địa chỉ', 'Số 6, Đào Tấn, TP. Vinh, Nghệ An'],
          ['Hotline', '1900 xxxx'],
          ['Email', 'ticketing@slnafc.vn'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#003078]">{label}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">{value}</p>
          </div>
        ))}
      </div>
    </StaticInfoPage>
  );
}
