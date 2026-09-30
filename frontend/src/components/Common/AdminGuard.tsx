'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { Spin } from 'antd';
import { authApi } from '../../api/authApi';
import { clearAuthSession, saveStoredUser } from '../../utils/authSession';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAllowed, setIsAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    authApi.getProfile()
      .then((user) => {
        if (!active) return;
        saveStoredUser(user);
        if (user.role === 'ADMIN' || (user.role === 'SCANNER' && pathname === '/admin/scanner')) {
          setIsAllowed(true);
        }
        else router.replace('/');
      })
      .catch(() => {
        if (!active) return;
        clearAuthSession();
        router.replace('/login');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Spin size="large" description="Đang kiểm tra quyền truy cập..." />
      </div>
    );
  }

  return isAllowed ? <>{children}</> : null;
}
