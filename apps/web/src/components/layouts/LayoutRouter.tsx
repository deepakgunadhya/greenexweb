import { ReactNode } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useClientAuth } from '@/hooks/useClientAuth';
import { AppLayout } from './app-layout';
import { ClientLayout } from './client-layout';
import { isClientRoute, isAdminRoute, canUserAccessRoute, getRedirectPath, getLoginPath } from '@/utils/routeUtils';

interface LayoutRouterProps {
  children: ReactNode;
}

export function LayoutRouter({ children }: LayoutRouterProps) {
  const location = useLocation();
  const { user: adminUser } = useAuth();
  const { user: clientUser, isAuthenticated: isClientAuthenticated } = useClientAuth();
  const isAdminAuthenticated = !!adminUser;

  // Determine which authentication state to use based on route
  const isClientPath = isClientRoute(location.pathname);
  const isAdminPath = isAdminRoute(location.pathname);

  // For client routes, use client auth; for admin routes, use admin auth
  const user = isClientPath ? clientUser : adminUser;
  const isAuthenticated = isClientPath ? isClientAuthenticated : isAdminAuthenticated;

  // Public routes that don't need authentication
  const publicRoutes = ['/login', '/client/login', '/', '/register', '/forgot-password'];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  // If it's a public route, just render children without any layout
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // If user is not authenticated, redirect to appropriate login
  if (!isAuthenticated || !user) {
    const loginPath = getLoginPath(location.pathname);
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Check if user can access the current route
  if (!canUserAccessRoute(user.userType || 'INTERNAL', location.pathname)) {
    // User is trying to access wrong type of route, redirect to correct portal
    const redirectPath = getRedirectPath(user.userType || 'INTERNAL');
    return <Navigate to={redirectPath} replace />;
  }

  // Render appropriate layout based on route and user type
  if (isClientPath && user.userType === 'CLIENT') {
    return <ClientLayout>{children}</ClientLayout>;
  } else if (isAdminPath && user.userType !== 'CLIENT') {
    return <AppLayout>{children}</AppLayout>;
  }

  // Fallback - should not normally reach here
  const fallbackPath = getRedirectPath(user.userType || 'INTERNAL');
  return <Navigate to={fallbackPath} replace />;
}