import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchMeetingsByLead, fetchMeetingsByOrganization, clearError } from '@/store/slices/meetingsSlice';

interface Meeting {
  id: string;
  title: string;
  description?: string;
  scheduledAt: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  location?: string;
  meetingLink?: string;
  meetingType: string;
  status: string;
  outcome?: string;
  actionItems?: string;
  organizedBy: string;
  clientSide?: string;
  greenexSide?: string;
  followUpRequired?: boolean;
  followUpDate?: string;
  followUpNotes?: string;
  createdAt: string;
  updatedAt: string;
  organizer?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface MeetingTimelineProps {
  leadId?: string;
  organizationId?: string;
  title?: string;
  onScheduleFollowUp?: (meeting: Meeting) => void;
}

const MeetingTimeline: React.FC<MeetingTimelineProps> = ({ 
  leadId, 
  organizationId, 
  title = "Meeting History",
  onScheduleFollowUp
}) => {
  const dispatch = useAppDispatch();
  const { leadMeetings, organizationMeetings, loading, error } = useAppSelector((state) => state.meetings);
  
  // Get meetings from Redux store based on leadId or organizationId
  const meetings = leadId 
    ? (leadMeetings[leadId] || [])
    : organizationId 
    ? (organizationMeetings[organizationId] || [])
    : [];

  useEffect(() => {
    if (leadId && !leadMeetings[leadId]) {
      dispatch(fetchMeetingsByLead(leadId));
    } else if (organizationId && !organizationMeetings[organizationId]) {
      dispatch(fetchMeetingsByOrganization(organizationId));
    }
  }, [leadId, organizationId, dispatch, leadMeetings, organizationMeetings]);

  // Clear error when component unmounts or props change
  useEffect(() => {
    return () => {
      if (error) {
        dispatch(clearError());
      }
    };
  }, [error, dispatch]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'NO_SHOW':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMeetingTypeIcon = (type: string) => {
    switch (type) {
      case 'KICKOFF':
        return '🚀';
      case 'FOLLOWUP':
        return '📞';
      case 'CLARIFICATION':
        return '❓';
      case 'CLOSURE':
        return '✅';
      default:
        return '📝';
    }
  };

  // Check if a follow-up meeting has already been scheduled for this meeting
  const hasFollowUpScheduled = (meetingId: string) => {
    return meetings.some(m => 
      m.meetingType === 'FOLLOWUP' && 
      m.title.includes(meetings.find(meeting => meeting.id === meetingId)?.title || '')
    );
  };

  if (loading && meetings.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-slate-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-slate-900 mb-4">{title}</h3>
        <div className="text-red-600 text-sm">
          {typeof error === 'string' ? error : error.message}
          <button
            onClick={() => dispatch(clearError())}
            className="ml-2 text-red-600 hover:text-red-800 underline"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-slate-900 mb-4">{title}</h3>
        <div className="text-center py-8">
          <div className="text-slate-400 text-4xl mb-2">📅</div>
          <p className="text-slate-500 text-sm">No meetings found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-slate-900 mb-4">{title}</h3>
      
      <div className="space-y-4">
        {meetings.map((meeting, index) => (
          <div key={meeting.id} className="relative">
            {/* Timeline line */}
            {index < meetings.length - 1 && (
              <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-slate-200" />
            )}
            
            <div className="flex items-start space-x-4">
              {/* Timeline dot */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs ${getStatusColor(meeting.status)}`}>
                {getMeetingTypeIcon(meeting.meetingType)}
              </div>
              
              {/* Meeting content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-slate-900">{meeting.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDate(meeting.scheduledAt)} at {formatTime(meeting.scheduledAt)}
                      {meeting.organizer && ` • Organized by ${meeting.organizer.firstName} ${meeting.organizer.lastName}`}
                    </p>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(meeting.status)}`}>
                    {meeting.status}
                  </span>
                </div>
                
                {meeting.description && (
                  <p className="text-sm text-slate-600 mt-2">{meeting.description}</p>
                )}
                
                {meeting.location && (
                  <p className="text-xs text-slate-500 mt-1">
                    📍 {meeting.location}
                  </p>
                )}
                
                {meeting.meetingLink && (
                  <p className="text-xs text-slate-500 mt-1">
                    🔗 <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">Meeting Link</a>
                  </p>
                )}
                
                {/* Meeting outcome and notes for completed meetings */}
                {meeting.status === 'COMPLETED' && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                    {meeting.outcome && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-slate-700 mb-1">Outcome:</p>
                        <p className="text-sm text-slate-600">{meeting.outcome}</p>
                      </div>
                    )}
                    
                    {meeting.actionItems && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-slate-700 mb-1">Action Items:</p>
                        <p className="text-sm text-slate-600">{meeting.actionItems}</p>
                      </div>
                    )}
                    
                    {meeting.followUpRequired && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs">
                          {hasFollowUpScheduled(meeting.id) ? (
                            <>
                              <span className="text-green-600">✅</span>
                              <span className="text-slate-600">Follow-up meeting scheduled</span>
                            </>
                          ) : (
                            <>
                              <span className="text-amber-600">⚠️</span>
                              <span className="text-slate-600">Follow-up meeting required</span>
                            </>
                          )}
                          {meeting.followUpDate && (
                            <span className="text-slate-500">({formatDate(meeting.followUpDate)})</span>
                          )}
                        </div>
                        {onScheduleFollowUp && !hasFollowUpScheduled(meeting.id) && (
                          <button
                            onClick={() => onScheduleFollowUp(meeting)}
                            className="ml-2 px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                          >
                            Schedule Follow-up
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Attendees */}
                {(meeting.clientSide || meeting.greenexSide) && (
                  <div className="mt-2 text-xs text-slate-500">
                    {meeting.clientSide && (
                      <p>👥 Client: {meeting.clientSide}</p>
                    )}
                    {meeting.greenexSide && (
                      <p>🌱 Greenex: {meeting.greenexSide}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MeetingTimeline;