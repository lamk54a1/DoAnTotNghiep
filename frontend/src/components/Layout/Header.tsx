"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCartOutlined, UserOutlined, LogoutOutlined, DashboardOutlined, IdcardOutlined } from '@ant-design/icons';
import { Badge, Dropdown, MenuProps } from 'antd';
import { useBooking } from '../../hooks/useBooking'; // Đường dẫn tương đối của bạn
import { IUser } from '../../interfaces/IUser'; // Import interface User (đường dẫn tuỳ theo cấu trúc của bạn)

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<IUser | null>(null); // Trạng thái lưu user đăng nhập
  const { selectedSeats } = useBooking();
  const router = useRouter();

  useEffect(() => {
    // Xử lý hiệu ứng cuộn trang
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);

    // Xử lý lấy thông tin đăng nhập từ LocalStorage
    // Dùng trong useEffect để tránh lỗi Hydration của Next.js
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      setUser(JSON.parse(userInfo));
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hàm xử lý Đăng xuất
  const handleLogout = () => {
    localStorage.removeItem('user_info');
    localStorage.removeItem('access_token');
    setUser(null);
    router.push('/login'); // Đá về trang đăng nhập
  };

  // Cấu hình Menu thả xuống khi bấm vào Tên user
  const userMenu: MenuProps['items'] = [
    {
      key: 'my-tickets',
      label: <Link href="/my-tickets">Vé của tôi</Link>,
        icon: <IdcardOutlined />,
      },
    // Nếu là ADMIN thì chèn thêm nút Trang quản trị
    ...(user?.role === 'ADMIN' ? [{
      key: 'admin',
      label: <Link href="/admin/dashboard">Trang Quản Trị</Link>,
      icon: <DashboardOutlined className="text-red-500" />,
    }] : []),
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: <span onClick={handleLogout}>Đăng xuất</span>,
      icon: <LogoutOutlined />,
      danger: true,
    },
  ];

  return (
    <header className={`fixed w-full z-[100] transition-all duration-500 ${
      isScrolled ? 'bg-[#003078] shadow-xl py-3' : 'bg-transparent py-6'
    }`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        
        {/* LOGO SLNA */}
        <Link href="/" className="flex items-center gap-3 group no-underline">
          <div className="w-12 h-12 bg-[#edbb00] rounded-full flex items-center justify-center font-black text-[#003078] text-xl group-hover:rotate-[360deg] transition-all duration-700 shadow-inner">
            SLNA
          </div>
          <div className="flex flex-col leading-none">
            <span className={`font-black text-xl tracking-tighter transition-colors ${
              isScrolled ? 'text-white' : 'text-[#edbb00]'
            }`}>
              TICKETING
            </span>
            <span className="text-[8px] font-bold tracking-[0.3em] text-white opacity-50 uppercase">Official Store</span>
          </div>
        </Link>

        {/* MENU CHÍNH */}
        <nav className="hidden md:flex items-center gap-10 font-black text-[11px] uppercase tracking-[0.2em]">
          <Link href="/" className="text-white hover:text-[#edbb00] transition-all relative group">
            Trang chủ
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#edbb00] transition-all group-hover:w-full"></span>
          </Link>
          <Link href="/matches" className="text-white hover:text-[#edbb00] transition-all">Lịch thi đấu</Link>
          <Link href="/news" className="text-white hover:text-[#edbb00] transition-all">Tin tức</Link>
          <Link href="/my-tickets" className="text-[#edbb00] hover:text-white transition-all italic underline underline-offset-4">
            Vé của tôi
          </Link>
        </nav>

        {/* ACTIONS: GIỎ HÀNG & PROFILE */}
        <div className="flex items-center gap-6">
          <Link href={`/booking/current`}>
            <Badge count={selectedSeats?.length || 0} offset={[5, 0]} color="#edbb00" size="small">
              <ShoppingCartOutlined className={`text-2xl cursor-pointer transition-colors ${
                isScrolled ? 'text-white' : 'text-[#edbb00]'
              }`} />
            </Badge>
          </Link>

          <div className="h-8 w-[1px] bg-white/20 hidden sm:block"></div>

          {/* KIỂM TRA ĐĂNG NHẬP ĐỂ HIỂN THỊ NÚT */}
          {user ? (
            <Dropdown menu={{ items: userMenu }} placement="bottomRight" arrow>
              <button className={`flex items-center gap-2 font-black px-5 py-2 rounded-full text-[11px] tracking-widest transition-all shadow-md active:scale-95 ${
                isScrolled 
                ? 'bg-white text-[#003078] hover:bg-[#edbb00]' 
                : 'bg-[#edbb00] text-[#003078] hover:bg-white'
              }`}>
                <UserOutlined className="text-sm" />
                {user.fullName.toUpperCase()} {/* Hiển thị tên thay vì chữ ĐĂNG NHẬP */}
              </button>
            </Dropdown>
          ) : (
            <Link href="/login">
              <button className={`flex items-center gap-2 font-black px-5 py-2 rounded-full text-[11px] tracking-widest transition-all shadow-md active:scale-95 ${
                isScrolled 
                ? 'bg-white text-[#003078] hover:bg-[#edbb00]' 
                : 'bg-[#edbb00] text-[#003078] hover:bg-white'
              }`}>
                <UserOutlined className="text-sm" />
                ĐĂNG NHẬP
              </button>
            </Link>
          )}

        </div>
      </div>
    </header>
  );
};

export default Header;