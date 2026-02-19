/**
 * Utility functions for client/admin route management and layout selection
 */

// Check if the current path is a client route
export function isClientRoute(pathname: string): boolean {
  return pathname.startsWith('/client');
}

// Check if the current path is an admin route
export function isAdminRoute(pathname: string): boolean {
  // Admin routes are everything that's not client routes or public routes
  const publicRoutes = ['/login', '/client/login', '/', '/register', '/forgot-password'];
  return !isClientRoute(pathname) && !publicRoutes.includes(pathname);
}

// Get the appropriate redirect path based on user type
export function getRedirectPath(userType: 'CLIENT' | 'INTERNAL', currentPath?: string): string {
  if (userType === 'CLIENT') {
    // Client users should always go to client routes
    if (currentPath && isClientRoute(currentPath)) {
      return currentPath;
    }
    return '/client/dashboard';
  } else {
    // Internal users should go to admin routes
    if (currentPath && isAdminRoute(currentPath)) {
      return currentPath;
    }
    return '/dashboard';
  }
}

// Get the appropriate login path based on current route
export function getLoginPath(currentPath: string): string {
  if (isClientRoute(currentPath)) {
    return '/client/login';
  }
  return '/login';
}

// Validate user access to a route
export function canUserAccessRoute(userType: 'CLIENT' | 'INTERNAL', pathname: string): boolean {
  if (userType === 'CLIENT') {
    // Client users can only access client routes
    return isClientRoute(pathname);
  } else {
    // Internal users can only access admin routes
    return isAdminRoute(pathname);
  }
}

// Extract base route from client route
export function getClientBaseRoute(pathname: string): string {
  if (!isClientRoute(pathname)) return pathname;
  
  const segments = pathname.split('/');
  // /client/quotations/123 -> quotations
  // /client/dashboard -> dashboard
  return segments[2] || 'dashboard';
}

// Client route mappings for navigation
export const CLIENT_ROUTES = {
  DASHBOARD: '/client/dashboard',
  PROJECTS: '/client/projects',
  QUOTATIONS: '/client/quotations',
  MEETINGS: '/client/meetings',
  REPORTS: '/client/reports',
  SUPPORT: '/client/support',
  LOGIN: '/client/login',
} as const;

// Admin route mappings for navigation
export const ADMIN_ROUTES = {
  DASHBOARD: '/dashboard',
  LEADS: '/leads',
  ORGANIZATIONS: '/organizations',
  PROJECTS: '/projects',
  QUOTATIONS: '/quotations',
  REPORTS: '/reports',
  CMS: '/cms',
  USERS: '/users',
  ROLES: '/roles',
  MEETINGS: '/meeting',
  LOGIN: '/login',
} as const;

// Get navigation routes based on user type
export function getNavigationRoutes(userType: 'CLIENT' | 'INTERNAL') {
  return userType === 'CLIENT' ? CLIENT_ROUTES : ADMIN_ROUTES;
}

// Check if a route requires specific permissions
export function routeRequiresPermissions(pathname: string): boolean {
  // Client routes don't require specific permissions (handled by client access)
  if (isClientRoute(pathname)) {
    return false;
  }
  
  // Admin routes may require specific permissions
  const noPermissionRoutes = ['/dashboard', '/login'];
  return !noPermissionRoutes.includes(pathname);
}

// Get breadcrumb data for client routes
export function getClientBreadcrumbs(pathname: string): Array<{name: string, href: string}> {
  if (!isClientRoute(pathname)) return [];
  
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = [{ name: 'Dashboard', href: '/client/dashboard' }];
  
  if (segments.length > 2) {
    const baseRoute = segments[2];
    const routeNames: Record<string, string> = {
      'projects': 'My Projects',
      'quotations': 'Quotations',
      'meetings': 'Meetings',
      'reports': 'Reports & Documents',
      'support': 'Support',
    };
    
    if (routeNames[baseRoute]) {
      breadcrumbs.push({
        name: routeNames[baseRoute],
        href: `/client/${baseRoute}`,
      });
    }
    
    // Add specific item if there's an ID
    if (segments.length > 3) {
      breadcrumbs.push({
        name: 'Details',
        href: pathname,
      });
    }
  }
  
  return breadcrumbs;
}

// Storage keys for different user types
export const STORAGE_KEYS = {
  CLIENT_ACCESS_TOKEN: 'client_access_token',
  CLIENT_REFRESH_TOKEN: 'client_refresh_token',
  ADMIN_ACCESS_TOKEN: 'access_token',
  ADMIN_REFRESH_TOKEN: 'refresh_token',
} as const;

// Get appropriate storage keys based on user type
export function getStorageKeys(userType: 'CLIENT' | 'INTERNAL') {
  if (userType === 'CLIENT') {
    return {
      accessToken: STORAGE_KEYS.CLIENT_ACCESS_TOKEN,
      refreshToken: STORAGE_KEYS.CLIENT_REFRESH_TOKEN,
    };
  }
  return {
    accessToken: STORAGE_KEYS.ADMIN_ACCESS_TOKEN,
    refreshToken: STORAGE_KEYS.ADMIN_REFRESH_TOKEN,
  };
}