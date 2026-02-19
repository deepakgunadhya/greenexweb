import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import ProjectChecklistsAPI from '../../lib/api/project-checklists';
import clientSubmissionsApi, { ClientSubmission, UploadSubmissionParams, ReviewSubmissionParams } from '../../lib/api/client-submissions';

export interface ProjectTemplateAssignment {
  id: string;
  projectId: string;
  templateFileId: string;
  status: 'assigned' | 'submitted' | 'incomplete' | 'verified';
  assignedBy: string | null;
  assignedAt: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  currentRemarks: string | null;
  templateFile: {
    id: string;
    title: string;
    description: string | null;
    category: string;
    createdAt: string;
    attachments: Array<{
      id: string;
      originalName: string;
      filePath: string;
      mimeType: string | null;
    }>;
  };
  submissions: ClientSubmission[];
}

export interface ProjectTemplateAssignmentsState {
  assignments: ProjectTemplateAssignment[];
  selectedAssignment: ProjectTemplateAssignment | null;
  submissionHistory: ClientSubmission[];
  projectHistory: any[];
  availableTemplates: any[];
  loading: boolean;
  uploading: boolean;
  reviewing: boolean;
  loadingHistory: boolean;
  loadingProjectHistory: boolean;
  loadingTemplates: boolean;
  assigning: boolean;
  error: string | null;
}

const initialState: ProjectTemplateAssignmentsState = {
  assignments: [],
  selectedAssignment: null,
  submissionHistory: [],
  projectHistory: [],
  availableTemplates: [],
  loading: false,
  uploading: false,
  reviewing: false,
  loadingHistory: false,
  loadingProjectHistory: false,
  loadingTemplates: false,
  assigning: false,
  error: null,
};

// Async Thunks

/**
 * Fetch project template assignments (client-specific endpoint)
 */
export const fetchProjectAssignments = createAsyncThunk(
  'projectTemplateAssignments/fetchAssignments',
  async (projectId: string, { rejectWithValue }) => {
    try {
      console.log('[Redux] Fetching assignments for project:', projectId);
      // Use client-specific API endpoint that validates project access
      const response = await clientSubmissionsApi.getProjectAssignments(projectId);
      console.log('[Redux] API Response:', response);
      console.log('[Redux] Assignments data:', response.data);
      return { projectId, assignments: response.data };
    } catch (error: any) {
      console.error('[Redux] Error fetching assignments:', error);
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch project assignments');
    }
  }
);

/**
 * Upload client submission
 */
export const uploadClientSubmission = createAsyncThunk(
  'projectTemplateAssignments/uploadSubmission',
  async (params: UploadSubmissionParams, { rejectWithValue }) => {
    try {
      const submission = await clientSubmissionsApi.uploadSubmission(params);
      return { assignmentId: params.assignmentId, submission };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to upload submission');
    }
  }
);

/**
 * Review submission (admin)
 */
export const reviewSubmission = createAsyncThunk(
  'projectTemplateAssignments/reviewSubmission',
  async (params: ReviewSubmissionParams, { rejectWithValue }) => {
    try {
      const submission = await clientSubmissionsApi.reviewSubmission(params);
      return submission;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to review submission');
    }
  }
);

/**
 * Fetch submission history for an assignment
 */
export const fetchSubmissionHistory = createAsyncThunk(
  'projectTemplateAssignments/fetchHistory',
  async (assignmentId: string, { rejectWithValue }) => {
    try {
      const submissions = await clientSubmissionsApi.getSubmissionHistory(assignmentId);
      return { assignmentId, submissions };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch submission history');
    }
  }
);

/**
 * Download submission file
 */
export const downloadSubmission = createAsyncThunk(
  'projectTemplateAssignments/downloadSubmission',
  async (submissionId: string, { rejectWithValue }) => {
    try {
      await clientSubmissionsApi.downloadSubmission(submissionId);
      return submissionId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to download submission');
    }
  }
);

/**
 * Fetch available templates for assignment
 */
export const fetchAvailableTemplates = createAsyncThunk(
  'projectTemplateAssignments/fetchAvailableTemplates',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const response = await ProjectChecklistsAPI.getAvailableTemplates(projectId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch available templates');
    }
  }
);

/**
 * Fetch project-level checklist history across all assignments
 */
