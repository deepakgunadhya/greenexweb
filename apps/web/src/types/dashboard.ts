/**
 * Dashboard Types
 * Enterprise-level dashboard type definitions
 */

// Stats Response Types
export interface DashboardStats {
  leads?: LeadStats;
  organizations?: OrganizationStats;
  projects?: ProjectStats;
  tasks?: TaskStats;
  quotations?: QuotationStats;
  meetings?: MeetingStats;
  cms?: CMSStats;
  users?: UserStats;
  payments?: PaymentStats;
  monthlyTrends?: MonthlyTrends;
}

// Payment Statistics
export interface PaymentStats {
  totalRevenue: number;
  pendingPayments: number;
  receivedThisMonth: number;
  overdueAmount: number;
  byStatus: {
    pending: number;
    partial: number;
    paid: number;
    overdue: number;
  };
  recentPayments: PaymentSummary[];
  monthlyRevenue: MonthlyDataPoint[];
}

export interface PaymentSummary {
  id: string;
  amount: number;
  status: string;
  dueDate?: string;
  paidDate?: string;
  projectName?: string;
  organizationName?: string;
}

// Monthly Trends for Analytics
export interface MonthlyTrends {
  projects: MonthlyDataPoint[];
  quotations: MonthlyDataPoint[];
  leads: MonthlyDataPoint[];
  tasks: MonthlyDataPoint[];
  revenue: MonthlyDataPoint[];
}

export interface MonthlyDataPoint {
  month: string;
  value: number;
  previousValue?: number;
  change?: number;
}

export interface LeadStats {
  total: number;
  byStatus: {
    new: number;
    inProgress: number;
    closed: number;
  };
  conversionRate: number;
  thisMonth: number;
  recentLeads: LeadSummary[];
}

export interface LeadSummary {
  id: string;
  title: string;
  status: string;
  organizationName?: string;
  createdAt: string;
}

export interface OrganizationStats {
  total: number;
  byType: {
    prospect: number;
    client: number;
    partner: number;
  };
  thisMonth: number;
}

export interface ProjectStats {
  total: number;
  byStatus: Record<string, number>;
  timeline: {
    onTrack: number;
    atRisk: number;
    overdue: number;
  };
  completedThisMonth: number;
  activeProjects: number;
}

export interface TaskStats {
  total: number;
  myTasks: number;
  byStatus: {
    to_do: number;
    doing: number;
    blocked: number;
    done: number;
  };
  bySla: {
    on_track: number;
    due_today: number;
    overdue: number;
  };
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface TaskSummary {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  projectName?: string;
}

export interface QuotationStats {
  total: number;
  byStatus: Record<string, number>;
  totalValue: number;
  pendingValue: number;
  acceptedValue: number;
  thisMonth: number;
}

export interface MeetingStats {
  upcoming: number;
  scheduledToday: number;
  completedThisWeek: number;
  upcomingMeetings: MeetingSummary[];
}

export interface MeetingSummary {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  type: string;
  status: string;
  participants?: number;
}

export interface CMSStats {
  totalContent: number;
  published: number;
  draft: number;
  byType: Record<string, number>;
}

export interface UserStats {
  total: number;
  active: number;
  byType: {
    internal: number;
    client: number;
  };
  newThisMonth: number;
}

// Activity Feed Types
export interface ActivityItem {
  id: string;
  type: 'lead' | 'project' | 'quotation' | 'task' | 'meeting' | 'content' | 'user';
  action: string;
  title: string;
  description: string;
  timestamp: string;
  user?: {
    id: string;
    name: string;
  };
  metadata?: Record<string, unknown>;
}

// Client Portal Dashboard Types
export interface ClientDashboardStats {
  projects: ClientProjectStats;
  quotations: ClientQuotationStats;
  submissions: ClientSubmissionStats;
  monthlyTrends?: ClientMonthlyTrends;
  upcomingMeetings?: ClientMeetingSummary[];
  recentActivity?: ClientActivityItem[];
}

export interface ClientMonthlyTrends {
  projects: MonthlyDataPoint[];
  quotations: MonthlyDataPoint[];
  submissions: MonthlyDataPoint[];
}

export interface ClientMeetingSummary {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  type: string;
  status: string;
}

export interface ClientActivityItem {
  id: string;
  type: 'project' | 'quotation' | 'submission' | 'meeting' | 'report';
  action: string;
  title: string;
  description: string;
  timestamp: string;
}

export interface ClientProjectStats {
  total: number;
  inProgress: number;
  completed: number;
  inReview: number;
  recentProjects: {
    id: string;
    name: string;
    status: string;
    progress?: number;
  }[];
}

export interface ClientQuotationStats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  totalValue: number;
}

export interface ClientSubmissionStats {
  total: number;
  pending: number;
  approved: number;
  needsRevision: number;
}

// Widget Configuration Types
export type WidgetType = 'stats' | 'chart' | 'list' | 'actions' | 'feed';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  permissions: string[];
  requireAll?: boolean;
  gridSpan: { cols: number };
  dataKey?: keyof DashboardStats;
  priority: number;
}

export interface WidgetProps {
  data?: unknown;
  loading: boolean;
  error: string | null;
  onAction?: (action: string, params?: Record<string, unknown>) => void;
}

// Quick Actions Types
export interface QuickAction {
  id: string;
  label: string;
  path: string;
  icon: string;
  permissions: string[];
}

// API Response Types
export interface DashboardStatsResponse {
  success: boolean;
  data: DashboardStats;
}

export interface ActivitiesResponse {
  success: boolean;
  data: ActivityItem[];
}

export interface MyTasksResponse {
  success: boolean;
  data: TaskSummary[];
}

export interface MyMeetingsResponse {
  success: boolean;
  data: MeetingSummary[];
}

export interface ClientDashboardResponse {
  success: boolean;
  data: ClientDashboardStats;
}

// Dashboard Widget Preferences
export interface DashboardPreferences {
  hiddenWidgets: string[];
}

// Dashboard widget definition for settings UI
export interface DashboardWidgetDefinition {
  id: string;
  label: string;
  description: string;
  permissions: string[];
  requireAll?: boolean;
  category: 'overview' | 'analytics' | 'personal' | 'secondary';
}
