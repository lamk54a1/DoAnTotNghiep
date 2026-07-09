import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api').replace(/\/$/, '');

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');

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
    if (error.response?.status === 401) {
      console.warn('Phiên đăng nhập hết hạn hoặc không hợp lệ.');
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
