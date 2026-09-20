'use client';

import { useEffect, useState } from 'react';
import { App as AntApp, Button, Card, Spin, Upload } from 'antd';
import { PictureOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import axios from 'axios';
import AdminPageShell from '../../../components/Admin/AdminPageShell';
import axiosClient, { API_ORIGIN } from '../../../api/axiosClient';

const resolveBanner = (path: string | null) => path
  ? path.startsWith('/uploads/') ? `${API_ORIGIN}${path}` : path
  : '/images/sVinh.jpg';

export default function AdminAppearancePage() {
  const { notification } = AntApp.useApp();
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void axiosClient.get<{ bannerImage: string | null }>('/site/home-banner')
      .then((data) => setBannerImage(data.bannerImage))
      .catch(() => notification.error({ title: 'Không tải được banner trang chủ.' }))
      .finally(() => setLoading(false));
  }, [notification]);

  const uploadProps: UploadProps = {
    accept: 'image/jpeg,image/png,image/webp,image/gif',
    maxCount: 1,
    showUploadList: false,
    disabled: saving,
    beforeUpload: async (file) => {
      setSaving(true);
      try {
        const body = new FormData();
        body.append('image', file);
        const uploaded = await axiosClient.post<{ path: string }>('/uploads/home-banner', body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const saved = await axiosClient.put<{ bannerImage: string | null }>('/site/home-banner', { bannerImage: uploaded.path });
        setBannerImage(saved.bannerImage);
        notification.success({ title: 'Đã thay banner trang chủ.' });
      } catch (error) {
        notification.error({
          title: 'Không thể thay banner',
          description: axios.isAxiosError(error) ? error.response?.data?.message : 'Vui lòng thử ảnh khác.',
        });
      } finally {
        setSaving(false);
      }
      return false;
    },
  };

  const clearBanner = async () => {
    setSaving(true);
    try {
      await axiosClient.put('/site/home-banner', { bannerImage: null });
      setBannerImage(null);
      notification.success({ title: 'Đã dùng lại banner của trận nổi bật.' });
    } catch {
      notification.error({ title: 'Không thể đặt lại banner.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPageShell title="Banner trang chủ" subtitle="Ảnh này ưu tiên hiển thị trên trang chủ, độc lập với ảnh của từng trận đấu.">
      <Card className="max-w-4xl rounded-2xl border-none shadow-md">
        {loading ? <Spin /> : (
          <div className="space-y-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolveBanner(bannerImage)} alt="Xem trước banner trang chủ" className="h-72 w-full rounded-xl bg-[#003078] object-cover" />
            <p className="text-sm text-gray-500">
              {bannerImage ? 'Đang dùng ảnh do admin chọn.' : 'Chưa có ảnh riêng; trang chủ sẽ dùng ảnh trận nổi bật hoặc ảnh mặc định.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />} type="primary" loading={saving}>Tải ảnh banner mới</Button>
              </Upload>
              {bannerImage && <Button icon={<PictureOutlined />} disabled={saving} onClick={clearBanner}>Dùng lại ảnh trận nổi bật</Button>}
            </div>
            <p className="text-xs text-gray-400">JPG, PNG, WEBP hoặc GIF; tối đa 5 MB. Chọn ảnh ngang để hiển thị đẹp trên máy tính và điện thoại.</p>
          </div>
        )}
      </Card>
    </AdminPageShell>
  );
}
