'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { App as AntApp, Button, Card, Form, Input, Spin } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { authApi } from '../../api/authApi';
import { IUser } from '../../interfaces/IUser';
import { saveStoredUser } from '../../utils/authSession';

type ProfileValues = Pick<IUser, 'fullName' | 'phoneNumber' | 'address'>;

export default function CompleteProfilePage() {
  const router = useRouter();
  const { notification } = AntApp.useApp();
  const [form] = Form.useForm<ProfileValues>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.replace('/login');
      return;
    }

    void authApi.getProfile()
      .then((data) => {
        const profile = data as unknown as IUser;
        if (profile.profileCompleted) {
          router.replace('/');
          return;
        }
        form.setFieldsValue({
          fullName: profile.fullName,
          phoneNumber: profile.phoneNumber,
          address: profile.address,
        });
      })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [form, router]);

  const submit = async (values: ProfileValues) => {
    try {
      setSaving(true);
      const response = await authApi.updateProfile(values) as unknown as { message: string; user: IUser };
      const currentUser = JSON.parse(localStorage.getItem('user_info') || '{}');
      saveStoredUser({
        ...currentUser,
        fullName: response.user.fullName,
        profileCompleted: true,
      });
      notification.success({ title: 'Hoàn tất hồ sơ', description: response.message });
      router.replace('/');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50"><Spin size="large" /></div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] px-4 py-24">
      <Card className="w-full max-w-xl rounded-[28px] border-none shadow-xl">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#edbb00] text-2xl text-[#003078]">
            <UserOutlined />
          </div>
          <h1 className="m-0 text-2xl font-black uppercase text-[#003078]">Hoàn thiện thông tin cá nhân</h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">
            Tài khoản Google/Facebook đã được xác thực. Vui lòng bổ sung thông tin để tiếp tục sử dụng hệ thống vé.
          </p>
        </div>

        <Form form={form} layout="vertical" onFinish={submit}>
          <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, message: 'Nhập họ và tên.' }]}>
            <Input className="h-11 rounded-xl" />
          </Form.Item>
          <Form.Item
            name="phoneNumber"
            label="Số điện thoại"
            rules={[
              { required: true, message: 'Nhập số điện thoại.' },
              { pattern: /^[0-9]{10}$/, message: 'Số điện thoại phải gồm đúng 10 chữ số.' },
            ]}
          >
            <Input maxLength={10} className="h-11 rounded-xl" />
          </Form.Item>
          <Form.Item
            name="address"
            label="Địa chỉ"
            rules={[
              { required: true, message: 'Nhập địa chỉ.' },
              { min: 8, message: 'Địa chỉ cần chi tiết hơn.' },
            ]}
          >
            <Input.TextArea rows={4} className="rounded-xl" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving} block className="h-12 rounded-xl bg-[#003078] font-black uppercase">
            Hoàn tất đăng ký
          </Button>
        </Form>
      </Card>
    </div>
  );
}
