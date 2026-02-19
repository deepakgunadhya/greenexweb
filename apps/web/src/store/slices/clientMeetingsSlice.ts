import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../lib/api/client';

// Client-specific meeting interface (subset of admin meeting)
interface ClientMeeting {
  id: string;
  leadId: string;
  title: string;
  description?: string;
  scheduledAt?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  location?: string;
  meetingLink?: string;
  meetingType: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  outcome?: string;
  actionItems?: string;
  attendees?: string;
  clientSide?: string;
  greenexSide?: string;
  followUpRequired: boolean;
  followUpDate?: string;
  followUpNotes?: string;
  createdAt: string;
  updatedAt: string;
  lead?: {
    id: string;
    title: string;
    organization?: {
      id: string;
      name: string;
    };
  };
  organizer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface ClientMeetingState {
  meetings: ClientMeeting[];
  currentMeeting: ClientMeeting | null;
  loading: boolean;
  error: string | null;
  upcomingMeetings: ClientMeeting[];
  recentMeetings: ClientMeeting[];
}

const initialState: ClientMeetingState = {
  meetings: [],
  currentMeeting: null,
  loading: false,
  error: null,
  upcomingMeetings: [],
  recentMeetings: [],
};

// Async thunks for client meeting operations
export const fetchClientMeetings = createAsyncThunk(
  'clientMeetings/fetchMeetings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/client/meetings');
      const data = response.data;
      if (!data.success) {
        return rejectWithValue(data.error?.message || 'Failed to fetch meetings');
      }
      return data.data;
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || error?.message || 'Failed to fetch meetings';
      return rejectWithValue(message);
    }
  }
);

export const fetchClientMeetingById = createAsyncThunk(
  'clientMeetings/fetchMeetingById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/client/meetings/${id}`);
      const data = response.data;
      if (!data.success) {
        return rejectWithValue(data.error?.message || 'Failed to fetch meeting');
      }
      return data.data;
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || error?.message || 'Failed to fetch meeting';
      return rejectWithValue(message);
    }
  }
);

export const fetchUpcomingClientMeetings = createAsyncThunk(
  'clientMeetings/fetchUpcomingMeetings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/client/meetings', {
        params: { status: 'SCHEDULED', upcoming: 'true' },
      });
      const data = response.data;
      if (!data.success) {
        return rejectWithValue(data.error?.message || 'Failed to fetch upcoming meetings');
      }
      return data.data;
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || error?.message || 'Failed to fetch upcoming meetings';
      return rejectWithValue(message);
    }
  }
);

export const fetchRecentClientMeetings = createAsyncThunk(
  'clientMeetings/fetchRecentMeetings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/client/meetings', {
        params: { status: 'COMPLETED', recent: 'true', limit: '5' },
      });
      const data = response.data;
      if (!data.success) {
        return rejectWithValue(data.error?.message || 'Failed to fetch recent meetings');
      }
      return data.data;
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || error?.message || 'Failed to fetch recent meetings';
      return rejectWithValue(message);
    }
  }
);

// Update meeting confirmation (client can confirm attendance)
export const updateMeetingConfirmation = createAsyncThunk(
  'clientMeetings/updateConfirmation',
  async (payload: {
    meetingId: string;
    confirmed: boolean;
    notes?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/client/meetings/${payload.meetingId}/confirm`, {
        confirmed: payload.confirmed,
        notes: payload.notes,
      });
      const data = response.data;
      if (!data.success) {
        return rejectWithValue(data.error?.message || 'Failed to update meeting confirmation');
      }
      return data.data;
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || error?.message || 'Failed to update meeting confirmation';
      return rejectWithValue(message);
    }
  }
);

// Create the client meetings slice
const clientMeetingsSlice = createSlice({
  name: 'clientMeetings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentMeeting: (state) => {
      state.currentMeeting = null;
    },
    setCurrentMeeting: (state, action: PayloadAction<ClientMeeting>) => {
      state.currentMeeting = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch client meetings
      .addCase(fetchClientMeetings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClientMeetings.fulfilled, (state, action) => {
        state.loading = false;
        state.meetings = action.payload;
      })
      .addCase(fetchClientMeetings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch client meeting by ID
      .addCase(fetchClientMeetingById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClientMeetingById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentMeeting = action.payload;
      })
      .addCase(fetchClientMeetingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch upcoming meetings
      .addCase(fetchUpcomingClientMeetings.fulfilled, (state, action) => {
        state.upcomingMeetings = action.payload;
      })
      .addCase(fetchUpcomingClientMeetings.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Fetch recent meetings
      .addCase(fetchRecentClientMeetings.fulfilled, (state, action) => {
        state.recentMeetings = action.payload;
      })
      .addCase(fetchRecentClientMeetings.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Update meeting confirmation
      .addCase(updateMeetingConfirmation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMeetingConfirmation.fulfilled, (state, action) => {
        state.loading = false;
        const updatedMeeting = action.payload;
        
        // Update the meeting in the list
        const index = state.meetings.findIndex(m => m.id === updatedMeeting.id);
        if (index !== -1) {
          state.meetings[index] = updatedMeeting;
        }
        
        // Update in upcoming meetings if it exists there
        const upcomingIndex = state.upcomingMeetings.findIndex(m => m.id === updatedMeeting.id);
        if (upcomingIndex !== -1) {
          state.upcomingMeetings[upcomingIndex] = updatedMeeting;
        }
        
        // Update current meeting
        if (state.currentMeeting?.id === updatedMeeting.id) {
          state.currentMeeting = updatedMeeting;
        }
      })
      .addCase(updateMeetingConfirmation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  clearError, 
  clearCurrentMeeting, 
  setCurrentMeeting 
} = clientMeetingsSlice.actions;

export default clientMeetingsSlice.reducer;