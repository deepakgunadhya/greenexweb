import { apiClient } from './client';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface AuthResponse {
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    permissions: string[];
  };
  accessToken: string;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: number;
    refreshTokenExpiresAt: number;
  };
}

export const authApi = {
  async login(data: LoginRequest): Promise<{ data: AuthResponse }> {
    console.log('🌐 AUTH API: Making login request');
    console.log('- URL:', '/auth/login');
    console.log('- Data:', { email: data.email, password: data.password ? '***' + data.password.slice(-2) : 'undefined' });
    console.log('- Base URL:', apiClient.defaults.baseURL);
    
    try {
      const response = await apiClient.post('/auth/login', data);
      
      console.log('📦 AUTH API: Response received');
      console.log('- Status:', response.status);
      console.log('- Success flag:', response.data?.success);
      console.log('- Response data:', response.data);
      
      // Check if response was successful
      if (response.status >= 400 || !response.data.success) {
        console.error('❌ AUTH API: Login request failed');
        console.error('- Error:', response.data?.error);
        
        // Create a proper error object that mimics axios error structure
        const error: any = new Error(response.data?.error?.message || 'Login failed');
        error.response = {
          status: response.status,
          data: response.data,
          statusText: response.statusText,
        };
        error.config = response.config;
        error.isAxiosError = true;
        
        throw error;
      }

      console.log('✅ AUTH API: Login request successful');
      console.log('- Access Token:', response.data?.data?.accessToken ? 'Present' : 'Missing');
      console.log('- User Data:', response.data?.data?.user ? 'Present' : 'Missing');
      console.log('- Tokens Data:', response.data?.data?.tokens ? 'Present' : 'Missing');
      
      if (response.data?.data?.tokens) {
        console.log('- Token Expiry Info:', {
          accessTokenExpiresAt: response.data.data.tokens.accessTokenExpiresAt,
          refreshTokenExpiresAt: response.data.data.tokens.refreshTokenExpiresAt,
        });
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ AUTH API: Login request exception');
      console.error('- Error:', error);
      console.error('- Error response:', error.response);
      
      // If error doesn't have proper response structure, create it
      if (!error.response) {
        error.response = {
          status: 500,
          data: { error: { message: error.message || 'Network error occurred' } },
        };
      }
      
      throw error;
    }
  },

  async register(data: RegisterRequest): Promise<{ data: AuthResponse }> {
    try {
      const response = await apiClient.post('/auth/register', data);
      
      if (response.status >= 400 || !response.data.success) {
        const error: any = new Error(response.data?.error?.message || 'Registration failed');
        error.response = {
          status: response.status,
          data: response.data,
          statusText: response.statusText,
        };
        error.config = response.config;
        error.isAxiosError = true;
        throw error;
      }
      
      return response.data;
    } catch (error: any) {
      if (!error.response) {
        error.response = {
          status: 500,
          data: { error: { message: error.message || 'Network error occurred' } },
        };
      }
      throw error;
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
      // Don't throw on logout errors
    }
  },

  async refreshToken(): Promise<{ data: AuthResponse }> {
    const response = await apiClient.post('/auth/refresh');
    
    if (response.status >= 400 || !response.data.success) {
      const error: any = new Error(response.data?.error?.message || 'Token refresh failed');
      error.response = {
        status: response.status,
        data: response.data,
      };
      throw error;
    }
    
    return response.data;
  },

  async getProfile(): Promise<{ data: any }> {
    const response = await apiClient.get('/auth/me');
    
    if (response.status >= 400 || !response.data.success) {
      const error: any = new Error(response.data?.error?.message || 'Failed to fetch profile');
      error.response = {
        status: response.status,
        data: response.data,
      };
      throw error;
    }
    
    return response.data;
  },

  async changePassword(data: { oldPassword: string; newPassword: string }): Promise<void> {
    const response = await apiClient.post('/auth/change-password', data);
    
    if (response.status >= 400 || !response.data.success) {
      const error: any = new Error(response.data?.error?.message || 'Failed to change password');
      error.response = {
        status: response.status,
        data: response.data,
      };
      throw error;
    }
  },
};