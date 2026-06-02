import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { notification } from 'antd';

const axiosClient = axios.create({
  baseURL:  'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// THIẾT LẬP INTERCEPTORS
// 1. Trước khi gửi request đi
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Sau khi nhận response về
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Trả về trực tiếp data để các hàm ở ngoài không phải gọi .data nữa
    return response.data;
  },
  (error) => {
    // Xử lý lỗi chung bằng Ant Design
    const message = error.response?.data?.message || 'Lỗi kết nối máy chủ!';
    
    if (error.response?.status === 401) {
       // Xử lý khi hết hạn đăng nhập
       notification.warning({ message: 'Phiên đăng nhập hết hạn', description: 'Vui lòng đăng nhập lại!' });
       // window.location.href = '/login';
    } else {
       notification.error({ message: 'Lỗi API', description: message });
    }

    return Promise.reject(error);
  }
);

export default axiosClient;