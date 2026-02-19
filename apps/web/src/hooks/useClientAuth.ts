import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  clientLogin,
  clientLogout,
  fetchClientProfile,
  updateClientProfile,
  changeClientPassword,
  clearError,
  clearAuth,
} from '../store/slices/clientAuthSlice';

export const useClientAuth = () => {
  const dispatch = useAppDispatch();
  const {
    user,
    isAuthenticated,
    loading,
    loginLoading,
    error,
    profileFetchAttempted,
  } = useAppSelector((state) => state.clientAuth);

  // Session restore: if we have a token in localStorage but no user in Redux,
  // verify the token by fetching profile (mirrors admin's initializeAuth)
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && !user && !loading && !profileFetchAttempted) {
      dispatch(fetchClientProfile());
    }
  }, [dispatch, user, loading, profileFetchAttempted]);

  // Token refresh is handled automatically by the axios 401 interceptor
  // in lib/api/client.ts — no manual refresh needed here (mirrors admin flow)

  // Login function
  const login = async (email: string, password: string) => {
    try {
      const result = await dispatch(clientLogin({ email, password }));
      if (clientLogin.fulfilled.match(result)) {
        return { success: true, user: result.payload.user };
      } else {
        return { success: false, error: result.payload as string };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    }
  };

  // Logout function
  const logout = async () => {
    await dispatch(clientLogout());
  };

  // Update profile function
  const updateProfile = async (updates: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) => {
    try {
      const result = await dispatch(updateClientProfile(updates));
      if (updateClientProfile.fulfilled.match(result)) {
        return { success: true, user: result.payload };
      } else {
        return { success: false, error: result.payload as string };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed'
      };
    }
  };

  // Change password function
  const changePassword = async (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    try {
      const result = await dispatch(changeClientPassword(payload));
      if (changeClientPassword.fulfilled.match(result)) {
        return { success: true };
      } else {
        return { success: false, error: result.payload as string };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password change failed'
      };
    }
  };

  // Clear errors
  const clearAuthError = () => {
    dispatch(clearError());
  };

  // Force logout (for session expiry, etc.)
  const forceLogout = () => {
    dispatch(clearAuth());
  };

  // Check if user has access to specific organization/lead
  const hasAccessToOrganization = (organizationId: string) => {
    if (!user) return false;
    return user.organizationId === organizationId;
  };

  const hasAccessToLead = (leadId: string) => {
    if (!user) return false;
    if (user.leadId) {
      return user.leadId === leadId;
    }
    return true;
  };

  // Get user display name
  const getDisplayName = () => {
    if (!user) return 'Unknown User';
    return `${user.firstName} ${user.lastName}`.trim();
  };

  // Get organization name
  const getOrganizationName = () => {
    return user?.organization?.name || 'Unknown Organization';
  };

  return {
    // State
    user,
    isAuthenticated,
    loading,
    loginLoading,
    error,
    isTokenExpired: false, // Kept for backward compat; refresh is handled by interceptor

    // Actions
    login,
    logout,
    updateProfile,
    changePassword,
    clearAuthError,
    forceLogout,

    // Utility functions
    hasAccessToOrganization,
    hasAccessToLead,
    getDisplayName,
    getOrganizationName,
  };
};
