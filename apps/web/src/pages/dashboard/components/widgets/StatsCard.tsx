/**
 * Stats Card Widget Components
 * Generic and specific stat card implementations
 */

import React from 'react';
import { Link } from 'react-router-dom';
import type {
  LeadStats,
  OrganizationStats,
  ProjectStats,
  TaskStats,
  QuotationStats,
  CMSStats,
  UserStats,
} from '../../../../types/dashboard';

// Generic Stats Card Props
interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  change?: number;
  icon?: React.ReactNode;
  link?: string;
  color?: 'primary' | 'blue' | 'amber' | 'red' | 'purple' | 'teal';
}

/**
 * Generic Stats Card Component
 */
export function StatsCard({
  title,
  value,
  subtitle,
  change,
  icon,
  link,
  color = 'primary',
}: StatsCardProps) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    teal: 'bg-teal-50 text-teal-600',
  };

  const content = (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        {icon && (
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        )}
      </div>
      <div className="text-3xl font-semibold text-slate-900 mb-1">{value}</div>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      {typeof change === 'number' && (
        <p
          className={`text-sm font-medium mt-2 ${
            change >= 0 ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {change >= 0 ? '+' : ''}
          {change}% from last month
        </p>
      )}
    </>
  );

  if (link) {
    return (
      <Link
        to={link}
        className="block hover:bg-slate-50 rounded-lg transition-colors -m-2 p-2"
      >
        {content}
      </Link>
    );
  }

  return <div>{content}</div>;
}

// Leads Stats Card
interface LeadsStatsCardProps {
  data: LeadStats;
}

export function LeadsStatsCard({ data }: LeadsStatsCardProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Leads</h3>
        <Link
          to="/leads"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View all
        </Link>
      </div>

      <div className="text-3xl font-bold text-slate-900 mb-2">{data.total}</div>
      <p className="text-sm text-slate-500 mb-4">Total leads</p>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-blue-50 rounded-lg p-2">
          <div className="text-lg font-semibold text-blue-700">
            {data.byStatus.new}
          </div>
          <div className="text-xs text-blue-600">New</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-2">
          <div className="text-lg font-semibold text-amber-700">
            {data.byStatus.inProgress}
          </div>
          <div className="text-xs text-amber-600">In Progress</div>
        </div>
        <div className="bg-green-50 rounded-lg p-2">
          <div className="text-lg font-semibold text-green-700">
            {data.byStatus.closed}
          </div>
          <div className="text-xs text-green-600">Closed</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Conversion rate</span>
          <span className="font-medium text-slate-700">{data.conversionRate}%</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-slate-500">This month</span>
          <span className="font-medium text-slate-700">{data.thisMonth}</span>
        </div>
      </div>
    </div>
  );
}

// Projects Stats Card
interface ProjectsStatsCardProps {
  data: ProjectStats;
}

export function ProjectsStatsCard({ data }: ProjectsStatsCardProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Projects</h3>
        <Link
          to="/projects"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View all
        </Link>
      </div>

      <div className="text-3xl font-bold text-slate-900 mb-2">{data.total}</div>
      <p className="text-sm text-slate-500 mb-4">Total projects</p>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <span className="text-sm text-slate-600">Active</span>
          </div>
          <span className="font-medium text-slate-700">{data.activeProjects}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
            <span className="text-sm text-slate-600">Completed this month</span>
          </div>
          <span className="font-medium text-slate-700">{data.completedThisMonth}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="text-xs font-medium text-slate-500 mb-2">Timeline Status</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-green-50 rounded p-1">
            <div className="text-sm font-semibold text-green-700">
              {data.timeline.onTrack}
            </div>
            <div className="text-xs text-green-600">On Track</div>
          </div>
          <div className="bg-amber-50 rounded p-1">
            <div className="text-sm font-semibold text-amber-700">
              {data.timeline.atRisk}
            </div>
            <div className="text-xs text-amber-600">At Risk</div>
          </div>
          <div className="bg-red-50 rounded p-1">
            <div className="text-sm font-semibold text-red-700">
              {data.timeline.overdue}
            </div>
            <div className="text-xs text-red-600">Overdue</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tasks Stats Card
interface TasksStatsCardProps {
  data: TaskStats;
}

export function TasksStatsCard({ data }: TasksStatsCardProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Tasks</h3>
        <Link
          to="/tasks"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View all
        </Link>
      </div>

      <div className="text-3xl font-bold text-slate-900 mb-2">{data.total}</div>
      <p className="text-sm text-slate-500 mb-4">Total tasks</p>

      <div className="grid grid-cols-4 gap-1 text-center mb-4">
        <div className="bg-slate-100 rounded p-1">
          <div className="text-sm font-semibold text-slate-700">
            {data.byStatus.to_do}
          </div>
          <div className="text-xs text-slate-500">To Do</div>
        </div>
        <div className="bg-blue-50 rounded p-1">
          <div className="text-sm font-semibold text-blue-700">
            {data.byStatus.doing}
          </div>
          <div className="text-xs text-blue-600">Doing</div>
        </div>
        <div className="bg-red-50 rounded p-1">
          <div className="text-sm font-semibold text-red-700">
            {data.byStatus.blocked}
          </div>
          <div className="text-xs text-red-600">Blocked</div>
        </div>
        <div className="bg-green-50 rounded p-1">
          <div className="text-sm font-semibold text-green-700">
            {data.byStatus.done}
          </div>
          <div className="text-xs text-green-600">Done</div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-500">My Tasks</span>
          <span className="font-medium text-primary-600">{data.myTasks}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">High Priority</span>
          <span className="font-medium text-red-600">{data.byPriority.high}</span>
        </div>
      </div>
    </div>
  );
}

// Quotations Stats Card
interface QuotationsStatsCardProps {
  data: QuotationStats;
}

export function QuotationsStatsCard({ data }: QuotationsStatsCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Quotations</h3>
        <Link
          to="/quotations"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View all
        </Link>
      </div>

      <div className="text-3xl font-bold text-slate-900 mb-2">{data.total}</div>
      <p className="text-sm text-slate-500 mb-4">Total quotations</p>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Total Value</span>
          <span className="font-medium text-slate-700">
            {formatCurrency(data.totalValue)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Pending Value</span>
          <span className="font-medium text-amber-600">
            {formatCurrency(data.pendingValue)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Accepted Value</span>
          <span className="font-medium text-green-600">
            {formatCurrency(data.acceptedValue)}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">This month</span>
          <span className="font-medium text-slate-700">{data.thisMonth}</span>
        </div>
      </div>
    </div>
  );
}

// Organizations Stats Card
interface OrganizationsStatsCardProps {
  data: OrganizationStats;
}

export function OrganizationsStatsCard({ data }: OrganizationsStatsCardProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Organizations</h3>
        <Link
          to="/organizations"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View all
        </Link>
      </div>

      <div className="text-3xl font-bold text-slate-900 mb-2">{data.total}</div>
      <p className="text-sm text-slate-500 mb-4">Total organizations</p>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-blue-50 rounded-lg p-2">
          <div className="text-lg font-semibold text-blue-700">
            {data.byType.prospect}
          </div>
          <div className="text-xs text-blue-600">Prospects</div>
        </div>
        <div className="bg-green-50 rounded-lg p-2">
          <div className="text-lg font-semibold text-green-700">
            {data.byType.client}
          </div>
          <div className="text-xs text-green-600">Clients</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-2">
          <div className="text-lg font-semibold text-purple-700">
            {data.byType.partner}
          </div>
          <div className="text-xs text-purple-600">Partners</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">New this month</span>
          <span className="font-medium text-slate-700">{data.thisMonth}</span>
        </div>
      </div>
    </div>
  );
}

// CMS Stats Card
interface CMSStatsCardProps {
  data: CMSStats;
}

export function CMSStatsCard({ data }: CMSStatsCardProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">CMS Content</h3>
        <Link
          to="/cms/content"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View all
        </Link>
      </div>

      <div className="text-3xl font-bold text-slate-900 mb-2">{data.totalContent}</div>
      <p className="text-sm text-slate-500 mb-4">Total content items</p>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-green-50 rounded-lg p-2">
          <div className="text-lg font-semibold text-green-700">{data.published}</div>
          <div className="text-xs text-green-600">Published</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-2">
          <div className="text-lg font-semibold text-amber-700">{data.draft}</div>
          <div className="text-xs text-amber-600">Drafts</div>
        </div>
      </div>
    </div>
  );
}

// Users Stats Card
interface UsersStatsCardProps {
  data: UserStats;
}

export function UsersStatsCard({ data }: UsersStatsCardProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Users</h3>
        <Link
          to="/users"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View all
        </Link>
      </div>

      <div className="text-3xl font-bold text-slate-900 mb-2">{data.total}</div>
      <p className="text-sm text-slate-500 mb-4">Total users</p>

      <div className="grid grid-cols-2 gap-2 text-center mb-4">
        <div className="bg-blue-50 rounded-lg p-2">
          <div className="text-lg font-semibold text-blue-700">
            {data.byType.internal}
          </div>
          <div className="text-xs text-blue-600">Internal</div>
        </div>
        <div className="bg-teal-50 rounded-lg p-2">
          <div className="text-lg font-semibold text-teal-700">
            {data.byType.client}
          </div>
          <div className="text-xs text-teal-600">Clients</div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-500">Active</span>
          <span className="font-medium text-green-600">{data.active}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">New this month</span>
          <span className="font-medium text-slate-700">{data.newThisMonth}</span>
        </div>
      </div>
    </div>
  );
}