export const fetchProjectChecklistHistory = createAsyncThunk(
  'projectTemplateAssignments/fetchProjectHistory',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const history = await clientSubmissionsApi.getProjectChecklistHistory(projectId);
      return history;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch project checklist history');
    }
  }
);

/**
 * Assign template to project
 */
export const assignTemplateToProject = createAsyncThunk(
  'projectTemplateAssignments/assignTemplate',
  async ({ projectId, templateFileId, reason }: { projectId: string; templateFileId: string; reason?: string }, { rejectWithValue }) => {
    try {
      const response = await ProjectChecklistsAPI.assignTemplate(projectId, templateFileId, reason);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to assign template');
    }
  }
);

// Slice
const projectTemplateAssignmentsSlice = createSlice({
  name: 'projectTemplateAssignments',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedAssignment: (state, action: PayloadAction<ProjectTemplateAssignment | null>) => {
      state.selectedAssignment = action.payload;
    },
    clearSelectedAssignment: (state) => {
      state.selectedAssignment = null;
      state.submissionHistory = [];
    },
    clearAssignments: (state) => {
      state.assignments = [];
      state.selectedAssignment = null;
      state.submissionHistory = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Project Assignments
      .addCase(fetchProjectAssignments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectAssignments.fulfilled, (state, action) => {
        state.loading = false;
        state.assignments = action.payload.assignments;
      })
      .addCase(fetchProjectAssignments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Upload Client Submission
      .addCase(uploadClientSubmission.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(uploadClientSubmission.fulfilled, (state, action) => {
        state.uploading = false;
        const { assignmentId, submission } = action.payload;

        // Update assignment status and add submission
        const assignment = state.assignments.find(a => a.id === assignmentId);
        if (assignment) {
          assignment.status = 'submitted';
          assignment.currentRemarks = null;

          // Mark all previous submissions as not latest
          if (assignment.submissions) {
            assignment.submissions.forEach(sub => {
              sub.isLatest = false;
            });
          } else {
            assignment.submissions = [];
          }

          // Add new submission
          assignment.submissions.push(submission);
        }

        // Update selected assignment if it matches
        if (state.selectedAssignment?.id === assignmentId) {
          state.selectedAssignment.status = 'submitted';
          state.selectedAssignment.currentRemarks = null;
          if (state.selectedAssignment.submissions) {
            state.selectedAssignment.submissions.forEach(sub => {
              sub.isLatest = false;
            });
          } else {
            state.selectedAssignment.submissions = [];
          }
          state.selectedAssignment.submissions.push(submission);
        }
      })
      .addCase(uploadClientSubmission.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload as string;
      })

      // Review Submission
      .addCase(reviewSubmission.pending, (state) => {
        state.reviewing = true;
        state.error = null;
      })
      .addCase(reviewSubmission.fulfilled, (state, action) => {
        state.reviewing = false;
        const updatedSubmission = action.payload;

        // Update submission in assignments list
        const assignment = state.assignments.find(a => a.id === updatedSubmission.assignmentId);
        if (assignment) {
          const submissionIndex = assignment.submissions?.findIndex(s => s.id === updatedSubmission.id);
          if (submissionIndex !== undefined && submissionIndex !== -1 && assignment.submissions) {
            assignment.submissions[submissionIndex] = updatedSubmission;
          }

          // Update assignment status based on review action
          if (updatedSubmission.status === 'rejected') {
            assignment.status = 'incomplete';
            assignment.currentRemarks = updatedSubmission.reviewRemarks;
          } else if (updatedSubmission.status === 'approved') {
            assignment.status = 'verified';
            assignment.verifiedBy = updatedSubmission.reviewedBy;
            assignment.verifiedAt = updatedSubmission.reviewedAt;
            assignment.currentRemarks = null;
          }
        }

        // Update submission in history
        const historyIndex = state.submissionHistory.findIndex(s => s.id === updatedSubmission.id);
        if (historyIndex !== -1) {
          state.submissionHistory[historyIndex] = updatedSubmission;
        }
      })
      .addCase(reviewSubmission.rejected, (state, action) => {
        state.reviewing = false;
        state.error = action.payload as string;
      })

      // Fetch Submission History
      .addCase(fetchSubmissionHistory.pending, (state) => {
        state.loadingHistory = true;
        state.error = null;
      })
      .addCase(fetchSubmissionHistory.fulfilled, (state, action) => {
        state.loadingHistory = false;
        state.submissionHistory = action.payload.submissions;
      })
      .addCase(fetchSubmissionHistory.rejected, (state, action) => {
        state.loadingHistory = false;
        state.error = action.payload as string;
      })

      // Download Submission
      .addCase(downloadSubmission.pending, (state) => {
        state.error = null;
      })
      .addCase(downloadSubmission.fulfilled, (_state) => {
        // Download is handled by the API, no state update needed
      })
      .addCase(downloadSubmission.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Fetch Available Templates
      .addCase(fetchAvailableTemplates.pending, (state) => {
        state.loadingTemplates = true;
        state.error = null;
      })
      .addCase(fetchAvailableTemplates.fulfilled, (state, action) => {
        state.loadingTemplates = false;
        state.availableTemplates = action.payload;
      })
      .addCase(fetchAvailableTemplates.rejected, (state, action) => {
        state.loadingTemplates = false;
        state.error = action.payload as string;
      })

      // Assign Template to Project
      .addCase(assignTemplateToProject.pending, (state) => {
        state.assigning = true;
        state.error = null;
      })
      .addCase(assignTemplateToProject.fulfilled, (state, action) => {
        state.assigning = false;
        state.assignments.unshift(action.payload as any);
        // Remove from available templates
        state.availableTemplates = state.availableTemplates.filter(
          t => t.id !== action.payload.templateFileId
        );
      })
      .addCase(assignTemplateToProject.rejected, (state, action) => {
        state.assigning = false;
        state.error = action.payload as string;
      })

      // Fetch Project Checklist History
      .addCase(fetchProjectChecklistHistory.pending, (state) => {
        state.loadingProjectHistory = true;
        state.error = null;
      })
      .addCase(fetchProjectChecklistHistory.fulfilled, (state, action) => {
        state.loadingProjectHistory = false;
        state.projectHistory = action.payload;
      })
      .addCase(fetchProjectChecklistHistory.rejected, (state, action) => {
        state.loadingProjectHistory = false;
        state.error = action.payload as string;
      });
  },
});

// Actions
export const {
  clearError,
  setSelectedAssignment,
  clearSelectedAssignment,
  clearAssignments,
} = projectTemplateAssignmentsSlice.actions;

// Selectors
export const selectAssignments = (state: RootState) => state.projectTemplateAssignments.assignments;
export const selectSelectedAssignment = (state: RootState) => state.projectTemplateAssignments.selectedAssignment;
export const selectSubmissionHistory = (state: RootState) => state.projectTemplateAssignments.submissionHistory;
export const selectAvailableTemplates = (state: RootState) => state.projectTemplateAssignments.availableTemplates;
export const selectAssignmentsLoading = (state: RootState) => state.projectTemplateAssignments.loading;
export const selectUploading = (state: RootState) => state.projectTemplateAssignments.uploading;
export const selectReviewing = (state: RootState) => state.projectTemplateAssignments.reviewing;
export const selectLoadingHistory = (state: RootState) => state.projectTemplateAssignments.loadingHistory;
export const selectLoadingTemplates = (state: RootState) => state.projectTemplateAssignments.loadingTemplates;
export const selectAssigning = (state: RootState) => state.projectTemplateAssignments.assigning;
export const selectProjectHistory = (state: RootState) => state.projectTemplateAssignments.projectHistory;
export const selectLoadingProjectHistory = (state: RootState) => state.projectTemplateAssignments.loadingProjectHistory;
export const selectError = (state: RootState) => state.projectTemplateAssignments.error;

// Filtered selectors
export const selectAssignmentsByStatus = (status: string) => (state: RootState) =>
  state.projectTemplateAssignments.assignments.filter(a => a.status === status);

export const selectPendingAssignments = (state: RootState) =>
  state.projectTemplateAssignments.assignments.filter(a => a.status === 'assigned');

export const selectSubmittedAssignments = (state: RootState) =>
  state.projectTemplateAssignments.assignments.filter(a => a.status === 'submitted');

export const selectVerifiedAssignments = (state: RootState) =>
  state.projectTemplateAssignments.assignments.filter(a => a.status === 'verified');

export default projectTemplateAssignmentsSlice.reducer;
