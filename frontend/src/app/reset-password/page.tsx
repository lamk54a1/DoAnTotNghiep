'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { App as AntApp, Button, Card, Form, Input } from 'antd';
import { authApi } from '../../api/authApi';

interface ResetValues {
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const { notification } = AntApp.useApp();
  const [token, setToken] = useState<string | null>(null);
  const [checkingLink, setCheckingLink] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('token');
    if (value) window.history.replaceState(null, '', '/reset-password');
    queueMicrotask(() => {
      setToken(value);
      setCheckingLink(false);
    });
  }, []);

  const submit = async ({ password }: ResetValues) => {
    if (!token) return;
    setSaving(true);
    try {
      await authApi.resetPassword(token, password);
      setCompleted(true);
      setToken(null);
      notification.success({ title: 'Đã đặt lại mật khẩu.' });
    } catch {
      notification.error({ title: 'Không thể đặt lại mật khẩu', description: 'Liên kết có thể đã hết hạn hoặc được sử dụng. Hãy yêu cầu liên kết mới.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-20">
      <Card className="w-full max-w-md rounded-2xl border-t-4 border-[#003078] shadow-xl">
        <h1 className="text-center text-2xl font-black text-[#003078]">Đặt lại mật khẩu</h1>
        {checkingLink ? (
          <p className="mt-5 text-center text-sm text-gray-600">Đang kiểm tra liên kết...</p>
        ) : completed ? (
          <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800">Mật khẩu đã được cập nhật. Bạn có thể đăng nhập lại.</p>
        ) : token ? (
          <Form layout="vertical" onFinish={submit} className="mt-5">
            <Form.Item name="password" label="Mật khẩu mới" rules={[{ required: true, min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự.' }, { pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/, message: 'Mật khẩu phải có chữ và số.' }]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item name="confirmPassword" label="Nhập lại mật khẩu" dependencies={['password']} rules={[{ required: true, message: 'Vui lòng nhập lại mật khẩu.' }, ({ getFieldValue }) => ({ validator: (_, value) => value === getFieldValue('password') ? Promise.resolve() : Promise.reject(new Error('Mật khẩu nhập lại không khớp.')) })]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={saving} className="bg-[#003078]">Lưu mật khẩu mới</Button>
          </Form>
        ) : (
          <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Liên kết không hợp lệ. Vui lòng yêu cầu liên kết mới.</p>
        )}
        <div className="mt-5 text-center"><Link href={completed ? '/login' : '/forgot-password'} className="font-bold text-[#003078]">{completed ? 'Đến trang đăng nhập' : 'Yêu cầu liên kết mới'}</Link></div>
      </Card>
    </div>
  );
}
