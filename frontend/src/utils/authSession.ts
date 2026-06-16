import { IUser } from '../interfaces/IUser';

export const AUTH_SESSION_CHANGED = 'slna-auth-session-changed';

export const getStoredUser = (): IUser | null => {
  try {
    const value = localStorage.getItem('user_info');
    return value ? JSON.parse(value) as IUser : null;
  } catch {
    return null;
  }
};

export const notifyAuthSessionChanged = () => {
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED));
};

export const saveAuthSession = (token: string, user: object) => {
  localStorage.setItem('access_token', token);
  localStorage.setItem('user_info', JSON.stringify(user));
  notifyAuthSessionChanged();
};

export const saveStoredUser = (user: object) => {
  localStorage.setItem('user_info', JSON.stringify(user));
  notifyAuthSessionChanged();
};

export const clearAuthSession = () => {
  localStorage.removeItem('user_info');
  localStorage.removeItem('access_token');
  notifyAuthSessionChanged();
};
