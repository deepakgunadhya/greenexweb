import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
}

interface AuthStore {
  user: User | null;
  token: string | null;
  accessTokenExpiresAt: number | null;
  refreshTokenExpiresAt: number | null;
  isLoading: boolean;
  setUser: (user: User, token: string, tokens?: any) => void;
  updateTokens: (token: string, accessTokenExpiresAt?: number, refreshTokenExpiresAt?: number) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  getTimeUntilExpiry: () => number;
  isTokenExpiringSoon: () => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      isLoading: true,

      setUser: (user, token, tokens) => {
        const accessTokenExpiresAt = tokens?.accessTokenExpiresAt || null;
        const refreshTokenExpiresAt = tokens?.refreshTokenExpiresAt || null;
        
        console.log('📝 STORE: Setting user and tokens');
        console.log('- Token expires at:', accessTokenExpiresAt ? new Date(accessTokenExpiresAt).toLocaleString() : 'N/A');
        console.log('- Time until expiry:', accessTokenExpiresAt ? Math.floor((accessTokenExpiresAt - Date.now()) / 1000) + 's' : 'N/A');
        
        set({ 
          user, 
          token, 
          isLoading: false,
          accessTokenExpiresAt,
          refreshTokenExpiresAt,
        });
      },

      updateTokens: (token, accessTokenExpiresAt, refreshTokenExpiresAt) => {
        console.log('🔄 STORE: Updating tokens only');
        console.log('- New token expires at:', accessTokenExpiresAt ? new Date(accessTokenExpiresAt).toLocaleString() : 'N/A');
        
        set({ 
          token,
          accessTokenExpiresAt: accessTokenExpiresAt || null,
          refreshTokenExpiresAt: refreshTokenExpiresAt || null,
        });
      },

      clearAuth: () => {
        console.log('🗑️ STORE: Clearing auth');
        set({ 
          user: null, 
          token: null, 
          isLoading: false,
          accessTokenExpiresAt: null,
          refreshTokenExpiresAt: null,
        });
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      hasPermission: (permission) => {
        const { user } = get();
        return user?.permissions?.includes(permission) || false;
      },

      hasRole: (role) => {
        const { user } = get();
        return user?.roles?.includes(role) || false;
      },

      // Get time in milliseconds until token expires
      getTimeUntilExpiry: () => {
        const { accessTokenExpiresAt } = get();
        if (!accessTokenExpiresAt) return 0;
        return Math.max(0, accessTokenExpiresAt - Date.now());
      },

      // Check if token will expire in less than 1 minute
      isTokenExpiringSoon: () => {
        const { accessTokenExpiresAt } = get();
        if (!accessTokenExpiresAt) return true;
        
        const timeUntilExpiry = accessTokenExpiresAt - Date.now();
        const oneMinute = 60 * 1000;
        
        return timeUntilExpiry <= oneMinute;
      },
    }),
    {
      name: 'greenex-auth',
      partialize: (state) => ({
        // user: state.user,
        token: state.token,
        accessTokenExpiresAt: state.accessTokenExpiresAt,
        refreshTokenExpiresAt: state.refreshTokenExpiresAt,
      }),
    }
  )
);