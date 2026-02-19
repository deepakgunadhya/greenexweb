import React from 'react';
import { useAuthStore } from '../../stores/auth-store';
import { checkPermission } from '../../utils/permissions';

interface PermissionGateProps {
  requiredPermissions: string[];
  requireAll?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  requiredPermissions,
  requireAll = false,
  children,
  fallback = null,
}) => {
  const user = useAuthStore((state) => state.user);
  const userPermissions = user?.permissions || [];

  const hasPermission = checkPermission(userPermissions, requiredPermissions, requireAll);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGate;