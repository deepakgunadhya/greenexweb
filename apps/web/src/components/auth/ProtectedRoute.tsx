import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { checkPermission } from "@/utils/permissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requireAll?: boolean;
}

export function ProtectedRoute({
  children,
  requiredPermissions = [],
  requireAll = false,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (requiredPermissions.length > 0) {
    const hasPermission = checkPermission(
      user.permissions || [],
      requiredPermissions,
      requireAll
    );

    if (!hasPermission) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}