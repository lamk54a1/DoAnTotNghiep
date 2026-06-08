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

  getProfile: (): Promise<IUser> => {
    return axiosClient.get('/auth/profile');
  },

  updateProfile: (data: Pick<IUser, 'fullName' | 'phoneNumber' | 'address'>): Promise<{ message: string; user: IUser }> => {
    return axiosClient.put('/auth/profile', data);
  },

  updateIdentity: (cccd: string): Promise<{ message: string; user: IUser }> => {
    return axiosClient.put('/auth/identity', { cccd });
  },
};
