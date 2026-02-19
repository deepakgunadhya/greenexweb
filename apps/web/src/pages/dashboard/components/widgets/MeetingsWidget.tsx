/**
 * Meetings Widget
 * Displays upcoming meetings for the current user
 */

import React from 'react';
import { Link } from 'react-router-dom';
import type { MeetingSummary } from '../../../../types/dashboard';

interface MeetingsWidgetProps {
  meetings: MeetingSummary[];
  loading?: boolean;
}

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-slate-100 text-slate-700',
};

const typeIcons: Record<string, React.ReactNode> = {
  VIDEO: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  IN_PERSON: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  PHONE: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
};

function formatMeetingTime(startTime: string, endTime?: string): string {
  const start = new Date(startTime);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const meetingDate = new Date(start);
  meetingDate.setHours(0, 0, 0, 0);

  let dateStr: string;
  if (meetingDate.getTime() === today.getTime()) {
    dateStr = 'Today';
  } else if (meetingDate.getTime() === tomorrow.getTime()) {
    dateStr = 'Tomorrow';
  } else {
    dateStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (endTime) {
    const end = new Date(endTime);
    const endTimeStr = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${dateStr} at ${timeStr} - ${endTimeStr}`;
  }

  return `${dateStr} at ${timeStr}`;
}

function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function MeetingsWidget({ meetings, loading }: MeetingsWidgetProps) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-slate-200 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-slate-200 rounded w-3/4"></div>
              <div className="h-2 bg-slate-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Upcoming Meetings</h3>
        <Link
          to="/meetings"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View all
        </Link>
      </div>

      {meetings.length === 0 ? (
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
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm text-slate-500">No upcoming meetings</p>
          <Link
            to="/meetings/schedule"
            className="text-sm text-primary-600 hover:text-primary-700 mt-2 inline-block"
          >
            Schedule a meeting
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <Link
              key={meeting.id}
              to={`/meetings/${meeting.id}`}
              className="block p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-teal-50 text-teal-600 flex-shrink-0">
                  {typeIcons[meeting.type] || typeIcons.VIDEO}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium text-slate-800 truncate">
                      {meeting.title}
                    </h4>
                    {isToday(meeting.startTime) && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium flex-shrink-0">
                        Today
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatMeetingTime(meeting.startTime, meeting.endTime)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        statusColors[meeting.status] || statusColors.SCHEDULED
                      }`}
                    >
                      {meeting.status.charAt(0) + meeting.status.slice(1).toLowerCase()}
                    </span>
                    {meeting.participants !== undefined && meeting.participants > 0 && (
                      <span className="text-xs text-slate-400">
                        {meeting.participants} participant{meeting.participants > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default MeetingsWidget;
