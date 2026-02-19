/**
 * Dynamic Dashboard Component
 * Enterprise-level analytics dashboard with permission-based widgets
 * Enhanced with charts, graphs, and detailed metrics
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store';
import {
  fetchDashboardStats,
  fetchDashboardActivities,
  fetchMyTasks,
  fetchMyMeetings,
  fetchWidgetPreferences,
  selectDashboardStats,
  selectDashboardActivities,
  selectMyTasks,
  selectDashboardLoading,
  selectActivitiesLoading,
  selectMyTasksLoading,
  selectDashboardError,
  selectLastUpdated,
  selectWidgetPreferences,
  selectPreferencesLoaded,
} from '../../../store/slices/dashboardSlice';
import { MyTasksWidget } from './widgets/MyTasksWidget';
import { ActivityFeed } from './widgets/ActivityFeed';
import { DashboardSettings } from './DashboardSettings';
import { isWidgetVisible } from './WidgetRegistry';
import type { DashboardStats, MonthlyDataPoint } from '../../../types/dashboard';

interface DynamicDashboardProps {
  userPermissions: string[];
}

/**
 * Format currency values
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}


/**
 * Format large numbers with K/M suffixes
 */
function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Overview Stat Card Component
 */
function OverviewStatCard({
  title,
  value,
  change,
  icon,
  iconBg,
  link,
}: {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  iconBg: string;
  link?: string;
}) {
  const content = (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {typeof change === 'number' && (
            <p className={`text-sm mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '+' : ''}{change}% from last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconBg}`}>{icon}</div>
      </div>
    </div>
  );

  if (link) {
    return <Link to={link} className="block">{content}</Link>;
  }
  return content;
}

/**
 * Line Chart Component for Monthly Trends
 */
function LineChart({
  data,
  title,
  color = 'primary',
  valuePrefix = '',
  valueSuffix = '',
}: {
  data: MonthlyDataPoint[];
  title: string;
  color?: 'primary' | 'blue' | 'green' | 'amber' | 'purple';
  valuePrefix?: string;
  valueSuffix?: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const colorClasses = {
    primary: { line: 'stroke-primary-500', fill: 'fill-primary-500/10', dot: 'bg-primary-500' },
    blue: { line: 'stroke-blue-500', fill: 'fill-blue-500/10', dot: 'bg-blue-500' },
    green: { line: 'stroke-green-500', fill: 'fill-green-500/10', dot: 'bg-green-500' },
    amber: { line: 'stroke-amber-500', fill: 'fill-amber-500/10', dot: 'bg-amber-500' },
    purple: { line: 'stroke-purple-500', fill: 'fill-purple-500/10', dot: 'bg-purple-500' },
  };
  const colors = colorClasses[color];

  // Create SVG path
  const width = 100;
  const height = 40;
  const padding = 2;
  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1)) * (width - padding * 2),
    y: height - padding - (d.value / maxValue) * (height - padding * 2),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-700 mb-3">{title}</h4>
      <div className="relative h-32">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
          <path d={areaPath} className={colors.fill} />
          <path d={linePath} className={`${colors.line} fill-none`} strokeWidth="0.8" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="1" className={colors.fill} />
          ))}
        </svg>
      </div>
      <div className="flex justify-between mt-2 text-xs text-slate-500">
        {data.map((d, i) => (
          <span key={i} className="text-center">
            <span className="block font-medium text-slate-700">
              {valuePrefix}{formatNumber(d.value)}{valueSuffix}
            </span>
            <span>{d.month}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Bar Chart Component
 */
function BarChart({
  data,
  title,
}: {
  data: { label: string; value: number; color: string }[];
  title: string;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-700 mb-4">{title}</h4>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600">{item.label}</span>
              <span className="font-medium text-slate-700">{item.value}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${item.color}`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Donut Chart Component
 */
function DonutChart({
  data,
  title,
  centerValue,
  centerLabel,
}: {
  data: { label: string; value: number; color: string }[];
  title: string;
  centerValue: string | number;
  centerLabel: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        No data available
      </div>
    );
  }

  let cumulativePercent = 0;
  const segments = data.map((item) => {
    const percent = (item.value / total) * 100;
    const segment = { ...item, percent, startOffset: cumulativePercent };
    cumulativePercent += percent;
    return segment;
  });

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-700 mb-4">{title}</h4>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-24 h-24 transform -rotate-90">
            {segments.map((seg, i) => (
              <circle
                key={i}
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke={seg.color.replace('bg-', '#').replace('-500', '')}
                className={seg.color.replace('bg-', 'stroke-')}
                strokeWidth="4"
                strokeDasharray={`${seg.percent} ${100 - seg.percent}`}
                strokeDashoffset={`-${seg.startOffset}`}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-slate-700">{centerValue}</span>
            <span className="text-xs text-slate-500">{centerLabel}</span>
          </div>
        </div>
        <div className="space-y-2">
          {data.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${item.color}`} />
              <span className="text-sm text-slate-600">{item.label}: {item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Revenue Chart Card
 */
function RevenueChartCard({ stats }: { stats: DashboardStats }) {
  const payments = stats.payments;
  const trends = stats.monthlyTrends;

  if (!payments && !stats.quotations) {
    return null;
  }

  const totalRevenue = payments?.totalRevenue ?? stats.quotations?.acceptedValue ?? 0;
  const pendingAmount = payments?.pendingPayments ?? stats.quotations?.pendingValue ?? 0;
  const thisMonthRevenue = payments?.receivedThisMonth ?? 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Revenue Overview</h3>
        <Link to="/quotations" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View Details
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Total Revenue</p>
          <p className="text-xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-4">
          <p className="text-sm text-amber-600 font-medium">Pending</p>
          <p className="text-xl font-bold text-amber-700">{formatCurrency(pendingAmount)}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">This Month</p>
          <p className="text-xl font-bold text-blue-700">
            {formatCurrency(thisMonthRevenue)}
          </p>
        </div>
      </div>

      {trends?.revenue && trends.revenue.length > 0 && (
        <LineChart
          data={trends.revenue}
          title="Monthly Revenue Trend"
          color="green"
          valuePrefix="$"
        />
      )}
    </div>
  );
}

/**
 * Projects Analytics Card
 */
function ProjectsAnalyticsCard({ stats }: { stats: DashboardStats }) {
  const projects = stats.projects;
  const trends = stats.monthlyTrends;

  if (!projects) return null;

  const statusData = Object.entries(projects.byStatus)
    .slice(0, 5)
    .map(([status, value]) => ({
      label: status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
      value,
      color: status === 'COMPLETED' ? 'bg-green-500' :
             status === 'IN_PROGRESS' ? 'bg-blue-500' :
             status === 'PLANNED' ? 'bg-slate-400' :
             status === 'CLIENT_REVIEW' ? 'bg-cyan-500' : 'bg-amber-500',
    }));

  const timelineData = [
    { label: 'On Track', value: projects.timeline.onTrack, color: 'bg-green-500' },
    { label: 'At Risk', value: projects.timeline.atRisk, color: 'bg-amber-500' },
    { label: 'Overdue', value: projects.timeline.overdue, color: 'bg-red-500' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Projects Analytics</h3>
        <Link to="/projects" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View All
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">{projects.total}</p>
          <p className="text-xs text-slate-500">Total</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{projects.activeProjects}</p>
          <p className="text-xs text-slate-500">Active</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{projects.completedThisMonth}</p>
          <p className="text-xs text-slate-500">Completed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600">{projects.timeline.overdue}</p>
          <p className="text-xs text-slate-500">Overdue</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <BarChart data={statusData} title="By Status" />
        <DonutChart
          data={timelineData}
          title="Timeline Health"
          centerValue={projects.activeProjects}
          centerLabel="Active"
        />
      </div>

      {trends?.projects && trends.projects.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-100">
          <LineChart
            data={trends.projects}
            title="Projects Created (6 Months)"
            color="blue"
          />
        </div>
      )}
    </div>
  );
}

/**
 * Tasks Analytics Card
 */
function TasksAnalyticsCard({ stats }: { stats: DashboardStats }) {
  const tasks = stats.tasks;
  const trends = stats.monthlyTrends;

  if (!tasks) return null;

  const statusData = [
    { label: 'To Do', value: tasks.byStatus.to_do, color: 'bg-slate-400' },
    { label: 'Doing', value: tasks.byStatus.doing, color: 'bg-blue-500' },
    { label: 'Blocked', value: tasks.byStatus.blocked, color: 'bg-red-500' },
    { label: 'Done', value: tasks.byStatus.done, color: 'bg-green-500' },
  ];

  const slaData = [
    { label: 'On Track', value: tasks.bySla.on_track, color: 'bg-green-500' },
    { label: 'Due Today', value: tasks.bySla.due_today, color: 'bg-amber-500' },
    { label: 'Overdue', value: tasks.bySla.overdue, color: 'bg-red-500' },
  ];

  const priorityData = [
    { label: 'High', value: tasks.byPriority.high, color: 'bg-red-500' },
    { label: 'Medium', value: tasks.byPriority.medium, color: 'bg-amber-500' },
    { label: 'Low', value: tasks.byPriority.low, color: 'bg-green-500' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Tasks Analytics</h3>
        <Link to="/tasks" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View All
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">{tasks.total}</p>
          <p className="text-xs text-slate-500">Total</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-primary-600">{tasks.myTasks}</p>
          <p className="text-xs text-slate-500">My Tasks</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{tasks.byStatus.done}</p>
          <p className="text-xs text-slate-500">Completed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600">{tasks.byPriority.high}</p>
          <p className="text-xs text-slate-500">High Priority</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <DonutChart
          data={statusData}
          title="By Status"
          centerValue={tasks.total - tasks.byStatus.done}
          centerLabel="Pending"
        />
        <DonutChart
          data={slaData}
          title="SLA Status"
          centerValue={Math.round((tasks.bySla.on_track / (tasks.total || 1)) * 100) + '%'}
          centerLabel="On Track"
        />
        <BarChart data={priorityData} title="By Priority" />
      </div>

      {trends?.tasks && trends.tasks.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-100">
          <LineChart
            data={trends.tasks}
            title="Tasks Completed (6 Months)"
            color="green"
          />
        </div>
      )}
    </div>
  );
}

/**
 * Leads Analytics Card
 */
function LeadsAnalyticsCard({ stats }: { stats: DashboardStats }) {
  const leads = stats.leads;
  const trends = stats.monthlyTrends;

  if (!leads) return null;

  const stages = [
    { label: 'New', value: leads.byStatus.new, color: 'bg-blue-500' },
    { label: 'In Progress', value: leads.byStatus.inProgress, color: 'bg-amber-500' },
    { label: 'Closed', value: leads.byStatus.closed, color: 'bg-green-500' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Leads & Conversion</h3>
        <Link to="/leads" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View All
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">{leads.total}</p>
          <p className="text-xs text-slate-500">Total Leads</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{leads.thisMonth}</p>
          <p className="text-xs text-slate-500">This Month</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{leads.conversionRate}%</p>
          <p className="text-xs text-slate-500">Conversion</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-amber-600">{leads.byStatus.inProgress}</p>
          <p className="text-xs text-slate-500">In Progress</p>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-slate-700 mb-4">Sales Funnel</h4>
        <div className="space-y-3">
          {stages.map((stage, index) => (
            <div key={stage.label} className="text-center">
              <div
                className={`${stage.color} h-10 rounded-lg flex items-center justify-center mx-auto transition-all`}
                style={{ width: `${100 - index * 20}%` }}
              >
                <span className="text-white font-semibold text-sm">{stage.value} {stage.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {trends?.leads && trends.leads.length > 0 && (
        <LineChart
          data={trends.leads}
          title="Leads Generated (6 Months)"
          color="blue"
        />
      )}
    </div>
  );
}

/**
 * Main Dynamic Dashboard Component
 */
export function DynamicDashboard({ userPermissions }: DynamicDashboardProps) {
  const dispatch = useAppDispatch();

  // Selectors
  const stats = useAppSelector(selectDashboardStats);
  const activities = useAppSelector(selectDashboardActivities);
  const myTasks = useAppSelector(selectMyTasks);
  const loading = useAppSelector(selectDashboardLoading);
  const activitiesLoading = useAppSelector(selectActivitiesLoading);
  const myTasksLoading = useAppSelector(selectMyTasksLoading);
  const error = useAppSelector(selectDashboardError);
  const lastUpdated = useAppSelector(selectLastUpdated);
  const widgetPreferences = useAppSelector(selectWidgetPreferences);
  const preferencesLoaded = useAppSelector(selectPreferencesLoaded);

  // Widget visibility helper: permission + user preference
  const showWidget = (widgetId: string) =>
    isWidgetVisible(widgetId, userPermissions, widgetPreferences.hiddenWidgets);

  // Check permissions
  const hasProjectsAccess = userPermissions.includes('projects:read');
  const hasTasksAccess = userPermissions.includes('tasks:read');
  const hasLeadsAccess = userPermissions.includes('leads:read');
  const hasQuotationsAccess = userPermissions.includes('quotations:read');
  const hasOrganizationsAccess = userPermissions.includes('organizations:read');
  const hasUsersAccess = userPermissions.includes('users:read');

  // Fetch widget preferences on mount (once)
  useEffect(() => {
    if (!preferencesLoaded) {
      dispatch(fetchWidgetPreferences());
    }
  }, [dispatch, preferencesLoaded]);

  // Fetch dashboard data on mount (no auto-refresh)
  useEffect(() => {
    dispatch(fetchDashboardStats());
    dispatch(fetchDashboardActivities(10));

    if (hasTasksAccess) {
      dispatch(fetchMyTasks());
    }
    if (userPermissions.includes('meetings:read')) {
      dispatch(fetchMyMeetings());
    }
  }, [dispatch, userPermissions, hasTasksAccess]);

  // Manual refresh handler
  const handleRefresh = () => {
    dispatch(fetchDashboardStats());
    dispatch(fetchDashboardActivities(10));
    if (hasTasksAccess) {
      dispatch(fetchMyTasks());
    }
    if (userPermissions.includes('meetings:read')) {
      dispatch(fetchMyMeetings());
    }
  };

  // Format last updated time
  const lastUpdatedText = lastUpdated
    ? `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}`
    : '';

  if (error && !stats) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="text-lg font-medium text-slate-800 mb-2">Failed to load dashboard</h3>
        <p className="text-slate-500 mb-4">{error}</p>
        <button onClick={handleRefresh} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          {lastUpdatedText && <p className="text-sm text-slate-500 mt-1">{lastUpdatedText}</p>}
        </div>
        <div className="flex items-center gap-2">
          <DashboardSettings userPermissions={userPermissions} />
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && !stats && (
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-3"></div>
              <div className="h-8 bg-slate-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {stats && (
        <>
          {/* Overview Stats Row */}
          {showWidget('overview-stats') && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {hasProjectsAccess && stats.projects && (
              <OverviewStatCard
                title="Total Projects"
                value={stats.projects.total}
                icon={<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                iconBg="bg-blue-100"
                link="/projects"
              />
            )}
            {hasTasksAccess && stats.tasks && (
              <OverviewStatCard
                title="My Tasks"
                value={stats.tasks.myTasks}
                icon={<svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
                iconBg="bg-primary-100"
                link="/tasks"
              />
            )}
            {hasLeadsAccess && stats.leads && (
              <OverviewStatCard
                title="Active Leads"
                value={stats.leads.byStatus.new + stats.leads.byStatus.inProgress}
                change={stats.leads.thisMonth > 0 ? Math.round((stats.leads.thisMonth / stats.leads.total) * 100) : undefined}
                icon={<svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                iconBg="bg-amber-100"
                link="/leads"
              />
            )}
            {hasQuotationsAccess && stats.quotations && (
              <OverviewStatCard
                title="Quotation Value"
                value={formatCurrency(stats.quotations.acceptedValue)}
                icon={<svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                iconBg="bg-green-100"
                link="/quotations"
              />
            )}
          </div>
          )}

          {/* Analytics Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Overview */}
            {showWidget('revenue-overview') && (hasQuotationsAccess || stats.payments) && (
              <RevenueChartCard stats={stats} />
            )}

            {/* Projects Analytics */}
            {showWidget('projects-analytics') && hasProjectsAccess && stats.projects && (
              <ProjectsAnalyticsCard stats={stats} />
            )}

            {/* Tasks Analytics */}
            {showWidget('tasks-analytics') && hasTasksAccess && stats.tasks && (
              <TasksAnalyticsCard stats={stats} />
            )}

            {/* Leads Analytics */}
            {showWidget('leads-analytics') && hasLeadsAccess && stats.leads && (
              <LeadsAnalyticsCard stats={stats} />
            )}
          </div>

          {/* My Tasks & Activity Feed Row */}
          {(showWidget('my-tasks') || showWidget('activity-feed')) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My Tasks */}
            {showWidget('my-tasks') && hasTasksAccess && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <MyTasksWidget tasks={myTasks} loading={myTasksLoading} />
              </div>
            )}

            {/* Recent Activity */}
            {showWidget('activity-feed') && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <ActivityFeed activities={activities} loading={activitiesLoading} />
            </div>
            )}
          </div>
          )}

          {/* Additional Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Organizations */}
            {showWidget('organizations-stats') && hasOrganizationsAccess && stats.organizations && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800">Organizations</h3>
                  <Link to="/organizations" className="text-sm text-primary-600 hover:text-primary-700">View All</Link>
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-4">{stats.organizations.total}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-blue-50 rounded-lg p-2">
                    <p className="text-lg font-semibold text-blue-700">{stats.organizations.byType.prospect}</p>
                    <p className="text-xs text-blue-600">Prospects</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <p className="text-lg font-semibold text-green-700">{stats.organizations.byType.client}</p>
                    <p className="text-xs text-green-600">Clients</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-2">
                    <p className="text-lg font-semibold text-purple-700">{stats.organizations.byType.partner}</p>
                    <p className="text-xs text-purple-600">Partners</p>
                  </div>
                </div>
              </div>
            )}

            {/* Users */}
            {showWidget('users-stats') && hasUsersAccess && stats.users && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800">Users</h3>
                  <Link to="/users" className="text-sm text-primary-600 hover:text-primary-700">View All</Link>
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-4">{stats.users.total}</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Active Users</span>
                    <span className="font-medium text-green-600">{stats.users.active}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Internal</span>
                    <span className="font-medium text-slate-700">{stats.users.byType.internal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Client Users</span>
                    <span className="font-medium text-slate-700">{stats.users.byType.client}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">New This Month</span>
                    <span className="font-medium text-blue-600">{stats.users.newThisMonth}</span>
                  </div>
                </div>
              </div>
            )}

            {/* CMS Stats */}
            {showWidget('cms-stats') && userPermissions.includes('cms:read') && stats.cms && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800">CMS Content</h3>
                  <Link to="/cms/content" className="text-sm text-primary-600 hover:text-primary-700">View All</Link>
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-4">{stats.cms.totalContent}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-semibold text-green-700">{stats.cms.published}</p>
                    <p className="text-xs text-green-600">Published</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-semibold text-amber-700">{stats.cms.draft}</p>
                    <p className="text-xs text-amber-600">Drafts</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty State */}
      {!loading && !stats && !error && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-100">
          <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          <h3 className="text-lg font-medium text-slate-800 mb-2">No dashboard data available</h3>
          <p className="text-slate-500">Contact your administrator to get access to dashboard modules.</p>
        </div>
      )}
    </div>
  );
}

export default DynamicDashboard;
