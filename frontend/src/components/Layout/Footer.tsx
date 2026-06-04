import React from 'react';
import Link from 'next/link';
import { 
  FacebookOutlined, 
  YoutubeOutlined, 
  PhoneOutlined, 
  EnvironmentOutlined,
  SendOutlined
} from '@ant-design/icons';

const Footer = () => {
  return (
    <footer className="bg-[#003078] text-white pt-20 pb-10 font-montserrat mt-auto">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        
        {/* Cột 1: Thông tin CLB */}
        <div className="flex flex-col items-start">
          <div className="w-16 h-16 bg-[#edbb00] rounded-2xl flex items-center justify-center font-black text-[#003078] text-2xl mb-6 shadow-lg rotate-3">
            SLNA
          </div>
          <h3 className="text-lg font-black italic uppercase tracking-tighter mb-4 text-[#edbb00]">
            Sông Lam Nghệ An FC
          </h3>
          <p className="text-gray-400 text-xs leading-relaxed font-medium">
            Biểu tượng tự hào của người dân xứ Nghệ. Nơi đào tạo và cống hiến những tài năng bóng đá hàng đầu Việt Nam. Tinh thần thép, chiến thắng đẹp!
          </p>
        </div>

        {/* Cột 2: Điều hướng nhanh */}
        <div>
          <h4 className="text-[#edbb00] font-black mb-8 uppercase text-xs tracking-[0.2em]">Khám phá</h4>
          <ul className="space-y-4 text-sm font-bold text-gray-400 p-0 list-none">
            <li><Link href="/matches" className="hover:text-white transition-all flex items-center gap-2"><SendOutlined className="text-[10px]" /> Lịch thi đấu</Link></li>
            <li><Link href="/results" className="hover:text-white transition-all flex items-center gap-2"><SendOutlined className="text-[10px]" /> Kết quả thi đấu</Link></li>
            <li><Link href="/stadium" className="hover:text-white transition-all flex items-center gap-2"><SendOutlined className="text-[10px]" /> Sơ đồ sân Vinh</Link></li>
            <li><Link href="/news" className="hover:text-white transition-all flex items-center gap-2"><SendOutlined className="text-[10px]" /> Tin tức đội bóng</Link></li>
            <li><Link href="/membership" className="hover:text-white transition-all flex items-center gap-2"><SendOutlined className="text-[10px]" /> Hội cổ động viên</Link></li>
          </ul>
        </div>

        {/* Cột 3: Hỗ trợ khách hàng */}
        <div>
          <h4 className="text-[#edbb00] font-black mb-8 uppercase text-xs tracking-[0.2em]">Hỗ trợ</h4>
          <ul className="space-y-4 text-sm font-bold text-gray-400 p-0 list-none">
            <li><Link href="/policy" className="hover:text-white transition-all">Điều khoản mua vé</Link></li>
            <li><Link href="/faq" className="hover:text-white transition-all">Câu hỏi thường gặp</Link></li>
            <li><Link href="/contact" className="hover:text-white transition-all">Liên hệ hợp tác</Link></li>
            <li><Link href="/help" className="hover:text-white transition-all">Hướng dẫn thanh toán</Link></li>
          </ul>
        </div>

        {/* Cột 4: Liên hệ & Mạng xã hội */}
        <div>
          <h4 className="text-[#edbb00] font-black mb-8 uppercase text-xs tracking-[0.2em]">Liên hệ</h4>
          <div className="space-y-4 mb-8">
            <p className="text-xs text-gray-400 flex items-start gap-3 leading-relaxed">
              <EnvironmentOutlined className="text-[#edbb00] mt-1" />
              <span>Số 6, Đào Tấn, TP. Vinh, Nghệ An</span>
            </p>
            <p className="text-xs text-gray-400 flex items-center gap-3">
              <PhoneOutlined className="text-[#edbb00]" />
              <span>Hotline: 1900 xxxx</span>
            </p>
          </div>
          <div className="flex gap-3">
             <a href="#" className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-[#edbb00] hover:text-[#003078] hover:border-[#edbb00] transition-all group">
               <FacebookOutlined className="text-xl" />
             </a>
             <a href="#" className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-[#edbb00] hover:text-[#003078] hover:border-[#edbb00] transition-all">
               <YoutubeOutlined className="text-xl" />
             </a>
             <a href="#" className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-[#edbb00] hover:text-[#003078] hover:border-[#edbb00] transition-all">
               <span className="font-black text-[10px]">TIK</span>
             </a>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="max-w-7xl mx-auto px-6 border-t border-white/5 mt-20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
        <p>© 2026 SÔNG LAM NGHỆ AN TICKETING. ALL RIGHTS RESERVED.</p>
        <p className="text-gray-400">PHÁT TRIỂN BỞI <span className="text-[#edbb00]">NGUYỄN VIẾT LÃM (SỐ 7)</span></p>
      </div>
    </footer>
  );
};

export default Footer;
