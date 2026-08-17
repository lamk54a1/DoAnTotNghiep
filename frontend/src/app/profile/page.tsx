'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { App as AntApp, Button, Card, Form, Input, Modal, Result, Spin, Tag } from 'antd';
import { IdcardOutlined, LockOutlined, MailOutlined, SaveOutlined, UserOutlined } from '@ant-design/icons';
import { authApi } from '../../api/authApi';
import { IUser } from '../../interfaces/IUser';
import CccdVerificationCard from '../../components/Profile/CccdVerificationCard';
import { saveStoredUser } from '../../utils/authSession';

type ProfileFormValues = Pick<IUser, 'fullName' | 'phoneNumber' | 'address'>;

export default function ProfilePage() {
  const router = useRouter();
  const { notification } = AntApp.useApp();
  const [profile, setProfile] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [emailForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    queueMicrotask(() => {
      const storedUser = localStorage.getItem('user_info');
      if (!storedUser) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }

      authApi.getProfile()
        .then((data) => {
          const user = data;
          setProfile(user);
        })
        .catch(() => setUnauthorized(true))
        .finally(() => setLoading(false));
    });
  }, []);

  const handleSave = async (values: ProfileFormValues) => {
    try {
      setSaving(true);
      const res = await authApi.updateProfile(values);
      setProfile(res.user);

      saveStoredUser({
        id: res.user.id,
        email: res.user.email,
        fullName: res.user.fullName,
        role: res.user.role,
      });

      notification.success({
        title: 'Đã lưu thông tin',
        description: res.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangeEmail = async (values: { email: string; currentPassword: string }) => {
    try {
      setChangingEmail(true);
      const res = await authApi.changeEmail(values);
      setProfile((current) => current ? { ...current, email: res.email } : current);
      const storedUser = JSON.parse(localStorage.getItem('user_info') || '{}');
      saveStoredUser({ ...storedUser, email: res.email });
      notification.success({ title: 'Đã đổi email', description: res.message });
      emailForm.resetFields();
      setEmailModalOpen(false);
    } finally {
      setChangingEmail(false);
    }
  };

  const handleChangePassword = async (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    try {
      setChangingPassword(true);
      const res = await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      notification.success({ title: 'Đã đổi mật khẩu', description: res.message });
      passwordForm.resetFields();
      setPasswordModalOpen(false);
    } finally {
      setChangingPassword(false);
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

  const isLocalAccount = profile?.authProvider === 'LOCAL';
  const providerLabel = profile?.authProvider === 'GOOGLE' ? 'Google' : 'Facebook';

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

            <Card title={<span className="font-black text-[#003078]"><LockOutlined /> Bảo mật tài khoản</span>} className="rounded-[28px] border-none shadow-md">
              {isLocalAccount ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-gray-100 p-5">
                    <p className="m-0 font-black text-[#003078]"><MailOutlined /> Email đăng nhập</p>
                    <p className="mb-5 mt-2 break-all text-sm text-gray-500">{profile?.email}</p>
                    <Button onClick={() => setEmailModalOpen(true)} className="h-10 rounded-xl font-bold">Thay đổi email</Button>
                  </div>
                  <div className="rounded-2xl border border-gray-100 p-5">
                    <p className="m-0 font-black text-[#003078]"><LockOutlined /> Mật khẩu</p>
                    <p className="mb-5 mt-2 text-sm text-gray-500">Mật khẩu luôn được mã hóa và không hiển thị trên trang hồ sơ.</p>
                    <Button onClick={() => setPasswordModalOpen(true)} className="h-10 rounded-xl font-bold">Đổi mật khẩu</Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-blue-50 p-5 text-sm leading-6 text-[#003078]">
                  Tài khoản này đăng nhập bằng <strong>{providerLabel}</strong>. Email và mật khẩu được quản lý bởi {providerLabel}, hệ thống không lưu hoặc hiển thị mật khẩu của bạn.
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      <Modal
        title="Thay đổi email đăng nhập"
        open={emailModalOpen}
        onCancel={() => { emailForm.resetFields(); setEmailModalOpen(false); }}
        onOk={() => emailForm.submit()}
        okText="Xác nhận đổi email"
        cancelText="Hủy"
        confirmLoading={changingEmail}
        destroyOnHidden
      >
        <p className="text-sm leading-6 text-gray-500">Vì đây là thay đổi nhạy cảm, hãy nhập mật khẩu hiện tại để xác nhận đúng chủ tài khoản.</p>
        <Form form={emailForm} layout="vertical" onFinish={handleChangeEmail} autoComplete="off">
          <Form.Item name="email" label="Email mới" rules={[{ required: true, type: 'email', message: 'Nhập email hợp lệ.' }]}>
            <Input autoComplete="email" className="h-11 rounded-xl" />
          </Form.Item>
          <Form.Item name="currentPassword" label="Xác nhận bằng mật khẩu hiện tại" rules={[{ required: true, message: 'Nhập mật khẩu hiện tại.' }]}>
            <Input.Password autoComplete="off" visibilityToggle={false} className="h-11 rounded-xl" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Đổi mật khẩu"
        open={passwordModalOpen}
        onCancel={() => { passwordForm.resetFields(); setPasswordModalOpen(false); }}
        onOk={() => passwordForm.submit()}
        okText="Lưu mật khẩu mới"
        cancelText="Hủy"
        confirmLoading={changingPassword}
        destroyOnHidden
      >
        <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item name="currentPassword" label="Mật khẩu hiện tại" rules={[{ required: true, message: 'Nhập mật khẩu hiện tại.' }]}>
            <Input.Password autoComplete="current-password" visibilityToggle={false} className="h-11 rounded-xl" />
          </Form.Item>
          <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, message: 'Nhập mật khẩu mới.' }, { min: 8, message: 'Tối thiểu 8 ký tự.' }]}>
            <Input.Password autoComplete="new-password" visibilityToggle={false} className="h-11 rounded-xl" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Nhập lại mật khẩu"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Nhập lại mật khẩu mới.' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  return !value || getFieldValue('newPassword') === value
                    ? Promise.resolve()
                    : Promise.reject(new Error('Mật khẩu nhập lại không khớp.'));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" visibilityToggle={false} className="h-11 rounded-xl" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
