import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../index';
import ProjectChecklistsAPI, {
  ProjectChecklist,
  ChecklistStatus,
  UpdateChecklistItemDto,
  VerifyChecklistDto,
  CompletenessCalculation,
  ChecklistFilters,
  AvailableTemplate,
  ChecklistAssignableUser
} from '../../lib/api/project-checklists';

export interface ProjectChecklistsState {
  checklists: ProjectChecklist[];
  selectedChecklist: ProjectChecklist | null;
  completenessData: Record<string, CompletenessCalculation>;
  availableTemplates: AvailableTemplate[];
  checklistAssignableUsers: ChecklistAssignableUser[];
  loading: boolean;
  creating: boolean;
  updating: boolean;
  verifying: boolean;
  uploading: boolean;
  loadingTemplates: boolean;
  loadingChecklistAssignableUsers: boolean;
  assigning: boolean;
  submittingFile: boolean;
  reviewingFile: boolean;
  closingChecklist: boolean;
  loadingVersionHistory: boolean;
  error: string | null;
  filters: {
    projectId: string;
    status: ChecklistStatus | '';
    version: number | null;
  };
  stats: {
    totalChecklists: number;
    completedChecklists: number;
    pendingVerification: number;
    averageCompleteness: number;
  } | null;
}

const initialState: ProjectChecklistsState = {
  checklists: [],
  selectedChecklist: null,
  completenessData: {},
  availableTemplates: [],
  checklistAssignableUsers: [],
  loading: false,
  creating: false,
  updating: false,
  verifying: false,
  uploading: false,
  loadingTemplates: false,
  loadingChecklistAssignableUsers: false,
  assigning: false,
  submittingFile: false,
  reviewingFile: false,
  closingChecklist: false,
  loadingVersionHistory: false,
  error: null,
  filters: {
    projectId: '',
    status: '',
    version: null,
  },
  stats: null,
};

