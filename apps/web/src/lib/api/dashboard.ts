/**
 * Dashboard API Client
 * Enterprise-level dashboard API endpoints
 */

import apiClient from './client';
import type {
  DashboardStats,
  ActivityItem,
  TaskSummary,
  MeetingSummary,
  ClientDashboardStats,
  DashboardPreferences,
} from '../../types/dashboard';

// Response types
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/**
 * Dashboard API methods
 */
const dashboardApi = {
  /**
   * Get dashboard statistics based on user permissions
   * Only returns data for modules the user has access to
   */
  getStats: async (): Promise<ApiResponse<DashboardStats>> => {
    const response = await apiClient.get('/dashboard/stats');
    return response.data;
  },

  /**
   * Get recent activities based on user permissions
   * @param limit - Number of activities to return (default: 10, max: 50)
   */
  getActivities: async (limit: number = 10): Promise<ApiResponse<ActivityItem[]>> => {
    const response = await apiClient.get('/dashboard/activities', {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Get current user's task summary
   * Returns up to 10 pending/in-progress tasks sorted by due date
   */
  getMyTasks: async (): Promise<ApiResponse<TaskSummary[]>> => {
    const response = await apiClient.get('/dashboard/my-tasks');
    return response.data;
  },

  /**
   * Get current user's upcoming meetings
   * Returns up to 10 upcoming meetings sorted by start time
   */
  getMyMeetings: async (): Promise<ApiResponse<MeetingSummary[]>> => {
    const response = await apiClient.get('/dashboard/my-meetings');
    return response.data;
  },

  /**
   * Get client portal dashboard statistics
   * Only available for client users with an organization
   * Data is isolated to the user's organization
   */
  getClientDashboard: async (): Promise<ApiResponse<ClientDashboardStats>> => {
    const response = await apiClient.get('/dashboard/client');
    return response.data;
  },

  /**
   * Get current user's dashboard widget visibility preferences
   */
  getWidgetPreferences: async (): Promise<ApiResponse<DashboardPreferences>> => {
    const response = await apiClient.get('/dashboard/widget-preferences');
    return response.data;
  },

  /**
   * Update current user's dashboard widget visibility preferences
   */
  updateWidgetPreferences: async (
    preferences: DashboardPreferences
  ): Promise<ApiResponse<DashboardPreferences>> => {
    const response = await apiClient.put('/dashboard/widget-preferences', preferences);
    return response.data;
  },
};

export default dashboardApi;

// Named exports for convenience
export const {
  getStats,
  getActivities,
  getMyTasks,
  getMyMeetings,
  getClientDashboard,
  getWidgetPreferences,
  updateWidgetPreferences,
} = dashboardApi;
