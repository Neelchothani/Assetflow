import api from '@/lib/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  company: string;
  phone?: string;
  role?: 'admin' | 'manager';
}

export interface AuthResponse {
  token: string;
  type: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    company: string;
    avatar?: string;
  };
}

export const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    // JWT is stateless, just remove the token and user data from client
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: async (): Promise<AuthResponse['user']> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  updateProfile: async (data: FormData): Promise<AuthResponse['user']> => {
    const response = await api.patch('/auth/me', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  changePassword: async (payload: { currentPassword: string; newPassword: string; confirmPassword?: string }) => {
    const response = await api.post('/auth/change-password', {
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
      confirmPassword: payload.newPassword, // Send newPassword as confirmPassword since we already validated on frontend
    });
    return response.data;
  },
};