/**
 * Dashboard Redux Slice
 * Enterprise-level dashboard state management
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import dashboardApi from '../../lib/api/dashboard';
import type {
  DashboardStats,
  ActivityItem,
  TaskSummary,
  MeetingSummary,
  ClientDashboardStats,
  DashboardPreferences,
} from '../../types/dashboard';

// State interface
export interface DashboardState {
  stats: DashboardStats | null;
  activities: ActivityItem[];
  myTasks: TaskSummary[];
  myMeetings: MeetingSummary[];
  clientStats: ClientDashboardStats | null;
  loading: boolean;
  activitiesLoading: boolean;
  myTasksLoading: boolean;
  myMeetingsLoading: boolean;
  clientStatsLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  autoRefreshEnabled: boolean;
  refreshInterval: number; // in milliseconds
  widgetPreferences: DashboardPreferences;
  preferencesLoading: boolean;
  preferencesLoaded: boolean;
}

// Initial state
const initialState: DashboardState = {
  stats: null,
  activities: [],
  myTasks: [],
  myMeetings: [],
  clientStats: null,
  loading: false,
  activitiesLoading: false,
  myTasksLoading: false,
  myMeetingsLoading: false,
  clientStatsLoading: false,
  error: null,
  lastUpdated: null,
  autoRefreshEnabled: false, // Disabled - manual refresh only
  refreshInterval: 0, // No auto-refresh
  widgetPreferences: { hiddenWidgets: [] },
  preferencesLoading: false,
  preferencesLoaded: false,
};

// Async Thunks

/**
 * Fetch dashboard statistics
 * Automatically filters data based on user permissions (handled by backend)
 */
export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await dashboardApi.getStats();
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      return rejectWithValue(
        err.response?.data?.error?.message || 'Failed to fetch dashboard stats'
      );
    }
  }
);

/**
 * Fetch recent activities
 */
export const fetchDashboardActivities = createAsyncThunk(
  'dashboard/fetchActivities',
  async (limit: number = 10, { rejectWithValue }) => {
    try {
      const response = await dashboardApi.getActivities(limit);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      return rejectWithValue(
        err.response?.data?.error?.message || 'Failed to fetch activities'
      );
    }
  }
);

/**
 * Fetch current user's tasks
 */
export const fetchMyTasks = createAsyncThunk(
  'dashboard/fetchMyTasks',
  async (_, { rejectWithValue }) => {
    try {
      const response = await dashboardApi.getMyTasks();
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      return rejectWithValue(
        err.response?.data?.error?.message || 'Failed to fetch my tasks'
      );
    }
  }
);

/**
 * Fetch current user's meetings
 */
export const fetchMyMeetings = createAsyncThunk(
  'dashboard/fetchMyMeetings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await dashboardApi.getMyMeetings();
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      return rejectWithValue(
        err.response?.data?.error?.message || 'Failed to fetch my meetings'
      );
    }
  }
);

/**
 * Fetch client dashboard stats (for client portal)
 */
export const fetchClientDashboardStats = createAsyncThunk(
  'dashboard/fetchClientStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await dashboardApi.getClientDashboard();
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      return rejectWithValue(
        err.response?.data?.error?.message || 'Failed to fetch client dashboard stats'
      );
    }
  }
);

/**
 * Fetch all dashboard data in parallel
 */
export const fetchAllDashboardData = createAsyncThunk(
  'dashboard/fetchAll',
  async (
    options: { includeActivities?: boolean; includeMyTasks?: boolean; includeMyMeetings?: boolean } = {},
    { dispatch }
  ) => {
    const promises: Promise<unknown>[] = [dispatch(fetchDashboardStats())];

    if (options.includeActivities !== false) {
      promises.push(dispatch(fetchDashboardActivities(10)));
    }
    if (options.includeMyTasks !== false) {
      promises.push(dispatch(fetchMyTasks()));
    }
    if (options.includeMyMeetings !== false) {
      promises.push(dispatch(fetchMyMeetings()));
    }

    await Promise.all(promises);
    return true;
  }
);

/**
 * Fetch user's widget visibility preferences
 */
export const fetchWidgetPreferences = createAsyncThunk(
  'dashboard/fetchWidgetPreferences',
  async (_, { rejectWithValue }) => {
    try {
      const response = await dashboardApi.getWidgetPreferences();
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      return rejectWithValue(
        err.response?.data?.error?.message || 'Failed to fetch widget preferences'
      );
    }
  }
);

/**
 * Update user's widget visibility preferences
 */
export const updateWidgetPreferences = createAsyncThunk(
  'dashboard/updateWidgetPreferences',
  async (preferences: DashboardPreferences, { rejectWithValue }) => {
    try {
      const response = await dashboardApi.updateWidgetPreferences(preferences);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      return rejectWithValue(
        err.response?.data?.error?.message || 'Failed to update widget preferences'
      );
    }
  }
);

