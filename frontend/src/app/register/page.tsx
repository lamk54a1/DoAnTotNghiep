'use client';
import { Form, Input, Button, Card, App as AntApp } from 'antd';
import { authApi } from '../../api/authApi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { IRegisterPayload } from '../../interfaces/IUser';

function RegisterPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const { notification } = AntApp.useApp();

  // Khử sạch kiểu any bằng cách ép kiểu IRegisterPayload kết hợp thuộc tính confirmPassword phụ trợ
  const onFinish = async (values: IRegisterPayload & { confirmPassword?: string }) => {
    try {
      // Loại bỏ trường confirmPassword trước khi gửi lên API Backend
      const { confirmPassword, ...payload } = values;
      void confirmPassword;
      
      // Gọi API đăng ký từ authApi 
      const res = await authApi.register(payload) as unknown as { message: string };
      
      notification.success({
        title: 'Đăng ký thành công',
        description: res.message || 'Tài khoản của bạn đã được tạo, hãy đăng nhập ngay!',
      });

      // Đăng ký xong thì chuyển hướng ngay về trang đăng nhập
      router.push('/login');
    } catch (error) {
      // Lỗi đã được xử lý tự động qua Interceptor của axiosClient
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-montserrat py-12 px-4">
      <Card 
        title={
          <div className="text-center font-black text-[#003078] text-base uppercase tracking-tight py-2">
            Đăng ký tài khoản vé SLNA
          </div>
        } 
        className="w-[450px] shadow-xl border-t-4 border-[#edbb00] rounded-xl"
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          
          <Form.Item 
            label={<span className="font-bold text-xs uppercase text-gray-600">Họ và tên</span>} 
            name="fullName" 
            rules={[{ required: true, message: 'Vui lòng nhập họ và tên của bạn!' }]}
          >
            <Input placeholder="Ví dụ: Nguyễn Viết Lãm" className="h-10 rounded-lg" />
          </Form.Item>

          <Form.Item 
            label={<span className="font-bold text-xs uppercase text-gray-600">Email</span>} 
            name="email" 
            rules={[
              { required: true, message: 'Vui lòng nhập Email!' },
              { type: 'email', message: 'Định dạng Email không hợp lệ!' }
            ]}
          >
            <Input placeholder="name@example.com" className="h-10 rounded-lg" />
          </Form.Item>

          <Form.Item 
            label={<span className="font-bold text-xs uppercase text-gray-600">Số điện thoại</span>} 
            name="phoneNumber" 
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại!' },
              { pattern: /^[0-9]{10}$/, message: 'Số điện thoại phải bao gồm 10 chữ số!' }
            ]}
          >
            <Input placeholder="Ví dụ: 0912345678" className="h-10 rounded-lg" />
          </Form.Item>

          <Form.Item
            label={<span className="font-bold text-xs uppercase text-gray-600">CCCD</span>}
            name="cccd"
            normalize={(value: string) => value?.replace(/\D/g, '')}
            rules={[
              { required: true, message: 'Vui lòng nhập số CCCD!' },
              { pattern: /^[0-9]{12}$/, message: 'CCCD phải gồm đúng 12 chữ số!' }
            ]}
            extra="Mỗi số CCCD chỉ được tạo một tài khoản để đảm bảo giới hạn mua vé."
          >
            <Input maxLength={12} placeholder="Ví dụ: 040203001234" className="h-10 rounded-lg" />
          </Form.Item>

          <Form.Item
            label={<span className="font-bold text-xs uppercase text-gray-600">Địa chỉ</span>}
            name="address"
            rules={[
              { required: true, message: 'Vui lòng nhập địa chỉ!' },
              { min: 8, message: 'Địa chỉ cần chi tiết hơn một chút!' }
            ]}
          >
            <Input.TextArea rows={3} placeholder="Số nhà, phường/xã, quận/huyện, tỉnh/thành phố" className="rounded-lg" />
          </Form.Item>

          <Form.Item 
            label={<span className="font-bold text-xs uppercase text-gray-600">Mật khẩu</span>} 
            name="password" 
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu!' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu bí mật" className="h-10 rounded-lg" />
          </Form.Item>

          <Form.Item 
            label={<span className="font-bold text-xs uppercase text-gray-600">Xác nhận mật khẩu</span>} 
            name="confirmPassword" 
            dependencies={['password']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận lại mật khẩu!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu nhập lại không trùng khớp!'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Nhập lại mật khẩu phía trên" className="h-10 rounded-lg" />
          </Form.Item>

          <Form.Item className="mb-2">
            <Button 
              type="primary" 
              htmlType="submit" 
              className="w-full h-10 bg-[#003078] hover:bg-[#edbb00] font-bold rounded-lg transition-all"
            >
              ĐĂNG KÝ NGAY
            </Button>
          </Form.Item>

          <div className="text-center mt-4 text-xs font-medium text-gray-500">
            Đã có tài khoản rồi?{' '}
            <Link 
              href="/login" 
              className="text-[#003078] hover:text-[#edbb00] font-bold underline underline-offset-2 transition-colors"
            >
              Đăng nhập tại đây
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}

// Bọc component bằng dynamic và tắt ssr để triệt tiêu hoàn toàn lỗi Hydration
export default dynamic(() => Promise.resolve(RegisterPage), { ssr: false });
