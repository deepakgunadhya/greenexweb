/**
 * Activity Feed Widget
 * Displays recent activities across permitted modules
 */

import React from 'react';
import { Link } from 'react-router-dom';
import type { ActivityItem } from '../../../../types/dashboard';

interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
}

const typeIcons: Record<ActivityItem['type'], React.ReactNode> = {
  lead: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  project: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  quotation: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  task: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  meeting: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  content: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  user: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
};

const typeColors: Record<ActivityItem['type'], string> = {
  lead: 'bg-blue-100 text-blue-600',
  project: 'bg-primary-100 text-primary-600',
  quotation: 'bg-purple-100 text-purple-600',
  task: 'bg-amber-100 text-amber-600',
  meeting: 'bg-teal-100 text-teal-600',
  content: 'bg-pink-100 text-pink-600',
  user: 'bg-indigo-100 text-indigo-600',
};

const actionColors: Record<string, string> = {
  created: 'text-green-600',
  updated: 'text-blue-600',
  deleted: 'text-red-600',
  completed: 'text-primary-600',
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getActivityLink(activity: ActivityItem): string {
  const typeRoutes: Record<ActivityItem['type'], string> = {
    lead: '/leads',
    project: '/projects',
    quotation: '/quotations',
    task: '/tasks',
    meeting: '/meetings',
    content: '/cms/content',
    user: '/users',
  };

  const baseRoute = typeRoutes[activity.type] || '/';
  const id = activity.id.split('-')[1]; // Extract ID from "type-id" format
  return `${baseRoute}/${id}`;
}

export function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start space-x-3">
            <div className="h-8 w-8 bg-slate-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-slate-200 rounded w-full"></div>
              <div className="h-2 bg-slate-200 rounded w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Recent Activity</h3>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <svg
            className="w-12 h-12 text-slate-300 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-slate-500">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <Link
              key={activity.id}
              to={getActivityLink(activity)}
              className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div
                className={`p-2 rounded-full flex-shrink-0 ${
                  typeColors[activity.type] || 'bg-slate-100 text-slate-600'
                }`}
              >
                {typeIcons[activity.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800">
                  <span
                    className={`font-medium ${
                      actionColors[activity.action] || 'text-slate-700'
                    }`}
                  >
                    {activity.action.charAt(0).toUpperCase() + activity.action.slice(1)}
                  </span>{' '}
                  <span className="font-medium">{activity.title}</span>
                </p>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {activity.description}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {formatTimestamp(activity.timestamp)}
                  {activity.user && (
                    <span className="ml-2">by {activity.user.name}</span>
                  )}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default ActivityFeed;
