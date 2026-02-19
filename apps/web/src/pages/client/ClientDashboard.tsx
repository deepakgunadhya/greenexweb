/**
 * Client Dashboard Component
 * Enhanced analytics dashboard for client portal users
 * Includes charts, graphs, and detailed metrics
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useClientAuth } from '@/hooks/useClientAuth';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  fetchClientDashboardStats,
  selectClientStats,
  selectClientStatsLoading,
} from '@/store/slices/dashboardSlice';
import type {
  ClientDashboardStats,
  ClientActivityItem,
  ClientMeetingSummary,
  MonthlyDataPoint,
} from '@/types/dashboard';

/**
 * Format currency values
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

/**
 * Overview Stat Card Component
 */
function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  link,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  link?: string;
}) {
  const content = (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
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
}: {
  data: MonthlyDataPoint[];
  title: string;
  color?: 'primary' | 'blue' | 'green' | 'amber' | 'purple';
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-slate-400">
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

  const width = 100;
  const height = 40;
  const padding = 2;
  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1 || 1)) * (width - padding * 2),
    y: height - padding - (d.value / maxValue) * (height - padding * 2),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-700 mb-3">{title}</h4>
      <div className="relative h-24">
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
            <span className="block font-medium text-slate-700">{d.value}</span>
            <span>{d.month}</span>
          </span>
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
  centerValue,
  centerLabel,
}: {
  data: { label: string; value: number; color: string }[];
  centerValue: string | number;
  centerLabel: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-slate-400">
        No data
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
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 36 36" className="w-20 h-20 transform -rotate-90">
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx="18"
              cy="18"
              r="14"
              fill="none"
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
      <div className="space-y-1">
        {data.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${item.color}`} />
            <span className="text-xs text-slate-600">{item.label}: {item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Progress Bar Component
 */
function ProgressBar({
  label,
  value,
  maxValue,
  color,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-700">{value}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Projects Analytics Card
 */
function ProjectsAnalyticsCard({ stats }: { stats: ClientDashboardStats }) {
  const projects = stats.projects;
  const trends = stats.monthlyTrends;

  const statusData = [
    { label: 'In Progress', value: projects.inProgress, color: 'bg-blue-500' },
    { label: 'In Review', value: projects.inReview, color: 'bg-amber-500' },
    { label: 'Completed', value: projects.completed, color: 'bg-green-500' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Projects Overview</h3>
        <Link to="/client/projects" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View All
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">{projects.total}</p>
          <p className="text-xs text-slate-500">Total</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{projects.inProgress}</p>
          <p className="text-xs text-slate-500">In Progress</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-amber-600">{projects.inReview}</p>
          <p className="text-xs text-slate-500">In Review</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{projects.completed}</p>
          <p className="text-xs text-slate-500">Completed</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <DonutChart
          data={statusData}
          centerValue={projects.inProgress}
          centerLabel="Active"
        />
        {trends?.projects && trends.projects.length > 0 && (
          <LineChart
            data={trends.projects}
            title="Project Activity"
            color="blue"
          />
        )}
      </div>

      {/* Recent Projects */}
      {projects.recentProjects && projects.recentProjects.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-100">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Recent Projects</h4>
          <div className="space-y-2">
            {projects.recentProjects.slice(0, 3).map((project) => (
              <Link
                key={project.id}
                to={`/client/projects/${project.id}`}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm text-slate-700">{project.name}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  project.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                  project.status === 'CLIENT_REVIEW' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {project.status.replace(/_/g, ' ')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Quotations Analytics Card
 */
function QuotationsAnalyticsCard({ stats }: { stats: ClientDashboardStats }) {
  const quotations = stats.quotations;
  const trends = stats.monthlyTrends;

  const statusData = [
    { label: 'Pending', value: quotations.pending, color: 'bg-amber-500' },
    { label: 'Accepted', value: quotations.accepted, color: 'bg-green-500' },
    { label: 'Rejected', value: quotations.rejected, color: 'bg-red-500' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Quotations</h3>
        <Link to="/client/quotations" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View All
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Total Value</p>
          <p className="text-xl font-bold text-green-700">{formatCurrency(quotations.totalValue)}</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-4">
          <p className="text-sm text-amber-600 font-medium">Pending</p>
          <p className="text-xl font-bold text-amber-700">{quotations.pending}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <DonutChart
          data={statusData}
          centerValue={quotations.total}
          centerLabel="Total"
        />
        {trends?.quotations && trends.quotations.length > 0 && (
          <LineChart
            data={trends.quotations}
            title="Quotation Activity"
            color="green"
          />
        )}
      </div>

      {/* Status Breakdown */}
      <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
        <ProgressBar
          label="Accepted"
          value={quotations.accepted}
          maxValue={quotations.total}
          color="bg-green-500"
        />
        <ProgressBar
          label="Pending"
          value={quotations.pending}
          maxValue={quotations.total}
          color="bg-amber-500"
        />
        <ProgressBar
          label="Rejected"
          value={quotations.rejected}
          maxValue={quotations.total}
          color="bg-red-500"
        />
      </div>
    </div>
  );
}

/**
 * Submissions Analytics Card
 */
function SubmissionsAnalyticsCard({ stats }: { stats: ClientDashboardStats }) {
  const submissions = stats.submissions;
  const trends = stats.monthlyTrends;

  const statusData = [
    { label: 'Pending', value: submissions.pending, color: 'bg-amber-500' },
    { label: 'Approved', value: submissions.approved, color: 'bg-green-500' },
    { label: 'Needs Revision', value: submissions.needsRevision, color: 'bg-red-500' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Document Submissions</h3>
        <Link to="/client/project-checklists" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View All
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">{submissions.total}</p>
          <p className="text-xs text-slate-500">Total</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-amber-600">{submissions.pending}</p>
          <p className="text-xs text-slate-500">Pending</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{submissions.approved}</p>
          <p className="text-xs text-slate-500">Approved</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600">{submissions.needsRevision}</p>
          <p className="text-xs text-slate-500">Revisions</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <DonutChart
          data={statusData}
          centerValue={`${submissions.total > 0 ? Math.round((submissions.approved / submissions.total) * 100) : 0}%`}
          centerLabel="Approved"
        />
        {trends?.submissions && trends.submissions.length > 0 && (
          <LineChart
            data={trends.submissions}
            title="Submission Activity"
            color="purple"
          />
        )}
      </div>
    </div>
  );
}

/**
 * Recent Activity Widget
 */
function RecentActivityWidget({ activities }: { activities?: ClientActivityItem[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h3>
        <div className="text-center py-8 text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No recent activity</p>
        </div>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
      case 'quotation':
        return <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'submission':
        return <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
      case 'meeting':
        return <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
      default:
        return <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.slice(0, 5).map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">{getActivityIcon(activity.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{activity.title}</p>
              <p className="text-sm text-slate-500">{activity.description}</p>
              <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(activity.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Upcoming Meetings Widget
 */
function UpcomingMeetingsWidget({ meetings }: { meetings?: ClientMeetingSummary[] }) {
  if (!meetings || meetings.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Upcoming Meetings</h3>
        <div className="text-center py-8 text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p>No upcoming meetings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Upcoming Meetings</h3>
      <div className="space-y-3">
        {meetings.map((meeting) => (
          <div key={meeting.id} className="flex items-center space-x-3 p-3 rounded-lg bg-slate-50">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{meeting.title}</p>
              <p className="text-xs text-slate-500">
                {new Date(meeting.startTime).toLocaleDateString()} at{' '}
                {new Date(meeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              meeting.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
              meeting.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
              'bg-slate-100 text-slate-700'
            }`}>
              {meeting.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Quick Actions Widget
 */
function QuickActionsWidget() {
  const actions = [
    { label: 'View Projects', icon: '📋', path: '/client/projects' },
    { label: 'Review Quotations', icon: '💰', path: '/client/quotations' },
    { label: 'Submit Documents', icon: '📄', path: '/client/project-checklists' },
    { label: 'Contact Support', icon: '💬', path: '/client/support' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Link
            key={action.label}
            to={action.path}
            className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-primary-200 transition-colors"
          >
            <span className="text-xl">{action.icon}</span>
            <span className="text-sm font-medium text-slate-700">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * Main Client Dashboard Component
 */
export function ClientDashboard() {
  const { user, getOrganizationName } = useClientAuth();
  const dispatch = useAppDispatch();

  // Get data from Redux store
  const clientStats = useAppSelector(selectClientStats);
  const loading = useAppSelector(selectClientStatsLoading);

  useEffect(() => {
    dispatch(fetchClientDashboardStats());
  }, [dispatch]);

  // Manual refresh handler
  const handleRefresh = () => {
    dispatch(fetchClientDashboardStats());
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl shadow-lg overflow-hidden">
        <div className="px-8 py-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Welcome back, {user?.firstName}!</h1>
              <p className="text-primary-100 mt-2 text-lg">
                Here's your project overview at {getOrganizationName()}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white/10 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <div className="hidden md:block">
                <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🌱</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && !clientStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-3"></div>
              <div className="h-8 bg-slate-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {clientStats && (
        <>
          {/* Overview Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Active Projects"
              value={clientStats.projects.inProgress}
              subtitle={`${clientStats.projects.total} total projects`}
              icon={<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
              iconBg="bg-blue-100"
              link="/client/projects"
            />
            <StatCard
              title="Pending Quotations"
              value={clientStats.quotations.pending}
              subtitle={formatCurrency(clientStats.quotations.totalValue)}
              icon={<svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              iconBg="bg-green-100"
              link="/client/quotations"
            />
            <StatCard
              title="Documents Submitted"
              value={clientStats.submissions.total}
              subtitle={`${clientStats.submissions.approved} approved`}
              icon={<svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
              iconBg="bg-purple-100"
              link="/client/project-checklists"
            />
            <StatCard
              title="Completed Projects"
              value={clientStats.projects.completed}
              subtitle="Ready for delivery"
              icon={<svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              iconBg="bg-primary-100"
              link="/client/projects"
            />
          </div>

          {/* Analytics Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProjectsAnalyticsCard stats={clientStats} />
            <QuotationsAnalyticsCard stats={clientStats} />
          </div>

          {/* Submissions Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SubmissionsAnalyticsCard stats={clientStats} />

            {/* Activity & Meetings Column */}
            <div className="space-y-6">
              <RecentActivityWidget activities={clientStats.recentActivity} />
              <UpcomingMeetingsWidget meetings={clientStats.upcomingMeetings} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {/* Reserved for future widgets */}
            </div>
            <QuickActionsWidget />
          </div>
        </>
      )}

      {/* Empty State */}
      {!loading && !clientStats && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-100">
          <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          <h3 className="text-lg font-medium text-slate-800 mb-2">No dashboard data available</h3>
          <p className="text-slate-500">Please contact support if you believe this is an error.</p>
        </div>
      )}
    </div>
  );
}

export default ClientDashboard;
