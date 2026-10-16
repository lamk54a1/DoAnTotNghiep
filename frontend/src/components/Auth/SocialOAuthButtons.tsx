'use client';

import { Button } from 'antd';
import { FacebookFilled, GoogleOutlined } from '@ant-design/icons';

interface SocialOAuthButtonsProps {
  mode: 'login' | 'register';
  providers: { google: boolean; facebook: boolean };
}

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api').replace(/\/$/, '');

export default function SocialOAuthButtons({ mode, providers }: SocialOAuthButtonsProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          icon={<GoogleOutlined className="text-[#4285f4]" />}
          disabled={!providers.google}
          href={`${apiBaseUrl}/auth/oauth/google?mode=${mode}`}
          className="h-10 font-semibold"
        >
          Google
        </Button>
        <Button
          icon={<FacebookFilled className="text-[#1877f2]" />}
          disabled={!providers.facebook}
          href={`${apiBaseUrl}/auth/oauth/facebook?mode=${mode}`}
          className="h-10 font-semibold"
        >
          Facebook
        </Button>
      </div>
      {!providers.google && !providers.facebook && (
        <p className="mt-2 text-center text-xs text-gray-500">Đăng nhập mạng xã hội chưa được kích hoạt.</p>
      )}
    </>
  );
}
