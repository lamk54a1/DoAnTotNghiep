'use client';
import { Form, Input, Button, Card, notification } from 'antd'; // Giữ nguyên import để Antd quản lý chung
import { authApi } from '../../api/authApi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ILoginPayload, IAuthResponse } from '../../interfaces/IUser';
import { useEffect } from 'react';
import { saveAuthSession } from '../../utils/authSession';

export default function LoginPage() {
  const router = useRouter();
  // 1. Khai báo API notification bằng Hook để tiêu thụ được Context
  const [api, contextHolder] = notification.useNotification();

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get('oauth_error');
    if (error) api.error({ message: 'Đăng nhập thất bại', description: error });
  }, [api]);

  const onFinish = async (values: ILoginPayload) => {
    try {
      const res = await authApi.login(values) as unknown as IAuthResponse;
      
      saveAuthSession(res.access_token, res.user);

      queueMicrotask(() => {
        api.success({
          message: 'Thành công',
          description: res.message,
        });
      });

      if (res.user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (!res.user.profileCompleted) {
        router.push('/complete-profile');
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-montserrat">
      {/* 3. Đặt contextHolder vào đầu cây component để nó render nội dung thông báo */}
      {contextHolder}

      <Card 
        title={
          <div className="text-center font-black text-[#003078] text-base uppercase tracking-tight py-2">
            Đăng nhập hệ thống vé SLNA
          </div>
        } 
        className="w-[400px] shadow-xl border-t-4 border-[#003078] rounded-xl"
      >
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item 
            label={<span className="font-bold text-xs uppercase text-gray-600">Email</span>} 
            name="email" 
            rules={[{ required: true, type: 'email', message: 'Vui lòng nhập đúng định dạng Email!' }]}
          >
            <Input placeholder="Nhập email của bạn" className="h-10 rounded-lg" />
          </Form.Item>

          <Form.Item 
            label={<span className="font-bold text-xs uppercase text-gray-600">Mật khẩu</span>} 
            name="password" 
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password placeholder="Nhập mật khẩu" className="h-10 rounded-lg" />
          </Form.Item>

          <Form.Item className="mb-2">
            <Button 
              type="primary" 
              htmlType="submit" 
              className="w-full h-10 bg-[#003078] hover:bg-[#edbb00] font-bold rounded-lg transition-all"
            >
              ĐĂNG NHẬP
            </Button>
          </Form.Item>

          <div className="text-center mt-4 text-xs font-medium text-gray-500">
            Chưa có tài khoản?{' '}
            <Link 
              href="/register" 
              className="text-[#003078] hover:text-[#edbb00] font-bold underline underline-offset-2 transition-colors"
            >
              Đăng ký ngay
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}
