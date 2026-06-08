'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { App as AntApp, Button, Card, Form, Input, Result, Spin, Tag } from 'antd';
import { IdcardOutlined, SaveOutlined, UserOutlined } from '@ant-design/icons';
import { authApi } from '../../api/authApi';
import { IUser } from '../../interfaces/IUser';
import CccdVerificationCard from '../../components/Profile/CccdVerificationCard';

type ProfileFormValues = Pick<IUser, 'fullName' | 'phoneNumber' | 'address'>;

export default function ProfilePage() {
  const router = useRouter();
  const { notification } = AntApp.useApp();
  const [profile, setProfile] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }

      authApi.getProfile()
        .then((data) => {
          const user = data as unknown as IUser;
          setProfile(user);
        })
        .catch(() => setUnauthorized(true))
        .finally(() => setLoading(false));
    });
  }, []);

  const handleSave = async (values: ProfileFormValues) => {
    try {
      setSaving(true);
      const res = await authApi.updateProfile(values) as unknown as { message: string; user: IUser };
      setProfile(res.user);

      localStorage.setItem('user_info', JSON.stringify({
        id: res.user.id,
        email: res.user.email,
        fullName: res.user.fullName,
        role: res.user.role,
      }));

      notification.success({
        title: 'Đã lưu thông tin',
        description: res.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50"><Spin size="large" /></div>;
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24">
        <Result
          status="403"
          title="Bạn cần đăng nhập"
          subTitle="Vui lòng đăng nhập để xem và chỉnh sửa thông tin cá nhân."
          extra={<Button type="primary" onClick={() => router.push('/login')}>Đăng nhập</Button>}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 pb-16 pt-28 font-montserrat">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-[32px] bg-[#003078] p-8 text-white shadow-xl shadow-blue-900/10">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-[#edbb00]">Tài khoản SLNA</p>
          <h1 className="m-0 text-3xl font-black italic uppercase tracking-tight">Thông tin cá nhân</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
            Cập nhật thông tin liên hệ để hệ thống đối soát vé và hỗ trợ bạn nhanh hơn khi cần.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="rounded-[28px] border-none shadow-md lg:col-span-1">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#edbb00] text-3xl text-[#003078]">
                <UserOutlined />
              </div>
              <h2 className="m-0 text-xl font-black text-[#003078]">{profile?.fullName}</h2>
              <p className="mt-2 text-sm font-bold text-gray-400">{profile?.email}</p>
              <Tag color={profile?.status === 'ACTIVE' ? 'green' : 'red'} className="mt-2 font-bold">
                {profile?.status}
              </Tag>
            </div>

            <div className="mt-8 rounded-2xl bg-gray-50 p-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-gray-500">
                <IdcardOutlined /> CCCD
              </p>
              <p className="m-0 text-lg font-black tracking-wider text-[#003078]">{profile?.cccd || 'Chưa xác minh'}</p>
              <p className="mt-2 text-xs leading-5 text-gray-400">
                CCCD được khóa sau khi xác minh để đảm bảo mỗi người chỉ có một tài khoản mua vé.
              </p>
            </div>
          </Card>

          <div className="space-y-6 lg:col-span-2">
            <CccdVerificationCard
              cccd={profile?.cccd}
              pendingCccd={profile?.pendingCccd}
              cccdStatus={profile?.cccdStatus}
              onVerified={setProfile}
            />

            <Card className="rounded-[28px] border-none shadow-md">
              <Form
                key={profile?.id}
                layout="vertical"
                onFinish={handleSave}
                initialValues={{
                  fullName: profile?.fullName,
                  phoneNumber: profile?.phoneNumber,
                  address: profile?.address,
                }}
              >
                <Form.Item
                  label={<span className="font-bold text-xs uppercase text-gray-600">Họ và tên</span>}
                  name="fullName"
                  rules={[{ required: true, message: 'Vui lòng nhập họ và tên!' }]}
                >
                  <Input className="h-11 rounded-xl" placeholder="Họ và tên" />
                </Form.Item>

                <Form.Item
                  label={<span className="font-bold text-xs uppercase text-gray-600">Số điện thoại</span>}
                  name="phoneNumber"
                  rules={[
                    { required: true, message: 'Vui lòng nhập số điện thoại!' },
                    { pattern: /^[0-9]{10}$/, message: 'Số điện thoại phải gồm đúng 10 chữ số!' },
                  ]}
                >
                  <Input maxLength={10} className="h-11 rounded-xl" placeholder="0912345678" />
                </Form.Item>

                <Form.Item
                  label={<span className="font-bold text-xs uppercase text-gray-600">Địa chỉ</span>}
                  name="address"
                  rules={[
                    { required: true, message: 'Vui lòng nhập địa chỉ!' },
                    { min: 8, message: 'Địa chỉ cần chi tiết hơn một chút!' },
                  ]}
                >
                  <Input.TextArea rows={4} className="rounded-xl" placeholder="Số nhà, phường/xã, quận/huyện, tỉnh/thành phố" />
                </Form.Item>

                <div className="flex justify-end">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={saving}
                    icon={<SaveOutlined />}
                    className="h-11 rounded-xl bg-[#003078] px-8 font-black uppercase"
                  >
                    Lưu thay đổi
                  </Button>
                </div>
              </Form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
