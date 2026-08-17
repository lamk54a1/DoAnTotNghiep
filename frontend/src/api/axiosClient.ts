import axios, { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { clearAuthSession } from '../utils/authSession';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api').replace(/\/$/, '');

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ApiClient {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');

// THIẾT LẬP INTERCEPTORS
// 1. Trước khi gửi request đi
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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
      if (typeof window !== 'undefined') clearAuthSession();
    }

    return Promise.reject(error);
  }
);

export default axiosClient as unknown as ApiClient;