// Slice
const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearDashboardData: (state) => {
      state.stats = null;
      state.activities = [];
      state.myTasks = [];
      state.myMeetings = [];
      state.clientStats = null;
      state.lastUpdated = null;
    },
    setAutoRefresh: (state, action: PayloadAction<boolean>) => {
      state.autoRefreshEnabled = action.payload;
    },
    setRefreshInterval: (state, action: PayloadAction<number>) => {
      state.refreshInterval = action.payload;
    },
    setWidgetVisibility: (state, action: PayloadAction<{ widgetId: string; visible: boolean }>) => {
      const { widgetId, visible } = action.payload;
      if (visible) {
        state.widgetPreferences.hiddenWidgets = state.widgetPreferences.hiddenWidgets.filter(
          (id) => id !== widgetId
        );
      } else {
        if (!state.widgetPreferences.hiddenWidgets.includes(widgetId)) {
          state.widgetPreferences.hiddenWidgets.push(widgetId);
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Dashboard Stats
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch Activities
      .addCase(fetchDashboardActivities.pending, (state) => {
        state.activitiesLoading = true;
      })
      .addCase(fetchDashboardActivities.fulfilled, (state, action) => {
        state.activitiesLoading = false;
        state.activities = action.payload;
      })
      .addCase(fetchDashboardActivities.rejected, (state, action) => {
        state.activitiesLoading = false;
        state.error = action.payload as string;
      })

      // Fetch My Tasks
      .addCase(fetchMyTasks.pending, (state) => {
        state.myTasksLoading = true;
      })
      .addCase(fetchMyTasks.fulfilled, (state, action) => {
        state.myTasksLoading = false;
        state.myTasks = action.payload;
      })
      .addCase(fetchMyTasks.rejected, (state, action) => {
        state.myTasksLoading = false;
        state.error = action.payload as string;
      })

      // Fetch My Meetings
      .addCase(fetchMyMeetings.pending, (state) => {
        state.myMeetingsLoading = true;
      })
      .addCase(fetchMyMeetings.fulfilled, (state, action) => {
        state.myMeetingsLoading = false;
        state.myMeetings = action.payload;
      })
      .addCase(fetchMyMeetings.rejected, (state, action) => {
        state.myMeetingsLoading = false;
        state.error = action.payload as string;
      })

      // Fetch Client Stats
      .addCase(fetchClientDashboardStats.pending, (state) => {
        state.clientStatsLoading = true;
      })
      .addCase(fetchClientDashboardStats.fulfilled, (state, action) => {
        state.clientStatsLoading = false;
        state.clientStats = action.payload;
      })
      .addCase(fetchClientDashboardStats.rejected, (state, action) => {
        state.clientStatsLoading = false;
        state.error = action.payload as string;
      })

      // Fetch Widget Preferences
      .addCase(fetchWidgetPreferences.pending, (state) => {
        state.preferencesLoading = true;
      })
      .addCase(fetchWidgetPreferences.fulfilled, (state, action) => {
        state.preferencesLoading = false;
        state.preferencesLoaded = true;
        state.widgetPreferences = action.payload;
      })
      .addCase(fetchWidgetPreferences.rejected, (state) => {
        state.preferencesLoading = false;
        state.preferencesLoaded = true; // Mark loaded even on error (use defaults)
      })

      // Update Widget Preferences
      .addCase(updateWidgetPreferences.fulfilled, (state, action) => {
        state.widgetPreferences = action.payload;
      })

      // Fetch All
      .addCase(fetchAllDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllDashboardData.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(fetchAllDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch dashboard data';
      });
  },
});

export const {
  clearError,
  clearDashboardData,
  setAutoRefresh,
  setRefreshInterval,
  setWidgetVisibility,
} = dashboardSlice.actions;

// Selectors
export const selectDashboardStats = (state: RootState) => state.dashboard.stats;
export const selectDashboardActivities = (state: RootState) => state.dashboard.activities;
export const selectMyTasks = (state: RootState) => state.dashboard.myTasks;
export const selectMyMeetings = (state: RootState) => state.dashboard.myMeetings;
export const selectClientStats = (state: RootState) => state.dashboard.clientStats;
export const selectDashboardLoading = (state: RootState) => state.dashboard.loading;
export const selectActivitiesLoading = (state: RootState) => state.dashboard.activitiesLoading;
export const selectMyTasksLoading = (state: RootState) => state.dashboard.myTasksLoading;
export const selectMyMeetingsLoading = (state: RootState) => state.dashboard.myMeetingsLoading;
export const selectClientStatsLoading = (state: RootState) => state.dashboard.clientStatsLoading;
export const selectDashboardError = (state: RootState) => state.dashboard.error;
export const selectLastUpdated = (state: RootState) => state.dashboard.lastUpdated;
export const selectAutoRefreshEnabled = (state: RootState) => state.dashboard.autoRefreshEnabled;
export const selectRefreshInterval = (state: RootState) => state.dashboard.refreshInterval;
export const selectWidgetPreferences = (state: RootState) => state.dashboard.widgetPreferences;
export const selectPreferencesLoading = (state: RootState) => state.dashboard.preferencesLoading;
export const selectPreferencesLoaded = (state: RootState) => state.dashboard.preferencesLoaded;

// Derived selectors
export const selectLeadsStats = (state: RootState) => state.dashboard.stats?.leads;
export const selectOrganizationsStats = (state: RootState) => state.dashboard.stats?.organizations;
export const selectProjectsStats = (state: RootState) => state.dashboard.stats?.projects;
export const selectTasksStats = (state: RootState) => state.dashboard.stats?.tasks;
export const selectQuotationsStats = (state: RootState) => state.dashboard.stats?.quotations;
export const selectMeetingsStats = (state: RootState) => state.dashboard.stats?.meetings;
export const selectCMSStats = (state: RootState) => state.dashboard.stats?.cms;
export const selectUsersStats = (state: RootState) => state.dashboard.stats?.users;

export default dashboardSlice.reducer;
