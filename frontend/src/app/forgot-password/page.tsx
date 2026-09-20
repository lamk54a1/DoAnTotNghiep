'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { App as AntApp, Button, Card, Form, Input, Spin } from 'antd';
import { authApi } from '../../api/authApi';

export default function ForgotPasswordPage() {
  const { notification } = AntApp.useApp();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    void authApi.getPasswordResetStatus()
      .then((result) => setAvailable(result.available))
      .catch(() => setAvailable(false));
  }, []);

  const submit = async ({ email }: { email: string }) => {
    setSending(true);
    try {
      await authApi.requestPasswordReset(email);
      setSent(true);
    } catch {
      notification.error({ title: 'Không thể gửi yêu cầu', description: 'Vui lòng thử lại sau hoặc liên hệ quản trị viên.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-20">
      <Card className="w-full max-w-md rounded-2xl border-t-4 border-[#003078] shadow-xl">
        <h1 className="text-center text-2xl font-black text-[#003078]">Quên mật khẩu</h1>
        {available === null ? <div className="py-8 text-center"><Spin /></div> : !available ? (
          <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            Tính năng gửi email đặt lại mật khẩu chưa được quản trị viên cấu hình. Vui lòng liên hệ quản trị viên để được hỗ trợ.
          </p>
        ) : sent ? (
          <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800">
            Nếu email thuộc tài khoản hợp lệ, bạn sẽ nhận được liên kết đặt lại mật khẩu. Hãy kiểm tra cả thư mục spam.
          </p>
        ) : (
          <Form layout="vertical" onFinish={submit} className="mt-5">
            <Form.Item name="email" label="Email tài khoản" rules={[{ required: true, type: 'email', message: 'Vui lòng nhập email hợp lệ.' }]}>
              <Input type="email" autoComplete="email" placeholder="email@example.com" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={sending} className="bg-[#003078]">Gửi liên kết đặt lại</Button>
          </Form>
        )}
        <div className="mt-5 text-center"><Link href="/login" className="font-bold text-[#003078]">Quay lại đăng nhập</Link></div>
      </Card>
    </div>
  );
}
