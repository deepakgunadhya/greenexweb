import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { meetingsApi } from '../../lib/api/meetings';

// Types based on the meetings API
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
  organizer?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  lead?: {
    id: string;
    title: string;
    organization?: {
      name: string;
    };
    contact?: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

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

interface UpdateMeetingRequest extends Partial<ScheduleMeetingRequest> {
  id: string;
}

interface CompleteMeetingRequest {
  id: string;
  outcome?: string;
  actionItems?: string;
  followUpRequired?: boolean;
  followUpDate?: string;
  followUpNotes?: string;
}

interface MeetingFilters {
  page?: number;
  pageSize?: number;
  status?: string;
  meetingType?: string;
  organizedBy?: string;
  scheduledFrom?: string;
  scheduledTo?: string;
}

interface MeetingStats {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  upcomingThisWeek: number;
}

interface MeetingsError {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface MeetingsState {
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  leadMeetings: Record<string, Meeting[]>; // Cache meetings by leadId
  organizationMeetings: Record<string, Meeting[]>; // Cache meetings by organizationId
  loading: boolean;
  error: string | MeetingsError | null;
  meta: PaginationMeta | null;
  stats: MeetingStats | null;
  googleConnected: boolean;
  googleActive: boolean;
}

const initialState: MeetingsState = {
  meetings: [],
  currentMeeting: null,
  leadMeetings: {},
  organizationMeetings: {},
  loading: false,
  error: null,
  meta: null,
  stats: null,
  googleConnected: false,
  googleActive: false,
};

// Async thunks for meeting operations
export const fetchMeetings = createAsyncThunk(
  'meetings/fetchMeetings',
  async (filters: MeetingFilters = {}, { rejectWithValue }) => {
    try {
      const response = await meetingsApi.getAllMeetings(filters);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch meetings');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch meetings');
    }
  }
);

export const fetchMeetingById = createAsyncThunk(
  'meetings/fetchMeetingById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await meetingsApi.getMeetingById(id);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch meeting');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch meeting');
    }
  }
);

export const fetchMeetingsByLead = createAsyncThunk(
  'meetings/fetchMeetingsByLead',
  async (leadId: string, { rejectWithValue }) => {
    try {
      const response = await meetingsApi.getMeetingsByLead(leadId);
      if (response.success) {
        return { leadId, meetings: response.data };
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch lead meetings');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch lead meetings');
    }
  }
);

export const fetchMeetingsByOrganization = createAsyncThunk(
  'meetings/fetchMeetingsByOrganization',
  async (organizationId: string, { rejectWithValue }) => {
    try {
      const response = await meetingsApi.getMeetingsByOrganization(organizationId);
      if (response.success) {
        return { organizationId, meetings: response.data };
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch organization meetings');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch organization meetings');
    }
  }
);

export const scheduleMeeting = createAsyncThunk(
  'meetings/scheduleMeeting',
  async (data: ScheduleMeetingRequest, { rejectWithValue }) => {
    try {
      const response = await meetingsApi.scheduleMeeting(data);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error || { message: 'Failed to schedule meeting' });
      }
    } catch (error: any) {
      // Handle validation errors from API
      if (error.response?.data?.error?.code === 'VALIDATION_ERROR') {
        return rejectWithValue(error.response.data.error);
      }
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to schedule meeting'
      });
    }
  }
);

export const updateMeeting = createAsyncThunk(
  'meetings/updateMeeting',
  async ({ id, ...data }: UpdateMeetingRequest, { rejectWithValue }) => {
    try {
      const response = await meetingsApi.updateMeeting(id, data);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error || { message: 'Failed to update meeting' });
      }
    } catch (error: any) {
      if (error.response?.data?.error?.code === 'VALIDATION_ERROR') {
        return rejectWithValue(error.response.data.error);
      }
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to update meeting'
      });
    }
  }
);

export const startMeeting = createAsyncThunk(
  'meetings/startMeeting',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await meetingsApi.startMeeting(id);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to start meeting');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to start meeting');
    }
  }
);

export const completeMeeting = createAsyncThunk(
  'meetings/completeMeeting',
  async ({ id, ...data }: CompleteMeetingRequest, { rejectWithValue }) => {
    try {
      const response = await meetingsApi.completeMeeting(id, data);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to complete meeting');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to complete meeting');
    }
  }
);

