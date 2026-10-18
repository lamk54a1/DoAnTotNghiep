'use client';
import { Form, Input, Button, Card, Divider, notification } from 'antd';
import { LockOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { authApi } from '../../api/authApi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ILoginPayload, IAuthResponse } from '../../interfaces/IUser';
import { useEffect, useState } from 'react';
import { saveAuthSession } from '../../utils/authSession';
import SocialOAuthButtons from '../../components/Auth/SocialOAuthButtons';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  // 1. Khai báo API notification bằng Hook để tiêu thụ được Context
  const [api, contextHolder] = notification.useNotification();
  const [oauthProviders, setOauthProviders] = useState({ google: false, facebook: false });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void authApi.getOAuthProviders().then(setOauthProviders).catch(() => {});
  }, []);

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get('oauth_error');
    if (error) api.error({ message: 'Đăng nhập thất bại', description: error });
  }, [api]);

  const onFinish = async (values: ILoginPayload) => {
    setSubmitting(true);
    try {
      const res: IAuthResponse = await authApi.login(values);
      
      saveAuthSession(res.user);

      queueMicrotask(() => {
        api.success({
          message: 'Thành công',
          description: res.message,
        });
      });

      if (res.user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (res.user.role === 'SCANNER') {
        router.push('/admin/scanner');
      } else if (!res.user.profileCompleted) {
        router.push('/complete-profile');
      } else {
        router.push('/');
      }
    } catch (error: unknown) {
      const description = typeof error === 'object' && error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      api.error({ message: 'Đăng nhập thất bại', description: description || 'Vui lòng kiểm tra lại thông tin.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#eef3f9] px-4 py-16 font-montserrat">
      {contextHolder}
      <div className="absolute inset-x-0 top-0 h-64 bg-[#003078]" />
      <div className="absolute -left-20 top-28 h-64 w-64 rounded-full bg-[#edbb00]/15 blur-3xl" />
      <Card className="relative w-full max-w-[430px] overflow-hidden rounded-3xl border-0 shadow-2xl shadow-blue-950/15">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#003078] p-2 shadow-lg">
            <Image src="/images/logo-transparent.png" alt="SLNA" width={58} height={68} className="h-full w-auto object-contain" priority />
          </div>
          <p className="m-0 text-xs font-black uppercase tracking-[0.3em] text-[#edbb00]">SLNA Ticketing</p>
          <h1 className="mt-2 text-2xl font-black uppercase text-[#003078]">Chào mừng trở lại</h1>
          <p className="mt-2 text-sm text-gray-500">Đăng nhập để mua vé và quản lý vé điện tử.</p>
        </div>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item 
            label={<span className="font-bold text-xs uppercase text-gray-600">Email</span>} 
            name="email" 
            rules={[{ required: true, type: 'email', message: 'Vui lòng nhập đúng định dạng Email!' }]}
          >
            <Input prefix={<MailOutlined className="text-gray-400" />} placeholder="Nhập email của bạn" autoComplete="email" className="h-11 rounded-xl" />
          </Form.Item>

          <Form.Item 
            label={<span className="font-bold text-xs uppercase text-gray-600">Mật khẩu</span>} 
            name="password" 
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="Nhập mật khẩu" autoComplete="current-password" className="h-11 rounded-xl" />
          </Form.Item>

          <Form.Item className="mb-2">
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={submitting}
              className="login-primary-button h-11 w-full rounded-xl bg-[#003078] font-bold transition-all hover:!bg-[#104f97]"
            >
              {submitting ? 'ĐANG ĐĂNG NHẬP' : 'ĐĂNG NHẬP'}
            </Button>
          </Form.Item>

          <div className="mb-5 text-right text-sm">
            <Link href="/forgot-password" className="font-bold text-[#003078] hover:underline">Quên mật khẩu?</Link>
          </div>

          <Divider plain>Hoặc đăng nhập với</Divider>
          <SocialOAuthButtons mode="login" providers={oauthProviders} />

          <div className="text-center mt-4 text-xs font-medium text-gray-500">
            Chưa có tài khoản?{' '}
            <Link 
              href="/register" 
              className="text-[#003078] hover:text-[#edbb00] font-bold underline underline-offset-2 transition-colors"
            >
              Đăng ký ngay
            </Link>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-[11px] font-semibold text-green-700">
            <SafetyCertificateOutlined /> Kết nối được bảo vệ và không lưu mật khẩu trên trình duyệt
          </div>
        </Form>
      </Card>
    </main>
  );
}
