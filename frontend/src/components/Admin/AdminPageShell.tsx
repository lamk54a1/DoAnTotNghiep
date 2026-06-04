'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, Space } from 'antd';
import {
  CalendarOutlined,
  DashboardOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import AdminGuard from '../Common/AdminGuard';

const navigation = [
  { href: '/admin/dashboard', label: 'Tổng quan', icon: <DashboardOutlined /> },
  { href: '/admin/matches', label: 'Trận đấu', icon: <CalendarOutlined /> },
  { href: '/admin/orders', label: 'Đơn hàng', icon: <ShoppingOutlined /> },
  { href: '/admin/users', label: 'Người dùng', icon: <TeamOutlined /> },
];

interface AdminPageShellProps {
  title: string;
  subtitle?: string;
  extra?: ReactNode;
  children: ReactNode;
}

export default function AdminPageShell({ title, subtitle, extra, children }: AdminPageShellProps) {
  const pathname = usePathname();

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 px-4 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 rounded-2xl bg-[#003078] p-4 shadow-md">
            <div className="flex flex-wrap gap-2">
              {navigation.map((item) => (
                <Link href={item.href} key={item.href}>
                  <Button
                    icon={item.icon}
                    type={pathname === item.href ? 'primary' : 'text'}
                    className={pathname === item.href ? 'bg-[#edbb00] font-bold text-[#003078]' : 'font-bold text-white'}
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h1 className="m-0 text-2xl font-black uppercase tracking-tight text-[#003078]">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
            </div>
            {extra && <Space>{extra}</Space>}
          </div>

          {children}
        </div>
      </div>
    </AdminGuard>
  );
}