// Async Thunks
export const fetchProjectChecklists = createAsyncThunk(
  'projectChecklists/fetchChecklists',
  async ({ projectId, filters }: { projectId: string; filters?: ChecklistFilters }, { rejectWithValue }) => {
    try {
      const response = await ProjectChecklistsAPI.getProjectChecklists(projectId, filters);
      return { projectId, checklists: response.data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch project checklists');
    }
  }
);

export const fetchProjectChecklist = createAsyncThunk(
  'projectChecklists/fetchChecklist',
  async ({ projectId, checklistId }: { projectId: string; checklistId: string }, { rejectWithValue }) => {
    try {
      const response = await ProjectChecklistsAPI.getProjectChecklist(projectId, checklistId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch project checklist');
    }
  }
);

export const createProjectChecklists = createAsyncThunk(
  'projectChecklists/createChecklists',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const response = await ProjectChecklistsAPI.createProjectChecklists(projectId);
      return { projectId, checklists: response.data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to create project checklists');
    }
  }
);

export const updateChecklistStatus = createAsyncThunk(
  'projectChecklists/updateStatus',
  async ({ projectId, checklistId, status }: { projectId: string; checklistId: string; status: ChecklistStatus }, { rejectWithValue }) => {
    try {
      const response = await ProjectChecklistsAPI.updateChecklistStatus(projectId, checklistId, status);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update checklist status');
    }
  }
);

export const updateChecklistItem = createAsyncThunk(
  'projectChecklists/updateItem',
  async ({ projectId, checklistId, itemId, itemData }: {
    projectId: string;
    checklistId: string;
    itemId: string;
    itemData: UpdateChecklistItemDto;
  }, { rejectWithValue }) => {
    try {
      const response = await ProjectChecklistsAPI.updateChecklistItem(projectId, checklistId, itemId, itemData);
      return { checklistId, itemId, item: response.data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update checklist item');
    }
  }
);

export const verifyChecklist = createAsyncThunk(
  'projectChecklists/verify',
  async ({ projectId, checklistId, verificationData }: {
    projectId: string;
    checklistId: string;
    verificationData: VerifyChecklistDto;
  }, { rejectWithValue }) => {
    try {
      const response = await ProjectChecklistsAPI.verifyChecklist(projectId, checklistId, verificationData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to verify checklist');
    }
  }
);

export const fetchChecklistCompleteness = createAsyncThunk(
  'projectChecklists/fetchCompleteness',
  async ({ projectId, checklistId }: { projectId: string; checklistId: string }, { rejectWithValue }) => {
    try {
      const response = await ProjectChecklistsAPI.getChecklistCompleteness(projectId, checklistId);
      return { checklistId, completeness: response.data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch completeness');
    }
  }
);

export const cloneChecklistVersion = createAsyncThunk(
  'projectChecklists/cloneVersion',
  async ({ projectId, checklistId, reason }: { projectId: string; checklistId: string; reason: string }, { rejectWithValue }) => {
    try {
      const response = await ProjectChecklistsAPI.cloneChecklistVersion(projectId, checklistId, reason);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to clone checklist version');
    }
  }
);

export const uploadItemFile = createAsyncThunk(
  'projectChecklists/uploadFile',
  async ({ projectId, checklistId, itemId, file }: {
    projectId: string;
    checklistId: string;
    itemId: string;
    file: File;
  }, { rejectWithValue }) => {
    try {
      const response = await ProjectChecklistsAPI.uploadItemFile(projectId, checklistId, itemId, file);
      return { checklistId, itemId, file: response.data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to upload file');
    }
  }
);

export const fetchChecklistStats = createAsyncThunk(
  'projectChecklists/fetchStats',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const response = await ProjectChecklistsAPI.getChecklistStats(projectId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch stats');
    }
  }
);

export const fetchAvailableTemplates = createAsyncThunk(
  'projectChecklists/fetchAvailableTemplates',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const response = await ProjectChecklistsAPI.getAvailableTemplates(projectId);
      return response.data; // response.data contains the array of templates
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch available templates');
    }
  }
);

export const assignTemplate = createAsyncThunk(
  'projectChecklists/assignTemplate',
  async (
    { projectId, templateFileId, assignedToUserId, reason }: { projectId: string; templateFileId: string; assignedToUserId?: string; reason?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await ProjectChecklistsAPI.assignTemplate(projectId, templateFileId, assignedToUserId, reason);
      return response.data; // response.data contains the checklist
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to assign template');
    }
  }
);

export const fetchChecklistAssignableUsers = createAsyncThunk(
  'projectChecklists/fetchChecklistAssignableUsers',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const response = await ProjectChecklistsAPI.getAssignableUsersForChecklists(projectId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch assignable users');
    }
  }
);

// ============================================
// File Status Workflow Thunks
// ============================================

export const submitFileForReview = createAsyncThunk(
  'projectChecklists/submitFileForReview',
  async ({ projectId, fileId }: { projectId: string; fileId: string }, { rejectWithValue }) => {
    try {
      const response = await ProjectChecklistsAPI.submitFileForReview(projectId, fileId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to submit file for review');
    }
  }
);

export const markFileUnderReview = createAsyncThunk(
  'projectChecklists/markFileUnderReview',
  async ({ projectId, fileId }: { projectId: string; fileId: string }, { rejectWithValue }) => {
    try {
      const response = await ProjectChecklistsAPI.markFileUnderReview(projectId, fileId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to mark file under review');
    }
  }
);

export const sendFileBackWithRemarks = createAsyncThunk(
  'projectChecklists/sendFileBackWithRemarks',
  async ({ projectId, fileId, remarks }: { projectId: string; fileId: string; remarks: string }, { rejectWithValue }) => {
    try {
      const response = await ProjectChecklistsAPI.sendFileBackWithRemarks(projectId, fileId, remarks);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to send file back');
    }
  }
);

export const verifyFile = createAsyncThunk(
  'projectChecklists/verifyFile',
  async ({ projectId, fileId }: { projectId: string; fileId: string }, { rejectWithValue }) => {
    try {
      const response = await ProjectChecklistsAPI.verifyFile(projectId, fileId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to verify file');
    }
  }
);

export const closeChecklistAndLockFiles = createAsyncThunk(
  'projectChecklists/closeChecklistAndLockFiles',
  async ({ projectId, checklistId }: { projectId: string; checklistId: string }, { rejectWithValue }) => {
    try {
      const response = await ProjectChecklistsAPI.closeChecklistAndLockFiles(projectId, checklistId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to close checklist');
    }
  }
);

export const fetchFileVersionHistory = createAsyncThunk(
  'projectChecklists/fetchFileVersionHistory',
  async ({ projectId, fileId }: { projectId: string; fileId: string }, { rejectWithValue }) => {
    try {
      const response = await ProjectChecklistsAPI.getFileVersionHistory(projectId, fileId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch file version history');
    }
  }
);

export const submitChecklistForReview = createAsyncThunk(
  'projectChecklists/submitChecklistForReview',
  async ({ projectId, checklistId }: { projectId: string; checklistId: string }, { rejectWithValue }) => {
    try {
      const response = await ProjectChecklistsAPI.submitChecklistForReview(projectId, checklistId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to submit checklist for review');
    }
  }
);

// Slice
const projectChecklistsSlice = createSlice({
  name: 'projectChecklists',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = {
        projectId: '',
        status: '',
        version: null,
      };
    },
    setSelectedChecklist: (state, action) => {
      state.selectedChecklist = action.payload;
    },
    clearSelectedChecklist: (state) => {
      state.selectedChecklist = null;
    },
    clearChecklists: (state) => {
      state.checklists = [];
      state.selectedChecklist = null;
      state.completenessData = {};
      state.stats = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Project Checklists
      .addCase(fetchProjectChecklists.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectChecklists.fulfilled, (state, action) => {
        state.loading = false;
        // Ensure items and files are properly initialized
        const checklists = action.payload.checklists.map((checklist: any) => ({
          ...checklist,
          items: checklist.items ? checklist.items.map((item: any) => ({
            ...item,
            files: item.files || []
          })) : []
        }));
        state.checklists = checklists;
        state.filters.projectId = action.payload.projectId;
      })
      .addCase(fetchProjectChecklists.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch Single Checklist
      .addCase(fetchProjectChecklist.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectChecklist.fulfilled, (state, action) => {
        state.loading = false;
        // Ensure items and files are properly initialized
        const checklist = {
          ...action.payload,
          items: action.payload.items ? action.payload.items.map((item: any) => ({
            ...item,
            files: item.files || []
          })) : []
        };
        state.selectedChecklist = checklist;
        
        // Update checklist in list if it exists
        const index = state.checklists.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.checklists[index] = checklist;
        }
      })
      .addCase(fetchProjectChecklist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Create Project Checklists
      .addCase(createProjectChecklists.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createProjectChecklists.fulfilled, (state, action) => {
        state.creating = false;
        state.checklists = action.payload.checklists;
      })
      .addCase(createProjectChecklists.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      })

      // Update Checklist Status
      .addCase(updateChecklistStatus.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateChecklistStatus.fulfilled, (state, action) => {
        state.updating = false;
        
        // Update checklist in list
        const index = state.checklists.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.checklists[index] = action.payload;
        }
        
        // Update selected checklist if it matches
        if (state.selectedChecklist?.id === action.payload.id) {
          state.selectedChecklist = action.payload;
        }
      })
      .addCase(updateChecklistStatus.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      // Update Checklist Item
      .addCase(updateChecklistItem.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateChecklistItem.fulfilled, (state, action) => {
        state.updating = false;
        const { checklistId, itemId, item } = action.payload;
        
        // Update item in selected checklist
        if (state.selectedChecklist?.id === checklistId && state.selectedChecklist.items) {
          const itemIndex = state.selectedChecklist.items.findIndex(i => i.id === itemId);
          if (itemIndex !== -1) {
            state.selectedChecklist.items[itemIndex] = item;
          }
        }
      })
      .addCase(updateChecklistItem.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      // Verify Checklist
      .addCase(verifyChecklist.pending, (state) => {
        state.verifying = true;
        state.error = null;
      })
      .addCase(verifyChecklist.fulfilled, (state, action) => {
        state.verifying = false;
        
        // Update checklist in list
        const index = state.checklists.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.checklists[index] = action.payload;
        }
        
        // Update selected checklist if it matches
        if (state.selectedChecklist?.id === action.payload.id) {
          state.selectedChecklist = action.payload;
        }
      })
      .addCase(verifyChecklist.rejected, (state, action) => {
        state.verifying = false;
        state.error = action.payload as string;
      })

      // Fetch Completeness
      .addCase(fetchChecklistCompleteness.fulfilled, (state, action) => {
        const { checklistId, completeness } = action.payload;
        state.completenessData[checklistId] = completeness;
      })

      // Clone Checklist Version
      .addCase(cloneChecklistVersion.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(cloneChecklistVersion.fulfilled, (state, action) => {
        state.creating = false;
        state.checklists.push(action.payload);
      })
      .addCase(cloneChecklistVersion.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      })

      // Upload File
      .addCase(uploadItemFile.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(uploadItemFile.fulfilled, (state, action) => {
        state.uploading = false;
        const { checklistId, itemId, file } = action.payload;
        
        // Add file to item in selected checklist
        if (state.selectedChecklist?.id === checklistId && state.selectedChecklist.items) {
          const item = state.selectedChecklist.items.find(i => i.id === itemId);
          if (item) {
            if (!item.files) {
              item.files = [];
            }
            item.files.push(file);
          }
        }
        
        // Also update the checklist in the checklists array
        const checklistIndex = state.checklists.findIndex(c => c.id === checklistId);
        if (checklistIndex !== -1 && state.checklists[checklistIndex].items) {
          const item = state.checklists[checklistIndex].items.find((i: any) => i.id === itemId);
          if (item) {
            if (!item.files) {
              item.files = [];
            }
            item.files.push(file);
          }
        }
      })
      .addCase(uploadItemFile.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload as string;
      })

      // Fetch Stats
      .addCase(fetchChecklistStats.fulfilled, (state, action) => {
        state.stats = action.payload;
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
      // Assign Template
      .addCase(assignTemplate.pending, (state) => {
        state.assigning = true;
        state.error = null;
      })
      .addCase(assignTemplate.fulfilled, (state, action) => {
        state.assigning = false;
        // Check if checklist already exists in the list, if not add it
        const existingIndex = state.checklists.findIndex(c => c.id === action.payload.id);
        if (existingIndex === -1) {
          state.checklists.push(action.payload);
        } else {
          state.checklists[existingIndex] = action.payload;
        }
        // Remove the assigned template from available templates
        state.availableTemplates = state.availableTemplates.filter(
          template => template.id !== action.payload.template?.id
        );
      })
      .addCase(assignTemplate.rejected, (state, action) => {
        state.assigning = false;
        state.error = action.payload as string;
      })

      // Fetch Checklist Assignable Users
      .addCase(fetchChecklistAssignableUsers.pending, (state) => {
        state.loadingChecklistAssignableUsers = true;
      })
      .addCase(fetchChecklistAssignableUsers.fulfilled, (state, action) => {
        state.loadingChecklistAssignableUsers = false;
        state.checklistAssignableUsers = action.payload;
      })
      .addCase(fetchChecklistAssignableUsers.rejected, (state, action) => {
        state.loadingChecklistAssignableUsers = false;
        state.error = action.payload as string;
      })

      // ============================================
      // File Status Workflow Reducers
      // ============================================

      // Submit File for Review
      .addCase(submitFileForReview.pending, (state) => {
        state.submittingFile = true;
        state.error = null;
      })
      .addCase(submitFileForReview.fulfilled, (state) => {
        state.submittingFile = false;
        // Optionally refetch checklist to get updated file status
      })
      .addCase(submitFileForReview.rejected, (state, action) => {
        state.submittingFile = false;
        state.error = action.payload as string;
      })

      // Mark File Under Review
      .addCase(markFileUnderReview.pending, (state) => {
        state.reviewingFile = true;
        state.error = null;
      })
      .addCase(markFileUnderReview.fulfilled, (state) => {
        state.reviewingFile = false;
      })
      .addCase(markFileUnderReview.rejected, (state, action) => {
        state.reviewingFile = false;
        state.error = action.payload as string;
      })

      // Send File Back with Remarks
      .addCase(sendFileBackWithRemarks.pending, (state) => {
        state.reviewingFile = true;
        state.error = null;
      })
      .addCase(sendFileBackWithRemarks.fulfilled, (state) => {
        state.reviewingFile = false;
      })
      .addCase(sendFileBackWithRemarks.rejected, (state, action) => {
        state.reviewingFile = false;
        state.error = action.payload as string;
      })

      // Verify File
      .addCase(verifyFile.pending, (state) => {
        state.verifying = true;
        state.error = null;
      })
      .addCase(verifyFile.fulfilled, (state) => {
        state.verifying = false;
      })
      .addCase(verifyFile.rejected, (state, action) => {
        state.verifying = false;
        state.error = action.payload as string;
      })

      // Close Checklist and Lock Files
      .addCase(closeChecklistAndLockFiles.pending, (state) => {
        state.closingChecklist = true;
        state.error = null;
      })
      .addCase(closeChecklistAndLockFiles.fulfilled, (state, action) => {
        state.closingChecklist = false;
        // Update the checklist in the state
        const checklistIndex = state.checklists.findIndex(c => c.id === action.payload.checklist.id);
        if (checklistIndex !== -1) {
          state.checklists[checklistIndex] = action.payload.checklist;
        }
        if (state.selectedChecklist?.id === action.payload.checklist.id) {
          state.selectedChecklist = action.payload.checklist;
        }
      })
      .addCase(closeChecklistAndLockFiles.rejected, (state, action) => {
        state.closingChecklist = false;
        state.error = action.payload as string;
      })

      // Fetch File Version History
      .addCase(fetchFileVersionHistory.pending, (state) => {
        state.loadingVersionHistory = true;
        state.error = null;
      })
      .addCase(fetchFileVersionHistory.fulfilled, (state) => {
        state.loadingVersionHistory = false;
        // Version history can be stored if needed
      })
      .addCase(fetchFileVersionHistory.rejected, (state, action) => {
        state.loadingVersionHistory = false;
        state.error = action.payload as string;
      })

      // Submit Checklist for Review
      .addCase(submitChecklistForReview.pending, (state) => {
        state.submittingFile = true;
        state.error = null;
      })
      .addCase(submitChecklistForReview.fulfilled, (state) => {
        state.submittingFile = false;
        // Update checklist status if returned
      })
      .addCase(submitChecklistForReview.rejected, (state, action) => {
        state.submittingFile = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  clearError, 
  setFilters, 
  resetFilters, 
  setSelectedChecklist, 
  clearSelectedChecklist,
  clearChecklists
} = projectChecklistsSlice.actions;

// Selectors
export const selectProjectChecklists = (state: RootState) => state.projectChecklists.checklists;
export const selectSelectedChecklist = (state: RootState) => state.projectChecklists.selectedChecklist;
export const selectChecklistsLoading = (state: RootState) => state.projectChecklists.loading;
export const selectChecklistsCreating = (state: RootState) => state.projectChecklists.creating;
export const selectChecklistsUpdating = (state: RootState) => state.projectChecklists.updating;
export const selectChecklistsVerifying = (state: RootState) => state.projectChecklists.verifying;
export const selectChecklistsUploading = (state: RootState) => state.projectChecklists.uploading;
export const selectChecklistsError = (state: RootState) => state.projectChecklists.error;
export const selectChecklistsFilters = (state: RootState) => state.projectChecklists.filters;
export const selectChecklistStats = (state: RootState) => state.projectChecklists.stats;
export const selectCompletenessData = (state: RootState) => state.projectChecklists.completenessData;
export const selectAvailableTemplates = (state: RootState) => state.projectChecklists.availableTemplates;
export const selectTemplatesLoading = (state: RootState) => state.projectChecklists.loadingTemplates;
export const selectTemplateAssigning = (state: RootState) => state.projectChecklists.assigning;
export const selectChecklistAssignableUsers = (state: RootState) => state.projectChecklists.checklistAssignableUsers;
export const selectChecklistAssignableUsersLoading = (state: RootState) => state.projectChecklists.loadingChecklistAssignableUsers;

// Filtered selectors
export const selectFilteredChecklists = (state: RootState) => {
  const { checklists, filters } = state.projectChecklists;
  return checklists.filter(checklist => {
    const statusMatch = !filters.status || checklist.status === filters.status;
    const versionMatch = !filters.version || checklist.version === filters.version;
    
    return statusMatch && versionMatch;
  });
};

export const selectChecklistsByStatus = (state: RootState) => {
  const checklists = selectFilteredChecklists(state);
  return checklists.reduce((acc, checklist) => {
    if (!acc[checklist.status]) {
      acc[checklist.status] = [];
    }
    acc[checklist.status].push(checklist);
    return acc;
  }, {} as Record<ChecklistStatus, ProjectChecklist[]>);
};

export default projectChecklistsSlice.reducer;