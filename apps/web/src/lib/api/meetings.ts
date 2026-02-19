import { apiClient } from './client';

interface ScheduleMeetingRequest {
  leadId: string;
  title: string;
  description?: string;
  scheduledAt: string;
  duration?: number;
  location?: string;
  meetingLink?: string;
  meetingType?: string;
  clientSide?: string;
  greenexSide?: string;
}

interface Meeting {
  id: string;
  leadId: string;
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
}

interface MeetingsResponse {
  meetings: Meeting[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

export const meetingsApi = {
  async getAllMeetings(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    meetingType?: string;
    organizedBy?: string;
    scheduledFrom?: string;
    scheduledTo?: string;
  }): Promise<ApiResponse<MeetingsResponse>> {
    const response = await apiClient.get('/meetings', { params });
    return response.data;
  },

  async getMeetingById(id: string): Promise<ApiResponse<Meeting>> {
    const response = await apiClient.get(`/meetings/${id}`);
    return response.data;
  },

  async getMeetingsByLead(leadId: string): Promise<ApiResponse<Meeting[]>> {
    const response = await apiClient.get(`/meetings/lead/${leadId}`);
    return response.data;
  },

  async getMeetingsByOrganization(organizationId: string): Promise<ApiResponse<Meeting[]>> {
    const response = await apiClient.get(`/meetings/organization/${organizationId}`);
    return response.data;
  },

  async scheduleMeeting(data: ScheduleMeetingRequest): Promise<ApiResponse<Meeting>> {
    const response = await apiClient.post('/meetings', data);
    return response.data;
  },

  async updateMeeting(id: string, data: Partial<ScheduleMeetingRequest>): Promise<ApiResponse<Meeting>> {
    const response = await apiClient.put(`/meetings/${id}`, data);
    return response.data;
  },

  async startMeeting(id: string): Promise<ApiResponse<Meeting>> {
    const response = await apiClient.post(`/meetings/${id}/start`);
    return response.data;
  },

  async completeMeeting(id: string, data: {
    outcome?: string;
    actionItems?: string;
    followUpRequired?: boolean;
    followUpDate?: string;
    followUpNotes?: string;
  }): Promise<ApiResponse<Meeting>> {
    const response = await apiClient.post(`/meetings/${id}/complete`, data);
    return response.data;
  },

  async cancelMeeting(id: string, reason?: string): Promise<ApiResponse<Meeting>> {
    const response = await apiClient.post(`/meetings/${id}/cancel`, { reason });
    return response.data;
  },

  async rescheduleMeeting(id: string, scheduledAt: string, reason?: string): Promise<ApiResponse<Meeting>> {
    const response = await apiClient.post(`/meetings/${id}/reschedule`, { scheduledAt, reason });
    return response.data;
  },

  async deleteMeeting(id: string): Promise<void> {
    await apiClient.delete(`/meetings/${id}`);
  },

  async getMeetingStats(organizerId?: string): Promise<ApiResponse<{
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
    upcomingThisWeek: number;
  }>> {
    const response = await apiClient.get('/meetings/stats', { 
      params: organizerId ? { organizerId } : undefined 
    });
    return response.data;
  },

  async getGoogleStatus(): Promise<ApiResponse<{ connected: boolean; isActive: boolean }>> {
    const response = await apiClient.get('/auth/google/status');
    return response.data;
  },

  async disconnectGoogle(): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.post('/auth/google/disconnect');
    return response.data;
  },
};