'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userInfo = localStorage.getItem('user_info');
    if (!userInfo) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userInfo);
    if (user.role === 'ADMIN') {
      setIsAdmin(true);
    } else {
      router.push('/'); // Không phải Admin thì đá về trang chủ công cộng
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Spin size="large" tip="Đang kiểm tra quyền quản trị..." />
      </div>
    );
  }

  return isAdmin ? <>{children}</> : null;
}