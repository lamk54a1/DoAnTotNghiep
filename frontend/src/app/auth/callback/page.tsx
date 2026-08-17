'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Result, Spin } from 'antd';
import { saveAuthSession } from '../../../utils/authSession';

export default function OAuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const encodedUser = params.get('user');
      if (!encodedUser) throw new Error();
      const base64 = encodedUser.replace(/-/g, '+').replace(/_/g, '/');
      const user = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
      saveAuthSession(user);
      window.history.replaceState({}, '', '/auth/callback');
      router.replace(user.role === 'ADMIN'
        ? '/admin/dashboard'
        : user.profileCompleted
          ? '/'
          : '/complete-profile');
    } catch {
      router.replace('/login?oauth_error=Không thể hoàn tất đăng nhập mạng xã hội.');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Result icon={<Spin size="large" />} title="Đang hoàn tất đăng nhập..." />
    </div>
  );
}
