import { ReactNode } from "react";
import { useAuth } from "../../hooks/use-auth";
import { checkPermission } from "../../utils/permissions";

interface PermissionGateProps {
  children: ReactNode;
  requiredPermissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
}

export function PermissionGate({
  children,
  requiredPermissions = [],
  requireAll = false,
  fallback = null,
}: PermissionGateProps) {
  const { user } = useAuth();

  // If no permissions required, render children
  if (!requiredPermissions.length) {
    return <>{children}</>;
  }

  // Check permissions
  const hasPermission = checkPermission(
    user?.permissions || [],
    requiredPermissions,
    requireAll
  );

  // If user has permission, render children, otherwise render fallback
  return hasPermission ? <>{children}</> : <>{fallback}</>;
}
