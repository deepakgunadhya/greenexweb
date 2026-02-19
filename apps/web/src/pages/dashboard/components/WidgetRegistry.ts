/**
 * Widget Registry
 * Centralized widget configuration with permission mappings
 * Widgets are displayed based on user permissions
 */

import type { WidgetConfig, WidgetType, DashboardStats, DashboardWidgetDefinition } from '../../../types/dashboard';

// Widget registry with permission mappings
export const WIDGET_REGISTRY: WidgetConfig[] = [
  // Priority 1: Personal widgets (always shown to authenticated users)
  {
    id: 'my-tasks',
    type: 'list',
    title: 'My Tasks',
    permissions: ['tasks:read'],
    gridSpan: { cols: 4 },
    dataKey: 'tasks',
    priority: 1,
  },
  {
    id: 'activity-feed',
    type: 'feed',
    title: 'Recent Activity',
    permissions: [], // Dynamic - shows activities for permitted modules
    gridSpan: { cols: 8 },
    priority: 2,
  },
  {
    id: 'upcoming-meetings',
    type: 'list',
    title: 'Upcoming Meetings',
    permissions: ['meetings:read'],
    gridSpan: { cols: 4 },
    dataKey: 'meetings',
    priority: 3,
  },
  {
    id: 'quick-actions',
    type: 'actions',
    title: 'Quick Actions',
    permissions: [], // Dynamic - shows actions for permitted modules
    gridSpan: { cols: 4 },
    priority: 4,
  },

  // Priority 5-15: Stats cards (ordered by business importance)
  {
    id: 'projects-stats',
    type: 'stats',
    title: 'Projects',
    permissions: ['projects:read'],
    gridSpan: { cols: 3 },
    dataKey: 'projects',
    priority: 5,
  },
  {
    id: 'tasks-stats',
    type: 'stats',
    title: 'Tasks',
    permissions: ['tasks:read'],
    gridSpan: { cols: 3 },
    dataKey: 'tasks',
    priority: 8,
  },
  {
    id: 'leads-stats',
    type: 'stats',
    title: 'Leads',
    permissions: ['leads:read'],
    gridSpan: { cols: 3 },
    dataKey: 'leads',
    priority: 10,
  },
  {
    id: 'quotations-stats',
    type: 'stats',
    title: 'Quotations',
    permissions: ['quotations:read'],
    gridSpan: { cols: 3 },
    dataKey: 'quotations',
    priority: 12,
  },
  {
    id: 'organizations-stats',
    type: 'stats',
    title: 'Organizations',
    permissions: ['organizations:read'],
    gridSpan: { cols: 3 },
    dataKey: 'organizations',
    priority: 15,
  },

  // Priority 20-40: Charts (visual analytics)
  {
    id: 'projects-status-chart',
    type: 'chart',
    title: 'Projects by Status',
    permissions: ['projects:read'],
    gridSpan: { cols: 6 },
    dataKey: 'projects',
    priority: 25,
  },
  {
    id: 'tasks-sla-chart',
    type: 'chart',
    title: 'Tasks SLA Overview',
    permissions: ['tasks:read'],
    gridSpan: { cols: 6 },
    dataKey: 'tasks',
    priority: 30,
  },
  {
    id: 'leads-funnel-chart',
    type: 'chart',
    title: 'Leads Funnel',
    permissions: ['leads:read'],
    gridSpan: { cols: 6 },
    dataKey: 'leads',
    priority: 35,
  },

  // Priority 45-55: Secondary stats
  {
    id: 'users-stats',
    type: 'stats',
    title: 'Users',
    permissions: ['users:read'],
    gridSpan: { cols: 3 },
    dataKey: 'users',
    priority: 45,
  },
  {
    id: 'cms-stats',
    type: 'stats',
    title: 'CMS Content',
    permissions: ['cms:read'],
    gridSpan: { cols: 3 },
    dataKey: 'cms',
    priority: 50,
  },
];

/**
 * Get visible widgets based on user permissions
 * @param userPermissions - Array of permission strings the user has
 * @returns Filtered and sorted array of widget configs
 */
export function getVisibleWidgets(userPermissions: string[]): WidgetConfig[] {
  return WIDGET_REGISTRY.filter((widget) => {
    // Widgets with no permissions are always visible (they filter internally)
    if (widget.permissions.length === 0) {
      return true;
    }

    // Check if user has required permissions
    if (widget.requireAll) {
      // All permissions required
      return widget.permissions.every((p) => userPermissions.includes(p));
    }

    // Any permission is sufficient
    return widget.permissions.some((p) => userPermissions.includes(p));
  }).sort((a, b) => a.priority - b.priority);
}

/**
 * Get widget by ID
 */
export function getWidgetById(id: string): WidgetConfig | undefined {
  return WIDGET_REGISTRY.find((widget) => widget.id === id);
}

/**
 * Get widgets by type
 */
export function getWidgetsByType(type: WidgetType): WidgetConfig[] {
  return WIDGET_REGISTRY.filter((widget) => widget.type === type);
}

/**
 * Quick Actions configuration with permission mappings
 */
export interface QuickActionConfig {
  id: string;
  label: string;
  path: string;
  icon: string;
  permissions: string[];
}

