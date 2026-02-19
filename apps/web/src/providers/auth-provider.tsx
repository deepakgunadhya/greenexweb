import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api/auth';

interface AuthContextType {
  user: any | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: any) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { 
    user, 
    setUser, 
    clearAuth, 
    isLoading, 
    setLoading,
    token,
    updateTokens,
    getTimeUntilExpiry,
    accessTokenExpiresAt
  } = useAuthStore();
  
  const location = useLocation();
  const isClientRoute = location.pathname.startsWith('/client');

  const [isInitialized, setIsInitialized] = useState(false);
  const isRefreshingRef = useRef(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Silent token refresh function - NO PAGE RELOAD
  const silentRefreshToken = useCallback(async () => {
    // Prevent multiple simultaneous refreshes
    if (isRefreshingRef.current) {
      console.log('⏭️ Refresh already in progress, skipping...');
      return false;
    }

    try {
      isRefreshingRef.current = true;
      console.log('🔄 SILENT REFRESH: Calling /auth/refresh API...');
      
      // Call the refresh API endpoint
      const response = await authApi.refreshToken();
      
      if (response.data?.accessToken) {
        const { accessToken, user: userData, tokens } = response.data;
        
        console.log('✅ SILENT REFRESH: Success! Token updated in memory');
        console.log('- Old token expires:', accessTokenExpiresAt ? new Date(accessTokenExpiresAt).toLocaleTimeString() : 'N/A');
        console.log('- New token expires:', tokens?.accessTokenExpiresAt ? new Date(tokens.accessTokenExpiresAt).toLocaleTimeString() : 'N/A');
        
        // Update localStorage (NO PAGE RELOAD)
        localStorage.setItem('greenex_token', accessToken);
        
        // Update Zustand store (NO PAGE RELOAD)
        if (userData) {
          setUser(userData, accessToken, tokens);
        } else {
          updateTokens(accessToken, tokens?.accessTokenExpiresAt, tokens?.refreshTokenExpiresAt);
        }
        
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('❌ SILENT REFRESH: Failed', error);
      
      // Only logout if refresh token is expired (401/403)
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        console.log('🚪 Refresh token expired, logging out...');
        localStorage.removeItem('greenex_token');
        clearAuth();
      }
      
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [accessTokenExpiresAt, setUser, updateTokens, clearAuth]);

  // Schedule the next refresh based on token expiry
  const scheduleTokenRefresh = useCallback(() => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!accessTokenExpiresAt) {
      console.log('⏸️ No token expiry time, skipping schedule');
      return;
    }

    const timeUntilExpiry = getTimeUntilExpiry();
    const oneMinute = 60 * 1000;
    
    // If token expires in less than 1 minute, refresh immediately
    if (timeUntilExpiry <= oneMinute) {
      console.log('⚠️ Token expiring in < 1 minute! Refreshing NOW...');
      silentRefreshToken();
      return;
    }

    // Schedule refresh for 1 minute before expiry
    const refreshDelay = timeUntilExpiry - oneMinute;
    
    console.log('⏱️ SCHEDULING NEXT REFRESH:');
    console.log('- Current time:', new Date().toLocaleTimeString());
    console.log('- Token expires:', new Date(accessTokenExpiresAt).toLocaleTimeString());
    console.log('- Refresh scheduled in:', Math.floor(refreshDelay / 1000) + 's');
    console.log('- Refresh will occur at:', new Date(Date.now() + refreshDelay).toLocaleTimeString());
    
    refreshTimerRef.current = setTimeout(async () => {
      console.log('⏰ SCHEDULED REFRESH TRIGGERED!');
      const success = await silentRefreshToken();
      
      // Schedule next refresh after successful refresh
      if (success) {
        console.log('🔁 Scheduling next refresh cycle...');
        // Small delay to allow state to update
        setTimeout(() => scheduleTokenRefresh(), 100);
      }
    }, refreshDelay);
  }, [accessTokenExpiresAt, getTimeUntilExpiry, silentRefreshToken]);

  // Initialize auth state on app load (admin only - client has its own auth via Redux)
  useEffect(() => {
    const initializeAuth = async () => {
      // Skip admin auth initialization on client routes
      if (isClientRoute) {
        setIsInitialized(true);
        return;
      }

      try {
        setLoading(true);

        const storedToken = localStorage.getItem('greenex_token');
        if (storedToken) {
          try {
            console.log('🔍 Verifying stored token...');
            const profile = await authApi.getProfile();
            setUser(profile.data, storedToken);
            console.log('✅ Auth initialized - user logged in');
          } catch (error) {
            console.log('❌ Token verification failed');
            localStorage.removeItem('greenex_token');
            clearAuth();
          }
        } else {
          console.log('ℹ️ No stored token');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        clearAuth();
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  // Setup auto-refresh when user is logged in and has token expiry (admin only)
  useEffect(() => {
    if (isClientRoute) return;
    if (!user || !token || !accessTokenExpiresAt) {
      return;
    }

    console.log('▶️ Auto-refresh system ACTIVE');
    scheduleTokenRefresh();

    // Cleanup timer on unmount or when dependencies change
    return () => {
      if (refreshTimerRef.current) {
        console.log('🧹 Cleaning up refresh timer');
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [user, token, accessTokenExpiresAt, scheduleTokenRefresh]);

  // Safety check every 30 seconds (admin only)
  useEffect(() => {
    if (isClientRoute) return;
    if (!user || !token) return;

    const safetyInterval = setInterval(() => {
      const timeUntilExpiry = getTimeUntilExpiry();
      const oneMinute = 60 * 1000;

      if (timeUntilExpiry <= oneMinute && !isRefreshingRef.current) {
        console.log('🚨 SAFETY CHECK: Token expiring soon! Triggering refresh...');
        silentRefreshToken().then(success => {
          if (success) {
            setTimeout(() => scheduleTokenRefresh(), 100);
          }
        });
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(safetyInterval);
  }, [user, token, getTimeUntilExpiry, silentRefreshToken, scheduleTokenRefresh]);

  // Handle page visibility change (admin only)
  useEffect(() => {
    if (isClientRoute) return;
    if (!user || !token) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Page visible - checking token status...');
        
        const timeUntilExpiry = getTimeUntilExpiry();
        const oneMinute = 60 * 1000;
        
        if (timeUntilExpiry <= oneMinute) {
          console.log('⚠️ Token expired/expiring while tab was hidden - refreshing...');
          silentRefreshToken().then(success => {
            if (success) {
              setTimeout(() => scheduleTokenRefresh(), 100);
            }
          });
        } else {
          console.log('✅ Token still valid');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, token, getTimeUntilExpiry, silentRefreshToken, scheduleTokenRefresh]);

  const login = async (email: string, password: string) => {
    console.log('🔐 LOGIN: Starting...');

    try {
      const response = await authApi.login({ email, password });

      console.log('🔍 LOGIN: Response structure:', {
        hasData: !!response.data,
        hasUser: !!response.data?.user,
        hasTokens: !!response.data?.tokens,
        hasAccessToken: !!response.data?.accessToken,
        tokensAccessToken: !!response.data?.tokens?.accessToken
      });

      // Handle both response formats
      const accessToken = response.data?.tokens?.accessToken || response.data?.accessToken;
      const user = response.data?.user;
      const tokens = response.data?.tokens;

      if (accessToken && user) {
        console.log('💾 LOGIN: Saving token to localStorage...');
        console.log('- Token length:', accessToken.length);
        console.log('- Token preview:', accessToken.substring(0, 30) + '...');

        localStorage.setItem('greenex_token', accessToken);

        console.log('✅ LOGIN: Token saved successfully');
        console.log('- Verify localStorage:', localStorage.getItem('greenex_token') ? 'EXISTS ✅' : 'MISSING ❌');

        setUser(user, accessToken, tokens);

        console.log('✅ LOGIN: Success!');
        console.log('- User:', user.email);
        console.log('- Permissions:', user.permissions?.length || 0);
        if (tokens?.accessTokenExpiresAt) {
          const expiresAt = new Date(tokens.accessTokenExpiresAt);
          const timeUntil = tokens.accessTokenExpiresAt - Date.now();
          console.log('📅 Token expires:', expiresAt.toLocaleString());
          console.log('⏱️ Time until expiry:', Math.floor(timeUntil / 1000) + 's');
          console.log('🔄 Auto-refresh will start automatically');
        }
      } else {
        console.error('❌ LOGIN: Invalid response structure');
        console.error('- accessToken:', accessToken ? 'EXISTS' : 'MISSING');
        console.error('- user:', user ? 'EXISTS' : 'MISSING');
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('❌ LOGIN: Failed', error);
      throw error;
    }
  };

  const register = async (data: any) => {
    try {
      const response = await authApi.register(data);

      // Handle both response formats
      const accessToken = response.data?.tokens?.accessToken || response.data?.accessToken;
      const user = response.data?.user;
      const tokens = response.data?.tokens;

      if (accessToken && user) {
        localStorage.setItem('greenex_token', accessToken);
        setUser(user, accessToken, tokens);
        console.log('✅ REGISTER: Success! Token saved.');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    console.log('👋 Logging out...');
    
    // Clear refresh timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    localStorage.removeItem('greenex_token');
    clearAuth();
    
    authApi.logout().catch(() => {
      // Ignore errors on logout
    });
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const value = {
    user,
    isLoading,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}