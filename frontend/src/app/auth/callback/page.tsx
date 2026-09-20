'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Result, Spin } from 'antd';
import { saveAuthSession } from '../../../utils/authSession';
import { authApi } from '../../../api/authApi';

export default function OAuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    void authApi.getProfile()
      .then((user) => {
        saveAuthSession(user);
        router.replace(user.role === 'ADMIN'
          ? '/admin/dashboard'
          : user.profileCompleted
            ? '/'
            : '/complete-profile');
      })
      .catch(() => router.replace('/login?oauth_error=Không thể hoàn tất đăng nhập mạng xã hội.'));
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Result icon={<Spin size="large" />} title="Đang hoàn tất đăng nhập..." />
    </div>
  );
}
