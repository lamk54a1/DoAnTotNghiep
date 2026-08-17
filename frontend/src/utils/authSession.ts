import { IUser } from '../interfaces/IUser';

export const AUTH_SESSION_CHANGED = 'slna-auth-session-changed';

export type StoredUser = Pick<IUser, 'id' | 'email' | 'fullName' | 'role'> &
  Partial<Pick<IUser, 'profileCompleted' | 'authProvider' | 'status'>>;

const sanitizeUserForStorage = (user: object): StoredUser => {
  const value = user as Partial<IUser>;
  return {
    id: Number(value.id),
    email: String(value.email || ''),
    fullName: String(value.fullName || ''),
    role: value.role === 'ADMIN' ? 'ADMIN' : 'USER',
    profileCompleted: Boolean(value.profileCompleted),
    authProvider: value.authProvider,
    status: value.status,
  };
};

export const getStoredUser = (): StoredUser | null => {
  try {
    const value = localStorage.getItem('user_info');
    return value ? JSON.parse(value) as StoredUser : null;
  } catch {
    return null;
  }
};

export const notifyAuthSessionChanged = () => {
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED));
};

export const saveAuthSession = (user: object) => {
  localStorage.setItem('user_info', JSON.stringify(sanitizeUserForStorage(user)));
  localStorage.removeItem('access_token');
  notifyAuthSessionChanged();
};

export const saveStoredUser = (user: object) => {
  localStorage.setItem('user_info', JSON.stringify(sanitizeUserForStorage(user)));
  notifyAuthSessionChanged();
};

export const clearAuthSession = () => {
  localStorage.removeItem('user_info');
  localStorage.removeItem('access_token');
  notifyAuthSessionChanged();
};
