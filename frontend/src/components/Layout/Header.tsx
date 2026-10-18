"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCartOutlined, UserOutlined, LogoutOutlined, DashboardOutlined, IdcardOutlined, QrcodeOutlined, MenuOutlined, CloseOutlined } from '@ant-design/icons';
import { Badge, Dropdown, MenuProps } from 'antd';
import { useBooking } from '../../hooks/useBooking'; // Đường dẫn tương đối của bạn
import { AUTH_SESSION_CHANGED, clearAuthSession, getStoredUser, StoredUser } from '../../utils/authSession';
import { authApi } from '../../api/authApi';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null); // Chỉ lưu dữ liệu hiển thị không nhạy cảm
  const { selectedSeats } = useBooking();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Xử lý hiệu ứng cuộn trang
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);

    // Xử lý lấy thông tin đăng nhập từ LocalStorage
    // Dùng trong useEffect để tránh lỗi Hydration của Next.js
    const syncUser = () => setUser(getStoredUser());
    queueMicrotask(syncUser);
    window.addEventListener(AUTH_SESSION_CHANGED, syncUser);
    window.addEventListener('storage', syncUser);
    window.addEventListener('focus', syncUser);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener(AUTH_SESSION_CHANGED, syncUser);
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('focus', syncUser);
    };
  }, [pathname]);

  // Hàm xử lý Đăng xuất
  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuthSession();
    }
    router.push('/login'); // Đá về trang đăng nhập
  };

  // Cấu hình Menu thả xuống khi bấm vào Tên user
  const userMenu: MenuProps['items'] = [
    {
      key: 'profile',
      label: <Link href="/profile">Thông tin cá nhân</Link>,
      icon: <UserOutlined />,
    },
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
    ...(user?.role === 'SCANNER' ? [{
      key: 'scanner',
      label: <Link href="/admin/scanner">Soát vé QR</Link>,
      icon: <QrcodeOutlined className="text-green-600" />,
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

  const solidHeader = isScrolled || pathname !== '/';
  const navigation = [
    { href: '/', label: 'Trang chủ' },
    { href: '/matches', label: 'Lịch thi đấu' },
    { href: '/results', label: 'Kết quả' },
    { href: '/news', label: 'Tin tức' },
    { href: '/my-tickets', label: 'Vé của tôi' },
  ];

  return (
    <header className={`fixed z-[100] w-full transition-all duration-300 ${
      solidHeader ? 'bg-[#003078]/95 py-3 shadow-xl backdrop-blur-md' : 'bg-gradient-to-b from-black/45 to-transparent py-5'
    }`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
        
        {/* LOGO SLNA */}
        <Link href="/" className="flex items-center gap-3 group no-underline">
          <div className="relative h-14 w-11 shrink-0 transition-transform duration-300 group-hover:scale-105">
            <Image
              src="/images/logo-transparent.png"
              alt="Logo Câu lạc bộ Sông Lam Nghệ An"
              fill
              priority
              sizes="44px"
              className="object-contain drop-shadow-lg"
            />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-lg font-black tracking-tighter text-white transition-colors sm:text-xl">
              TICKETING
            </span>
            <span className="text-[8px] font-bold tracking-[0.22em] text-white opacity-60 uppercase">Hệ thống bán vé</span>
          </div>
        </Link>

        {/* MENU CHÍNH */}
        <nav className="hidden items-center gap-7 text-[11px] font-black uppercase tracking-[0.16em] lg:flex" aria-label="Điều hướng chính">
          {navigation.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`site-nav-link relative py-2 transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:bg-[#edbb00] after:transition-transform ${active ? 'site-nav-link-active after:scale-x-100' : 'after:scale-x-0 hover:after:scale-x-100'}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* ACTIONS: GIỎ HÀNG & PROFILE */}
        <div className="flex items-center gap-3 sm:gap-5">
          <Link href={selectedSeats.length > 0 ? '/checkout' : '/matches'} aria-label={`Giỏ vé, ${selectedSeats.length} ghế đã chọn`}>
            <Badge count={selectedSeats?.length || 0} offset={[5, 0]} color="#edbb00" size="small">
              <ShoppingCartOutlined className="cursor-pointer text-2xl text-white transition-colors hover:text-[#edbb00]" />
            </Badge>
          </Link>

          <div className="h-8 w-[1px] bg-white/20 hidden sm:block"></div>

          {/* KIỂM TRA ĐĂNG NHẬP ĐỂ HIỂN THỊ NÚT */}
          {user ? (
            <Dropdown menu={{ items: userMenu }} placement="bottomRight" arrow>
              <button aria-label="Mở menu tài khoản" className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[11px] font-black tracking-widest text-[#003078] shadow-md transition-all hover:bg-[#edbb00] active:scale-95 sm:px-5">
                <UserOutlined className="text-sm" />
                <span className="hidden max-w-40 truncate sm:inline">{(user.fullName || user.email).toUpperCase()}</span>
              </button>
            </Dropdown>
          ) : (
            <Link
              href="/login"
              suppressHydrationWarning
              className="hidden items-center gap-2 rounded-full bg-white px-5 py-2 text-[11px] font-black tracking-widest text-[#003078] shadow-md transition-all hover:bg-[#edbb00] active:scale-95 sm:flex"
            >
              <UserOutlined className="text-sm" />
              ĐĂNG NHẬP
            </Link>
          )}

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 text-lg text-white transition-colors hover:bg-white/10 lg:hidden"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <CloseOutlined /> : <MenuOutlined />}
          </button>

        </div>
      </div>
      {mobileOpen && (
        <nav className="mx-4 mt-3 rounded-2xl border border-white/10 bg-[#07366f] p-3 shadow-2xl lg:hidden" aria-label="Điều hướng trên điện thoại">
          <div className="grid gap-1">
            {navigation.map((item) => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`site-mobile-nav-link rounded-xl px-4 py-3 text-sm font-bold ${active ? 'site-mobile-nav-link-active' : 'hover:bg-white/10'}`}>
                  {item.label}
                </Link>
              );
            })}
            {!user && (
              <Link href="/login" onClick={() => setMobileOpen(false)} className="mt-1 rounded-xl bg-white px-4 py-3 text-center text-sm font-black text-[#003078] sm:hidden">
                Đăng nhập
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
