/**
 * Dashboard Module Types
 * Enterprise-level dashboard with permission-based data access
 */

// Request types
export interface DashboardStatsRequest {
  userId: string;
  permissions: string[];
  organizationId?: string; // For client portal data isolation
  userType?: string; // INTERNAL or CLIENT
}

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

// Payment Statistics (derived from Projects and Quotations)
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
  dueDate?: Date;
  paidDate?: Date;
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
  createdAt: Date;
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
  dueDate?: Date;
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
  startTime: Date;
  endTime?: Date;
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
  timestamp: Date;
  user?: {
    id: string;
    name: string;
  };
  metadata?: Record<string, any>;
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
  startTime: Date;
  endTime?: Date;
  type: string;
  status: string;
}

export interface ClientActivityItem {
  id: string;
  type: 'project' | 'quotation' | 'submission' | 'meeting' | 'report';
  action: string;
  title: string;
  description: string;
  timestamp: Date;
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

// Quick Actions Types
export interface QuickAction {
  id: string;
  label: string;
  path: string;
  icon: string;
  permissions: string[];
}

// Widget Configuration Types (for reference)
export interface WidgetConfig {
  id: string;
  type: 'stats' | 'chart' | 'list' | 'actions' | 'feed';
  title: string;
  permissions: string[];
  requireAll?: boolean;
  dataKey?: string;
  priority: number;
}

// Dashboard Widget Preferences
export interface DashboardPreferences {
  hiddenWidgets: string[];
}
