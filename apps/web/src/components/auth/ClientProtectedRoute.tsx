import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { useClientAuth } from '@/hooks/useClientAuth';

interface ClientProtectedRouteProps {
  children: ReactNode;
  requireOrganization?: string;
  requireLead?: string;
}

export function ClientProtectedRoute({
  children,
  requireOrganization,
  requireLead
}: ClientProtectedRouteProps) {
  const {
    isAuthenticated,
    user,
    loading,
    hasAccessToOrganization,
    hasAccessToLead,
    forceLogout
  } = useClientAuth();
  const { profileFetchAttempted } = useAppSelector((state) => state.clientAuth);
  const location = useLocation();

  // ── Session restore gate ─────────────────────────────────────────────
  // On page refresh, Redux resets but localStorage still has the token.
  // We must wait for the profile fetch to complete before making any
  // auth decisions. This mirrors admin's `isInitialized` gate.
  const hasStoredToken = !!localStorage.getItem('accessToken');
  const isRestoringSession = hasStoredToken && !profileFetchAttempted;

  if (loading || isRestoringSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-primary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-sm text-slate-600">Loading client portal...</p>
        </div>
      </div>
    );
  }

  // ── Auth check (only runs after session restore is complete) ─────────
  if (!isAuthenticated || !user) {
    return <Navigate to="/client/login" state={{ from: location }} replace />;
  }

  // Verify user is actually a client user
  if (user.userType !== 'CLIENT') {
    forceLogout();
    return <Navigate to="/client/login" replace />;
  }

  // Check organization access if required
  if (requireOrganization && !hasAccessToOrganization(requireOrganization)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-primary-50">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-600 mb-6">
              You don't have permission to access this organization's data.
            </p>
            <button
              onClick={() => window.history.back()}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check lead access if required
  if (requireLead && !hasAccessToLead(requireLead)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-primary-50">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-600 mb-6">
              You don't have permission to access this lead's information.
            </p>
            <button
              onClick={() => window.history.back()}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // All checks passed, render the protected content
  return <>{children}</>;
}