export const cancelMeeting = createAsyncThunk(
  'meetings/cancelMeeting',
  async ({ id, reason }: { id: string; reason?: string }, { rejectWithValue }) => {
    try {
      const response = await meetingsApi.cancelMeeting(id, reason);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to cancel meeting');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to cancel meeting');
    }
  }
);

export const rescheduleMeeting = createAsyncThunk(
  'meetings/rescheduleMeeting',
  async ({ id, scheduledAt, reason }: { id: string; scheduledAt: string; reason?: string }, { rejectWithValue }) => {
    try {
      const response = await meetingsApi.rescheduleMeeting(id, scheduledAt, reason);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to reschedule meeting');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to reschedule meeting');
    }
  }
);

export const deleteMeeting = createAsyncThunk(
  'meetings/deleteMeeting',
  async (id: string, { rejectWithValue }) => {
    try {
      await meetingsApi.deleteMeeting(id);
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete meeting');
    }
  }
);

export const fetchMeetingStats = createAsyncThunk(
  'meetings/fetchMeetingStats',
  async (organizerId: string | undefined = undefined, { rejectWithValue }) => {
    try {
      const response = await meetingsApi.getMeetingStats(organizerId);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch meeting stats');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch meeting stats');
    }
  }
);

export const fetchGoogleStatus = createAsyncThunk(
  'meetings/fetchGoogleStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await meetingsApi.getGoogleStatus();
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch Google status');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch Google status');
    }
  }
);

export const disconnectGoogle = createAsyncThunk(
  'meetings/disconnectGoogle',
  async (_, { rejectWithValue }) => {
    try {
      const response = await meetingsApi.disconnectGoogle();
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to disconnect Google');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to disconnect Google');
    }
  }
);

