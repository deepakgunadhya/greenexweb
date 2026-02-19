export type Permission =
  | "users:read"
  | "users:create"
  | "users:update"
  | "users:delete"
  | "roles:read"
  | "roles:create"
  | "roles:update"
  | "roles:delete"
  | "organizations:read"
  | "organizations:create"
  | "organizations:update"
  | "organizations:delete"
  | "leads:read"
  | "leads:create"
  | "leads:update"
  | "leads:delete"
  | "quotations:read"
  | "quotations:create"
  | "quotations:update"
  | "quotations:delete"
  | "projects:read"
  | "projects:create"
  | "projects:update"
  | "projects:delete"
  | "reports:read"
  | "reports:create"
  | "reports:update"
  | "reports:delete"
  | "system:read"
  | "system:update"
  | "analytics:read"
  | "exports:create"
  | "services:read"
  | "services:create"
  | "services:update"
  | "services:delete"
  | "tasks:read"
  | "tasks:read-all"
  | "tasks:create"
  | "tasks:update"
  | "tasks:delete"
  | "tasks:assign"
  | "tasks:manage-locks"
  | "checklists:read"
  | "checklists:create"
  | "checklists:update"
  | "checklists:delete"
  | "checklists:verify"
  | "checklists:submit"
  | "checklists:review"
  | "comments:read"
  | "comments:create"
  | "comments:update"
  | "comments:delete"
  | "payments:read"
  | "payments:create"
  | "payments:update"
  | "payments:delete"
  | "cms:read"
  | "cms:create"
  | "cms:update"
  | "cms:delete"
  | "notifications:read"
  | "notifications:create"
  | "meetings:read"
  | "meetings:create"
  | "meetings:update"
  | "meetings:delete"
  | "chat-module:access";

export const checkPermission = (
  userPermissions: string[] = [],
  requiredPermissions: string[] = [],
  requireAll: boolean = false
): boolean => {
  if (!requiredPermissions.length) return true;

  if (requireAll) {
    return requiredPermissions.every((permission) =>
      userPermissions.includes(permission)
    );
  }

  return requiredPermissions.some((permission) =>
    userPermissions.includes(permission)
  );
};

/**
 * Dashboard Widget Permission Configuration
 * Maps widget IDs to their required permissions
 */
export interface WidgetPermissionConfig {
  id: string;
  permissions: string[];
  requireAll?: boolean;
}

export const WIDGET_PERMISSIONS: WidgetPermissionConfig[] = [
  { id: 'my-tasks', permissions: ['tasks:read'] },
  { id: 'activity-feed', permissions: [] }, // Dynamic visibility
  { id: 'upcoming-meetings', permissions: ['meetings:read'] },
  { id: 'quick-actions', permissions: [] }, // Dynamic visibility
  { id: 'projects-stats', permissions: ['projects:read'] },
  { id: 'tasks-stats', permissions: ['tasks:read'] },
  { id: 'leads-stats', permissions: ['leads:read'] },
  { id: 'quotations-stats', permissions: ['quotations:read'] },
  { id: 'organizations-stats', permissions: ['organizations:read'] },
  { id: 'projects-status-chart', permissions: ['projects:read'] },
  { id: 'tasks-sla-chart', permissions: ['tasks:read'] },
  { id: 'leads-funnel-chart', permissions: ['leads:read'] },
  { id: 'users-stats', permissions: ['users:read'] },
  { id: 'cms-stats', permissions: ['cms:read'] },
];

/**
 * Check if a widget should be visible based on user permissions
 */
export const isWidgetVisible = (
  widgetId: string,
  userPermissions: string[]
): boolean => {
  const widgetConfig = WIDGET_PERMISSIONS.find((w) => w.id === widgetId);

  if (!widgetConfig) return false;

  // Widgets with no permissions are always visible (they filter internally)
  if (widgetConfig.permissions.length === 0) return true;

  return checkPermission(
    userPermissions,
    widgetConfig.permissions,
    widgetConfig.requireAll
  );
};

/**
 * Get all visible widget IDs based on user permissions
 */
export const getVisibleWidgetIds = (userPermissions: string[]): string[] => {
  return WIDGET_PERMISSIONS.filter((widget) =>
    isWidgetVisible(widget.id, userPermissions)
  ).map((widget) => widget.id);
};

/**
 * Dashboard permission groups
 * Used to check if user has access to dashboard modules
 */
export const DASHBOARD_PERMISSION_GROUPS = {
  crm: ['leads:read', 'organizations:read'],
  sales: ['quotations:read'],
  projects: ['projects:read', 'tasks:read'],
  operations: ['checklists:read', 'tasks:read'],
  finance: ['payments:read'],
  cms: ['cms:read'],
  admin: ['users:read', 'roles:read', 'system:read'],
} as const;

/**
 * Check if user has access to a dashboard module group
 */
export const hasDashboardAccess = (
  group: keyof typeof DASHBOARD_PERMISSION_GROUPS,
  userPermissions: string[]
): boolean => {
  const groupPermissions = DASHBOARD_PERMISSION_GROUPS[group];
  return groupPermissions.some((p) => userPermissions.includes(p));
};