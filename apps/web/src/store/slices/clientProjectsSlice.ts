import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../lib/api/client';

// Client-specific project interface (subset of admin project)
interface ClientProject {
  id: string;
  projectNumber: string;
  name: string;
  description?: string;
  status: 'PLANNED' | 'CHECKLIST_FINALIZED' | 'VERIFICATION_PASSED' | 'EXECUTION_IN_PROGRESS' | 'EXECUTION_COMPLETE' | 'DRAFT_PREPARED' | 'CLIENT_REVIEW' | 'ACCOUNT_CLOSURE' | 'COMPLETED';
  startDate?: string;
  endDate?: string;
  estimatedCost?: number;
  actualCost?: number;
  progress: number; // Percentage completion
  createdAt: string;
  updatedAt: string;
  organization?: {
    id: string;
    name: string;
  };
  services?: {
    id: string;
    name: string;
    category: string;
  }[];
  // Client-specific fields
  currentPhase: string;
  nextMilestone?: string;
  deliverables?: {
    id: string;
    name: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    dueDate?: string;
  }[];
}

interface ProjectReport {
  id: string;
  projectId: string;
  title: string;
  type: 'DRAFT' | 'FINAL';
  version: number;
  status: 'IN_REVIEW' | 'APPROVED' | 'REQUIRES_CHANGES';
  documentPath?: string;
  createdAt: string;
  updatedAt: string;
  comments?: {
    id: string;
    content: string;
    status: 'OPEN' | 'RESOLVED';
    createdAt: string;
  }[];
}

interface ClientProjectState {
  projects: ClientProject[];
  currentProject: ClientProject | null;
  projectReports: Record<string, ProjectReport[]>; // Reports by project ID
  loading: boolean;
  reportsLoading: boolean;
  error: string | null;
  stats: {
    total: number;
    inProgress: number;
    completed: number;
    inReview: number;
  } | null;
}

const initialState: ClientProjectState = {
  projects: [],
  currentProject: null,
  projectReports: {},
  loading: false,
  reportsLoading: false,
  error: null,
  stats: null,
};

// Async thunks for client project operations
export const fetchClientProjects = createAsyncThunk(
  'clientProjects/fetchProjects',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/client/projects');
      const data = response.data;
      if (!data.success) {
        return rejectWithValue(data.error?.message || 'Failed to fetch projects');
      }
      return data.data;
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || error?.message || 'Failed to fetch projects';
      return rejectWithValue(message);
    }
  }
);

export const fetchClientProjectById = createAsyncThunk(
  'clientProjects/fetchProjectById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/client/projects/${id}`);
      const data = response.data;
      if (!data.success) {
        return rejectWithValue(data.error?.message || 'Failed to fetch project');
      }
      return data.data;
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || error?.message || 'Failed to fetch project';
      return rejectWithValue(message);
    }
  }
);

export const fetchProjectReports = createAsyncThunk(
  'clientProjects/fetchReports',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/client/projects/${projectId}/reports`);
      const data = response.data;
      if (!data.success) {
        return rejectWithValue(data.error?.message || 'Failed to fetch project reports');
      }
      return { projectId, reports: data.data };
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || error?.message || 'Failed to fetch project reports';
      return rejectWithValue(message);
    }
  }
);

export const fetchClientProjectStats = createAsyncThunk(
  'clientProjects/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/client/projects/stats');
      const data = response.data;
      if (!data.success) {
        return rejectWithValue(data.error?.message || 'Failed to fetch project stats');
      }
      return data.data;
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || error?.message || 'Failed to fetch project stats';
      return rejectWithValue(message);
    }
  }
);

export const downloadProjectReport = createAsyncThunk(
  'clientProjects/downloadReport',
  async (payload: { projectId: string; reportId: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        `/client/projects/${payload.projectId}/reports/${payload.reportId}/download`,
        { responseType: 'blob' }
      );
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      return { reportId: payload.reportId, url };
    } catch (error: any) {
      const message = error?.message || 'Failed to download report';
      return rejectWithValue(message);
    }
  }
);

// Submit report comments/feedback
export const submitReportFeedback = createAsyncThunk(
  'clientProjects/submitFeedback',
  async (payload: {
    projectId: string;
    reportId: string;
    content: string;
    type: 'COMMENT' | 'APPROVAL' | 'CHANGE_REQUEST';
  }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        `/client/projects/${payload.projectId}/reports/${payload.reportId}/feedback`,
        { content: payload.content, type: payload.type }
      );
      const data = response.data;
      if (!data.success) {
        return rejectWithValue(data.error?.message || 'Failed to submit feedback');
      }
      return { projectId: payload.projectId, reportId: payload.reportId, feedback: data.data };
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || error?.message || 'Failed to submit feedback';
      return rejectWithValue(message);
    }
  }
);

// Create the client projects slice
const clientProjectsSlice = createSlice({
  name: 'clientProjects',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentProject: (state) => {
      state.currentProject = null;
    },
    setCurrentProject: (state, action: PayloadAction<ClientProject>) => {
      state.currentProject = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch client projects
      .addCase(fetchClientProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClientProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload;
      })
      .addCase(fetchClientProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch client project by ID
      .addCase(fetchClientProjectById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClientProjectById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProject = action.payload;
      })
      .addCase(fetchClientProjectById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch project reports
      .addCase(fetchProjectReports.pending, (state) => {
        state.reportsLoading = true;
        state.error = null;
      })
      .addCase(fetchProjectReports.fulfilled, (state, action) => {
        state.reportsLoading = false;
        state.projectReports[action.payload.projectId] = action.payload.reports;
      })
      .addCase(fetchProjectReports.rejected, (state, action) => {
        state.reportsLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch project stats
      .addCase(fetchClientProjectStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      .addCase(fetchClientProjectStats.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Download project report (no state updates needed, just download)
      .addCase(downloadProjectReport.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Submit report feedback
      .addCase(submitReportFeedback.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitReportFeedback.fulfilled, (state, action) => {
        state.loading = false;
        const { projectId, reportId, feedback } = action.payload;
        
        // Update the report with new feedback
        if (state.projectReports[projectId]) {
          const reportIndex = state.projectReports[projectId].findIndex(r => r.id === reportId);
          if (reportIndex !== -1) {
            const currentReport = state.projectReports[projectId][reportIndex];
            state.projectReports[projectId][reportIndex] = {
              ...currentReport,
              comments: [...(currentReport.comments || []), feedback],
            };
          }
        }
      })
      .addCase(submitReportFeedback.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  clearError, 
  clearCurrentProject, 
  setCurrentProject 
} = clientProjectsSlice.actions;

export default clientProjectsSlice.reducer;