// Create the meetings slice
const meetingsSlice = createSlice({
  name: 'meetings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentMeeting: (state) => {
      state.currentMeeting = null;
    },
    setGoogleStatus: (state, action: PayloadAction<{ connected: boolean; isActive: boolean }>) => {
      state.googleConnected = action.payload.connected;
      state.googleActive = action.payload.isActive;
    },
    // Optimistic update for meeting status changes
    updateMeetingOptimistic: (state, action: PayloadAction<{ id: string; data: Partial<Meeting> }>) => {
      const { id, data } = action.payload;
      
      // Update in main meetings array
      const meetingIndex = state.meetings.findIndex(m => m.id === id);
      if (meetingIndex !== -1) {
        state.meetings[meetingIndex] = { ...state.meetings[meetingIndex], ...data };
      }
      
      // Update in lead meetings cache
      Object.keys(state.leadMeetings).forEach(leadId => {
        const leadMeetingIndex = state.leadMeetings[leadId].findIndex(m => m.id === id);
        if (leadMeetingIndex !== -1) {
          state.leadMeetings[leadId][leadMeetingIndex] = {
            ...state.leadMeetings[leadId][leadMeetingIndex],
            ...data
          };
        }
      });
      
      // Update current meeting if it's the same
      if (state.currentMeeting?.id === id) {
        state.currentMeeting = { ...state.currentMeeting, ...data };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch meetings
      .addCase(fetchMeetings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMeetings.fulfilled, (state, action) => {
        state.loading = false;
        state.meetings = action.payload.meetings;
        state.meta = {
          page: action.payload.meta.page,
          pageSize: action.payload.meta.pageSize,
          total: action.payload.meta.total,
          totalPages: action.payload.meta.totalPages,
        };
      })
      .addCase(fetchMeetings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch meeting by ID
      .addCase(fetchMeetingById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMeetingById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentMeeting = action.payload;
      })
      .addCase(fetchMeetingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch meetings by lead
      .addCase(fetchMeetingsByLead.fulfilled, (state, action) => {
        state.leadMeetings[action.payload.leadId] = action.payload.meetings;
      })
      .addCase(fetchMeetingsByLead.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Fetch meetings by organization
      .addCase(fetchMeetingsByOrganization.fulfilled, (state, action) => {
        state.organizationMeetings[action.payload.organizationId] = action.payload.meetings;
      })
      .addCase(fetchMeetingsByOrganization.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Schedule meeting
      .addCase(scheduleMeeting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(scheduleMeeting.fulfilled, (state, action) => {
        state.loading = false;
        state.meetings.unshift(action.payload); // Add to beginning
        
        // Also add to lead meetings cache if leadId exists
        const leadId = action.payload.leadId;
        if (leadId && state.leadMeetings[leadId]) {
          state.leadMeetings[leadId].unshift(action.payload);
        }
      })
      .addCase(scheduleMeeting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as MeetingsError;
      })
      
      // Update meeting
      .addCase(updateMeeting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMeeting.fulfilled, (state, action) => {
        state.loading = false;
        const updatedMeeting = action.payload;
        
        // Update in main meetings array
        const index = state.meetings.findIndex(m => m.id === updatedMeeting.id);
        if (index !== -1) {
          state.meetings[index] = updatedMeeting;
        }
        
        // Update in lead meetings cache
        const leadId = updatedMeeting.leadId;
        if (leadId && state.leadMeetings[leadId]) {
          const leadIndex = state.leadMeetings[leadId].findIndex(m => m.id === updatedMeeting.id);
          if (leadIndex !== -1) {
            state.leadMeetings[leadId][leadIndex] = updatedMeeting;
          }
        }
        
        // Update current meeting
        if (state.currentMeeting?.id === updatedMeeting.id) {
          state.currentMeeting = updatedMeeting;
        }
      })
      .addCase(updateMeeting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as MeetingsError;
      })
      
      // Start meeting
      .addCase(startMeeting.fulfilled, (state, action) => {
        const updatedMeeting = action.payload;
        meetingsSlice.caseReducers.updateMeetingOptimistic(state, {
          payload: { id: updatedMeeting.id, data: updatedMeeting },
          type: 'updateMeetingOptimistic'
        });
      })
      
      // Complete meeting
      .addCase(completeMeeting.fulfilled, (state, action) => {
        const updatedMeeting = action.payload;
        meetingsSlice.caseReducers.updateMeetingOptimistic(state, {
          payload: { id: updatedMeeting.id, data: updatedMeeting },
          type: 'updateMeetingOptimistic'
        });
      })
      
      // Cancel meeting
      .addCase(cancelMeeting.fulfilled, (state, action) => {
        const updatedMeeting = action.payload;
        meetingsSlice.caseReducers.updateMeetingOptimistic(state, {
          payload: { id: updatedMeeting.id, data: updatedMeeting },
          type: 'updateMeetingOptimistic'
        });
      })
      
      // Reschedule meeting
      .addCase(rescheduleMeeting.fulfilled, (state, action) => {
        const updatedMeeting = action.payload;
        meetingsSlice.caseReducers.updateMeetingOptimistic(state, {
          payload: { id: updatedMeeting.id, data: updatedMeeting },
          type: 'updateMeetingOptimistic'
        });
      })
      
      // Delete meeting
      .addCase(deleteMeeting.fulfilled, (state, action) => {
        const meetingId = action.payload;
        
        // Remove from main meetings array
        state.meetings = state.meetings.filter(m => m.id !== meetingId);
        
        // Remove from lead meetings cache
        Object.keys(state.leadMeetings).forEach(leadId => {
          state.leadMeetings[leadId] = state.leadMeetings[leadId].filter(m => m.id !== meetingId);
        });
        
        // Remove from organization meetings cache
        Object.keys(state.organizationMeetings).forEach(orgId => {
          state.organizationMeetings[orgId] = state.organizationMeetings[orgId].filter(m => m.id !== meetingId);
        });
        
        // Clear current meeting if it was deleted
        if (state.currentMeeting?.id === meetingId) {
          state.currentMeeting = null;
        }
      })
      
      // Fetch meeting stats
      .addCase(fetchMeetingStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      .addCase(fetchMeetingStats.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Google status
      .addCase(fetchGoogleStatus.fulfilled, (state, action) => {
        state.googleConnected = action.payload.connected;
        state.googleActive = action.payload.isActive;
      })
      .addCase(disconnectGoogle.fulfilled, (state) => {
        state.googleConnected = false;
        state.googleActive = false;
      });
  },
});

export const { 
  clearError, 
  clearCurrentMeeting, 
  setGoogleStatus, 
  updateMeetingOptimistic 
} = meetingsSlice.actions;

export default meetingsSlice.reducer;