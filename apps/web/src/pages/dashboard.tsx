/**
 * Dashboard Page
 * Enterprise-level dynamic dashboard with permission-based widgets
 */

import { DynamicDashboard } from './dashboard/components/DynamicDashboard';
import { useAuth } from '../hooks/use-auth';

/**
 * Dashboard Page Component
 * Renders the dynamic dashboard based on user permissions
 */
export function DashboardPage() {
  const { user, isLoading } = useAuth();

  // Show loading state while auth is loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Get user permissions (default to empty array if not available)
  const userPermissions = user?.permissions || [];

  return (
    <div className="p-6">
      <DynamicDashboard userPermissions={userPermissions} />
    </div>
  );
}

export default DashboardPage;
