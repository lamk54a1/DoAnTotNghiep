import axiosClient from './axiosClient';
// Thay đổi từ 'IAuth' sang 'IUser'
import { ILoginPayload, IRegisterPayload, IAuthResponse } from '../interfaces/IUser';

export const authApi = {
  login: (data: ILoginPayload): Promise<IAuthResponse> => {
    return axiosClient.post('/auth/login', data);
  },
  
  register: (data: IRegisterPayload): Promise<IAuthResponse> => {
    return axiosClient.post('/auth/register', data);
  },
};