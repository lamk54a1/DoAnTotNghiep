'use client';

import { useEffect, useState } from 'react';
import { App as AntApp, Avatar, Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Upload } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import axios from 'axios';
import AdminPageShell from '../../../components/Admin/AdminPageShell';
import axiosClient, { API_ORIGIN } from '../../../api/axiosClient';
import { ISponsor, SponsorLevel } from '../../../interfaces/ISponsor';

const levelOptions = [
  { value: 'DIAMOND', label: 'Nhà tài trợ kim cương' },
  { value: 'GOLD', label: 'Nhà tài trợ vàng' },
  { value: 'SILVER', label: 'Nhà tài trợ bạc' },
  { value: 'PARTNER', label: 'Đối tác đồng hành' },
];

type SponsorForm = Omit<ISponsor, 'id'>;

export default function AdminSponsorsPage() {
  const { notification } = AntApp.useApp();
  const [form] = Form.useForm<SponsorForm>();
  const [sponsors, setSponsors] = useState<ISponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ISponsor | null>(null);
  const [open, setOpen] = useState(false);

  const fetchSponsors = async () => {
    try {
      const data = await axiosClient.get<ISponsor[]>('/sponsors/admin');
      setSponsors(data as unknown as ISponsor[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchSponsors);
  }, []);

  const openForm = (sponsor?: ISponsor) => {
    setEditing(sponsor || null);
    form.setFieldsValue(sponsor || {
      name: '',
      level: 'PARTNER',
      logoUrl: '',
      websiteUrl: '',
      sortOrder: 0,
      isActive: true,
    });
    setOpen(true);
  };

  const uploadProps: UploadProps = {
    accept: 'image/*',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: async (file) => {
      try {
        const data = new FormData();
        data.append('image', file);
        const response = await axiosClient.post('/uploads/sponsor-logo', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }) as unknown as { path: string };
        form.setFieldValue('logoUrl', response.path);
        notification.success({ title: 'Đã upload logo' });
      } catch (error) {
        notification.error({
          title: 'Upload thất bại',
          description: axios.isAxiosError(error) ? error.response?.data?.message : 'Vui lòng thử lại.',
        });
      }
      return false;
    },
  };

  const saveSponsor = async (values: SponsorForm) => {
    try {
      setSaving(true);
      if (editing) {
        await axiosClient.put(`/sponsors/${editing.id}`, values);
      } else {
        await axiosClient.post('/sponsors', values);
      }
      notification.success({ title: editing ? 'Đã cập nhật nhà tài trợ' : 'Đã thêm nhà tài trợ' });
      setOpen(false);
      setLoading(true);
      await fetchSponsors();
    } finally {
      setSaving(false);
    }
  };

  const deleteSponsor = async (id: number) => {
    await axiosClient.delete(`/sponsors/${id}`);
    notification.success({ title: 'Đã xóa nhà tài trợ' });
    setLoading(true);
    await fetchSponsors();
  };

  return (
    <AdminPageShell
      title="Quản lý nhà tài trợ"
      subtitle="Upload logo, phân hạng và gắn website khi người dùng bấm vào logo."
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>Thêm nhà tài trợ</Button>}
    >
      <Table
        rowKey="id"
        loading={loading}
        dataSource={sponsors}
        columns={[
          {
            title: 'Logo',
            dataIndex: 'logoUrl',
            width: 130,
            render: (url: string, record: ISponsor) => (
              <Avatar shape="square" size={90} src={url.startsWith('http') ? url : `${API_ORIGIN}${url}`}>
                {record.name.charAt(0)}
              </Avatar>
            ),
          },
          { title: 'Tên', dataIndex: 'name', render: (value: string) => <b>{value}</b> },
          {
            title: 'Hạng',
            dataIndex: 'level',
            render: (value: SponsorLevel) => <Tag color={value === 'DIAMOND' ? 'blue' : value === 'GOLD' ? 'gold' : 'default'}>{value}</Tag>,
          },
          {
            title: 'Website',
            dataIndex: 'websiteUrl',
            render: (value?: string) => value ? <a href={value} target="_blank" rel="noreferrer">{value}</a> : 'Chưa có',
          },
          { title: 'Thứ tự', dataIndex: 'sortOrder', width: 90 },
          {
            title: 'Hiển thị',
            dataIndex: 'isActive',
            width: 90,
            render: (value: boolean) => <Tag color={value ? 'green' : 'red'}>{value ? 'Có' : 'Ẩn'}</Tag>,
          },
          {
            title: 'Thao tác',
            width: 180,
            render: (_: unknown, record: ISponsor) => (
              <Space>
                <Button icon={<EditOutlined />} onClick={() => openForm(record)}>Sửa</Button>
                <Popconfirm title="Xóa nhà tài trợ này?" onConfirm={() => deleteSponsor(record.id)}>
                  <Button danger icon={<DeleteOutlined />}>Xóa</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
        className="overflow-hidden rounded-xl bg-white shadow-md"
      />

      <Modal title={editing ? 'Cập nhật nhà tài trợ' : 'Thêm nhà tài trợ'} open={open} onCancel={() => setOpen(false)} footer={null} destroyOnHidden forceRender>
        <Form form={form} layout="vertical" onFinish={saveSponsor} className="mt-4">
          <Form.Item name="name" label="Tên nhà tài trợ" rules={[{ required: true, message: 'Nhập tên nhà tài trợ.' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="level" label="Hạng tài trợ" rules={[{ required: true }]}>
            <Select options={levelOptions} />
          </Form.Item>
          <Form.Item name="logoUrl" label="Logo" rules={[{ required: true, message: 'Upload logo nhà tài trợ.' }]}>
            <Space.Compact className="w-full">
              <Input placeholder="URL logo hoặc upload từ máy" />
              <Upload {...uploadProps}><Button icon={<UploadOutlined />}>Upload</Button></Upload>
            </Space.Compact>
          </Form.Item>
          <Form.Item name="websiteUrl" label="Website nhà tài trợ" rules={[{ type: 'url', message: 'Nhập URL đầy đủ, gồm https://.' }]}>
            <Input placeholder="https://nhataitro.vn" />
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự hiển thị">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="isActive" label="Hiển thị trên trang chủ" valuePropName="checked">
            <Switch />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={saving}>Lưu</Button>
          </div>
        </Form>
      </Modal>
    </AdminPageShell>
  );
}
