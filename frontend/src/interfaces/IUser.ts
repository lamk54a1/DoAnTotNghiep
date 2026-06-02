// 1. Interface cốt lõi của User (Giữ nguyên cái cũ của Lãm)
export interface IUser {
  id: number;
  email: string;
  fullName: string;
  phoneNumber?: string;     // Rất quan trọng để kiểm tra giới hạn 4 vé
  role: 'USER' | 'ADMIN';   // Phân quyền người dùng hoặc quản trị viên
  avatar?: string;
  password?: string;        // Lưu hash mật khẩu (dùng ở Backend)
  address?: string;         // Địa chỉ (nếu muốn làm tính năng ship vé cứng)
  status: 'ACTIVE' | 'BANNED';
  createdAt: Date | string; // Ngày tạo tài khoản
}

// 2. LÀM THÊM: Các kiểu dữ liệu bổ trợ cho luồng Auth (Gộp vào đây luôn)
export interface ILoginPayload {
  email: string;
  password: string;
}

export interface IRegisterPayload {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
}

export interface IAuthResponse {
  message: string;
  access_token: string;
  user: {
    id: number;
    email: string;
    fullName: string;
    role: 'USER' | 'ADMIN';
  };
}