export const QUICK_ACTIONS: QuickActionConfig[] = [
  {
    id: 'add-lead',
    label: 'Add Lead',
    path: '/leads/create',
    icon: 'UserPlus',
    permissions: ['leads:create'],
  },
  {
    id: 'create-project',
    label: 'Create Project',
    path: '/projects/create',
    icon: 'FolderPlus',
    permissions: ['projects:create'],
  },
  {
    id: 'new-quotation',
    label: 'New Quotation',
    path: '/quotations/create',
    icon: 'FileText',
    permissions: ['quotations:create'],
  },
  {
    id: 'schedule-meeting',
    label: 'Schedule Meeting',
    path: '/meetings/schedule',
    icon: 'Calendar',
    permissions: ['meetings:create'],
  },
  {
    id: 'create-task',
    label: 'Create Task',
    path: '/tasks/create',
    icon: 'CheckSquare',
    permissions: ['tasks:create'],
  },
  {
    id: 'create-content',
    label: 'Create Content',
    path: '/cms/content/create',
    icon: 'Edit',
    permissions: ['cms:create'],
  },
  {
    id: 'add-user',
    label: 'Add User',
    path: '/users/create',
    icon: 'UserCog',
    permissions: ['users:create'],
  },
];

/**
 * Get visible quick actions based on user permissions
 */
export function getVisibleQuickActions(userPermissions: string[]): QuickActionConfig[] {
  return QUICK_ACTIONS.filter((action) =>
    action.permissions.some((p) => userPermissions.includes(p))
  );
}

/**
 * Get grid column class based on widget grid span
 */
export function getGridColClass(cols: number): string {
  const colClasses: Record<number, string> = {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
    5: 'col-span-5',
    6: 'col-span-6',
    7: 'col-span-7',
    8: 'col-span-8',
    9: 'col-span-9',
    10: 'col-span-10',
    11: 'col-span-11',
    12: 'col-span-12',
  };
  return colClasses[cols] || 'col-span-3';
}

/**
 * Widget data key to stats mapping
 */
export type WidgetDataKey = keyof DashboardStats;

/**
 * Canonical widget definitions matching the 10 rendered sections in DynamicDashboard.
 * These IDs are stored in user preferences as hiddenWidgets.
 */
export const DASHBOARD_WIDGET_DEFINITIONS: DashboardWidgetDefinition[] = [
  {
    id: 'overview-stats',
    label: 'Overview Statistics',
    description: 'Key metrics: projects, tasks, leads, quotations',
    permissions: ['projects:read', 'tasks:read', 'leads:read', 'quotations:read'],
    requireAll: false,
    category: 'overview',
  },
  {
    id: 'revenue-overview',
    label: 'Revenue Overview',
    description: 'Revenue chart with total, pending, and monthly trend',
    permissions: ['quotations:read'],
    category: 'analytics',
  },
  {
    id: 'projects-analytics',
    label: 'Projects Analytics',
    description: 'Project status chart, timeline health, and trends',
    permissions: ['projects:read'],
    category: 'analytics',
  },
  {
    id: 'tasks-analytics',
    label: 'Tasks Analytics',
    description: 'Task status, SLA, and priority breakdown',
    permissions: ['tasks:read'],
    category: 'analytics',
  },
  {
    id: 'leads-analytics',
    label: 'Leads & Conversion',
    description: 'Sales funnel and lead generation trends',
    permissions: ['leads:read'],
    category: 'analytics',
  },
  {
    id: 'my-tasks',
    label: 'My Tasks',
    description: 'Your pending tasks list',
    permissions: ['tasks:read'],
    category: 'personal',
  },
  {
    id: 'activity-feed',
    label: 'Recent Activity',
    description: 'Latest system activity feed',
    permissions: [],
    category: 'personal',
  },
  {
    id: 'organizations-stats',
    label: 'Organizations',
    description: 'Organization totals by type',
    permissions: ['organizations:read'],
    category: 'secondary',
  },
  {
    id: 'users-stats',
    label: 'Users',
    description: 'User totals and activity',
    permissions: ['users:read'],
    category: 'secondary',
  },
  {
    id: 'cms-stats',
    label: 'CMS Content',
    description: 'Content publishing status',
    permissions: ['cms:read'],
    category: 'secondary',
  },
];

/**
 * Get widgets the user has permission to see (for the settings panel).
 */
export function getPermittedWidgetDefinitions(
  userPermissions: string[]
): DashboardWidgetDefinition[] {
  return DASHBOARD_WIDGET_DEFINITIONS.filter((widget) => {
    if (widget.permissions.length === 0) return true;
    if (widget.requireAll) {
      return widget.permissions.every((p) => userPermissions.includes(p));
    }
    return widget.permissions.some((p) => userPermissions.includes(p));
  });
}

/**
 * Check if a widget should be visible based on permissions + user preferences.
 */
export function isWidgetVisible(
  widgetId: string,
  userPermissions: string[],
  hiddenWidgets: string[]
): boolean {
  if (hiddenWidgets.includes(widgetId)) return false;

  const def = DASHBOARD_WIDGET_DEFINITIONS.find((w) => w.id === widgetId);
  if (!def) return false;
  if (def.permissions.length === 0) return true;
  if (def.requireAll) {
    return def.permissions.every((p) => userPermissions.includes(p));
  }
  return def.permissions.some((p) => userPermissions.includes(p));
}
