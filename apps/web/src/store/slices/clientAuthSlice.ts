import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../lib/api/client';

// Client user interface
interface ClientUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  userType: 'CLIENT';
  organizationId?: string;
  leadId?: string;
  organization?: {
    id: string;
    name: string;
    type: string;
    industry?: string;
  };
  lead?: {
    id: string;
    title: string;
  };
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt?: string;
}

interface ClientAuthState {
  user: ClientUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  loginLoading: boolean;
  error: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: number | null;
  profileFetchAttempted: boolean;
}

const initialState: ClientAuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  loginLoading: false,
  error: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  tokenExpiry: null,
  profileFetchAttempted: false,
};

// ── Async Thunks ──────────────────────────────────────────────────────────────
// All thunks use apiClient (same as admin auth) so that:
//  - Requests go directly to the API origin (localhost:3001), ensuring httpOnly
//    cookies are set/sent for the correct origin
//  - The axios 401 interceptor handles token refresh automatically
//  - Token is attached via the request interceptor (reads from localStorage)

export const clientLogin = createAsyncThunk(
  'clientAuth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      // apiClient with withCredentials:true ensures the httpOnly refreshToken
      // cookie from the server is saved for the API origin
      const response = await apiClient.post('/auth/login', credentials);
      const data = response.data;

      // apiClient success handler passes auth endpoint responses as-is,
      // so we check the success flag ourselves
      if (!data.success) {
        return rejectWithValue(data.error?.message || 'Login failed');
      }

      // Ensure this is a client user
      if (data.data.user.userType !== 'CLIENT') {
        return rejectWithValue('Invalid user type. Please use the admin portal.');
      }

      // Store the accessToken in localStorage (mirror of admin's greenex_token)
      const accessToken = data.data.accessToken;
      localStorage.setItem('accessToken', accessToken);

      return {
        user: data.data.user,
        accessToken,
      };
    } catch (error: any) {
      // AxiosError from 401 or network error
      const message =
        error?.response?.data?.error?.message ||
        error?.data?.error?.message ||
        error?.message ||
        'Login failed';
      return rejectWithValue(message);
    }
  }
);

export const clientLogout = createAsyncThunk(
  'clientAuth/logout',
  async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore errors - we clear tokens locally regardless
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    return true;
  }
);

export const fetchClientProfile = createAsyncThunk(
  'clientAuth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/auth/me');
      const data = response.data;

      if (!data.success) {
        return rejectWithValue(data.error?.message || 'Failed to fetch profile');
      }

      // Validate that this is a client user
      if (data.data.userType !== 'CLIENT') {
        return rejectWithValue('Invalid user type for client portal');
      }

      return data.data;
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message ||
        error?.data?.error?.message ||
        error?.message ||
        'Failed to fetch profile';
      return rejectWithValue(message);
    }
  }
);

export const updateClientProfile = createAsyncThunk(
  'clientAuth/updateProfile',
  async (updates: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put('/users/profile', updates);
      const data = response.data;

      if (!data.success) {
        return rejectWithValue(data.error?.message || 'Failed to update profile');
      }

      return data.data;
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message ||
        error?.data?.error?.message ||
        error?.message ||
        'Failed to update profile';
      return rejectWithValue(message);
    }
  }
);

export const changeClientPassword = createAsyncThunk(
  'clientAuth/changePassword',
  async (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/change-password', {
        oldPassword: payload.currentPassword,
        newPassword: payload.newPassword,
      });
      const data = response.data;

      if (!data.success) {
        return rejectWithValue(data.error?.message || 'Failed to change password');
      }

      return data.data;
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message ||
        error?.data?.error?.message ||
        error?.message ||
        'Failed to change password';
      return rejectWithValue(message);
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const clientAuthSlice = createSlice({
  name: 'clientAuth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.accessToken = null;
      state.refreshToken = null;
      state.tokenExpiry = null;
      state.profileFetchAttempted = false;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
    setTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken: string; expiresIn?: number }>) => {
      const { accessToken, refreshToken, expiresIn } = action.payload;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.tokenExpiry = expiresIn ? Date.now() + (expiresIn * 1000) : null;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Login ────────────────────────────────────────────────────────
      .addCase(clientLogin.pending, (state) => {
        state.loginLoading = true;
        state.error = null;
      })
      .addCase(clientLogin.fulfilled, (state, action) => {
        state.loginLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.accessToken = action.payload.accessToken;
        state.profileFetchAttempted = true;
      })
      .addCase(clientLogin.rejected, (state, action) => {
        state.loginLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
      })

      // ── Logout ───────────────────────────────────────────────────────
      .addCase(clientLogout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.accessToken = null;
        state.refreshToken = null;
        state.tokenExpiry = null;
        state.error = null;
        state.profileFetchAttempted = false;
      })

      // ── Fetch Profile (session restore) ──────────────────────────────
      .addCase(fetchClientProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.profileFetchAttempted = true;
      })
      .addCase(fetchClientProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.profileFetchAttempted = true;
      })
      .addCase(fetchClientProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.profileFetchAttempted = true;
        // Auth error: clear state so ClientProtectedRoute redirects to login
        const msg = (action.payload as string) || '';
        const isAuthError =
          msg.includes('Invalid token') ||
          msg.includes('Token has expired') ||
          msg.includes('Access token required') ||
          msg.includes('Authentication');
        if (isAuthError) {
          state.isAuthenticated = false;
          state.user = null;
          state.accessToken = null;
          state.refreshToken = null;
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      })

      // ── Update Profile ───────────────────────────────────────────────
      .addCase(updateClientProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateClientProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(updateClientProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── Change Password ──────────────────────────────────────────────
      .addCase(changeClientPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changeClientPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(changeClientPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  clearAuth,
  setTokens,
} = clientAuthSlice.actions;

export default clientAuthSlice.reducer;
