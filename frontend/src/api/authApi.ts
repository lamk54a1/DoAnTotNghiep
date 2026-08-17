import axiosClient from './axiosClient';
// Thay đổi từ 'IAuth' sang 'IUser'
import { ILoginPayload, IRegisterPayload, IAuthResponse, IUser } from '../interfaces/IUser';

export const authApi = {
  login: (data: ILoginPayload): Promise<IAuthResponse> => {
    return axiosClient.post('/auth/login', data);
  },
  
  register: (data: IRegisterPayload): Promise<IAuthResponse> => {
    return axiosClient.post('/auth/register', data);
  },

  logout: (): Promise<{ message: string }> => {
    return axiosClient.post('/auth/logout');
  },

  getProfile: (): Promise<IUser> => {
    return axiosClient.get('/auth/profile');
  },

  updateProfile: (data: Pick<IUser, 'fullName' | 'phoneNumber' | 'address'>): Promise<{ message: string; user: IUser }> => {
    return axiosClient.put('/auth/profile', data);
  },

  updateIdentity: (cccd: string): Promise<{ message: string; user: IUser }> => {
    return axiosClient.put('/auth/identity', { cccd });
  },

  changePassword: (data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> => {
    return axiosClient.put('/auth/password', data);
  },

  changeEmail: (data: { email: string; currentPassword: string }): Promise<{ message: string; email: string }> => {
    return axiosClient.put('/auth/email', data);
  },
};
