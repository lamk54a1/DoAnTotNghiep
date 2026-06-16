'use client';

import { useState } from 'react';
import { App as AntApp, Button, Card, Upload } from 'antd';
import { CameraOutlined, IdcardOutlined, LockOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { authApi } from '../../api/authApi';
import { IUser } from '../../interfaces/IUser';
import { saveStoredUser } from '../../utils/authSession';
import { extractCccdFromImage } from '../../utils/extractCccdFromImage';

interface CccdVerificationCardProps {
  cccd?: string | null;
  pendingCccd?: string | null;
  cccdStatus?: IUser['cccdStatus'];
  onVerified: (user: IUser) => void;
}

export default function CccdVerificationCard({ cccd, pendingCccd, cccdStatus, onVerified }: CccdVerificationCardProps) {
  const { notification } = AntApp.useApp();
  const [detectedCccd, setDetectedCccd] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleBeforeUpload: UploadProps['beforeUpload'] = async (file) => {
    setProcessing(true);
    setDetectedCccd('');
    setSelectedFileName(file.name);

    try {
      const extractedCccd = await extractCccdFromImage(file);
      setDetectedCccd(extractedCccd);
      notification.success({
        title: 'Đã đọc được CCCD',
        description: `Số CCCD: ${extractedCccd}`,
      });
    } catch (error) {
      notification.error({
        title: 'Không đọc được CCCD',
        description: error instanceof Error ? error.message : 'Vui lòng thử ảnh rõ hơn.',
      });
    } finally {
      setProcessing(false);
    }

    return false;
  };

  const handleSaveIdentity = async () => {
    if (!detectedCccd) return;

    try {
      setSaving(true);
      const res = await authApi.updateIdentity(detectedCccd) as unknown as { message: string; user: IUser };
      onVerified(res.user);

      const currentUserInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
      saveStoredUser({
        ...currentUserInfo,
        cccd: res.user.cccd,
        cccdStatus: res.user.cccdStatus,
      });

      notification.success({
        title: 'Đã gửi yêu cầu',
        description: res.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (cccd) {
    return (
      <Card className="rounded-[28px] border-none shadow-md">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-xl text-green-600">
            <LockOutlined />
          </div>
          <div>
            <p className="m-0 text-xs font-black uppercase tracking-widest text-gray-400">CCCD đã xác minh</p>
            <p className="mb-2 mt-1 text-xl font-black tracking-wider text-[#003078]">{cccd}</p>
            <p className="m-0 text-xs leading-5 text-gray-500">
              Tài khoản chỉ được cập nhật CCCD một lần để tránh một người tạo nhiều tài khoản mua vé.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (cccdStatus === 'PENDING') {
    return (
      <Card className="rounded-[28px] border-none shadow-md">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-50 text-xl text-yellow-600">
            <IdcardOutlined />
          </div>
          <div>
            <p className="m-0 text-xs font-black uppercase tracking-widest text-gray-400">Đang chờ admin duyệt</p>
            <p className="mb-2 mt-1 text-xl font-black tracking-wider text-[#003078]">{pendingCccd}</p>
            <p className="m-0 text-xs leading-5 text-gray-500">
              Bạn đã gửi CCCD. Tài khoản sẽ được phép mua vé sau khi admin xác nhận.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-[28px] border-none shadow-md">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#003078] text-xl text-[#edbb00]">
          <IdcardOutlined />
        </div>
        <div>
          <p className="m-0 text-xs font-black uppercase tracking-widest text-gray-400">Xác minh CCCD</p>
          <h3 className="mb-2 mt-1 text-xl font-black uppercase text-[#003078]">Upload mặt trước CCCD</h3>
          <p className="m-0 text-sm leading-6 text-gray-500">
            Hệ thống sẽ tự đọc số CCCD từ mã QR trên ảnh. Sau khi lưu, bạn không thể đổi CCCD nữa.
          </p>
        </div>
      </div>

      <Upload
        accept="image/*"
        maxCount={1}
        showUploadList={false}
        beforeUpload={handleBeforeUpload}
        disabled={processing || saving}
      >
        <Button icon={<UploadOutlined />} loading={processing} className="h-11 rounded-xl font-bold">
          Chọn ảnh mặt trước CCCD
        </Button>
      </Upload>

      {selectedFileName && (
        <div className="mt-4 rounded-2xl bg-gray-50 p-4">
          <p className="m-0 flex items-center gap-2 text-xs font-bold text-gray-400">
            <CameraOutlined /> {selectedFileName}
          </p>
          <p className="mb-0 mt-2 text-lg font-black tracking-wider text-[#003078]">
            {detectedCccd || 'Đang chờ đọc số CCCD...'}
          </p>
        </div>
      )}

      <Button
        type="primary"
        disabled={!detectedCccd}
        loading={saving}
        onClick={handleSaveIdentity}
        className="mt-4 h-11 rounded-xl bg-[#003078] px-8 font-black uppercase"
      >
        Lưu CCCD
      </Button>
    </Card>
  );
}
