import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import projectTasksApi, {
  Task,
  TaskFilters,
  CreateTaskDto,
  UpdateTaskDto,
  GenerateTasksFromScopeDto,
  TaskStatus,
  TaskStats,
  AssignableUser,
  ProjectForDropdown,
  ProjectService,
  UnlockRequest
} from '../../lib/api/project-tasks';

export interface ProjectTasksState {
  tasks: Task[];
  projectTasks: Task[];  // Tasks for a specific project
  myTasks: Task[];
  selectedTask: Task | null;
  assignableUsers: AssignableUser[];
  projects: ProjectForDropdown[];
  projectServices: ProjectService[];
  loading: boolean;
  loadingProjectTasks: boolean;  // Loading state for project-specific tasks
  creating: boolean;
  updating: boolean;
  reassigning: boolean;
  generatingFromScope: boolean;
  loadingAssignableUsers: boolean;
  loadingProjects: boolean;
  loadingProjectServices: boolean;
  pendingUnlockRequests: UnlockRequest[];
  loadingUnlockRequests: boolean;
  submittingUnlockRequest: boolean;
  reviewingUnlockRequest: boolean;
  error: string | null;
  filters: TaskFilters;
  stats: TaskStats | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const initialState: ProjectTasksState = {
  tasks: [],
  projectTasks: [],
  myTasks: [],
  selectedTask: null,
  assignableUsers: [],
  projects: [],
  projectServices: [],
  loading: false,
  loadingProjectTasks: false,
  creating: false,
  updating: false,
  reassigning: false,
  generatingFromScope: false,
  loadingAssignableUsers: false,
  loadingProjects: false,
  loadingProjectServices: false,
  pendingUnlockRequests: [],
  loadingUnlockRequests: false,
  submittingUnlockRequest: false,
  reviewingUnlockRequest: false,
  error: null,
  filters: {},
  stats: null,
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  }
};

// Async Thunks

// Fetch all tasks with filters
export const fetchTasks = createAsyncThunk(
  'projectTasks/fetchTasks',
  async (
    params: {
      filters?: TaskFilters;
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await projectTasksApi.getTasks(
        params.filters,
        params.page,
        params.pageSize,
        params.sortBy,
        params.sortOrder
      );
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch tasks');
    }
  }
);

// Fetch tasks for a specific project (simplified for project-level view)
export const fetchProjectTasks = createAsyncThunk(
  'projectTasks/fetchProjectTasks',
  async (
    params: { projectId: string; page?: number; pageSize?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await projectTasksApi.getProjectTasks(
        params.projectId,
        undefined,
        params.page || 1,
        params.pageSize || 10
      );
      return { ...response, projectId: params.projectId };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch project tasks');
    }
  }
);

// Fetch task by ID
export const fetchTaskById = createAsyncThunk(
  'projectTasks/fetchTaskById',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await projectTasksApi.getTaskById(taskId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch task');
    }
  }
);

// Fetch current user's tasks
export const fetchMyTasks = createAsyncThunk(
  'projectTasks/fetchMyTasks',
  async (
    params: { filters?: Omit<TaskFilters, 'assigneeId'>; page?: number; pageSize?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await projectTasksApi.getMyTasks(params.filters, params.page, params.pageSize);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch my tasks');
    }
  }
);

// Create a new task
export const createTask = createAsyncThunk(
  'projectTasks/createTask',
  async (taskData: CreateTaskDto, { rejectWithValue }) => {
    try {
      const response = await projectTasksApi.createTask(taskData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to create task');
    }
  }
);

// Update a task
export const updateTask = createAsyncThunk(
  'projectTasks/updateTask',
  async ({ taskId, data }: { taskId: string; data: UpdateTaskDto }, { rejectWithValue }) => {
    try {
      const response = await projectTasksApi.updateTask(taskId, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update task');
    }
  }
);

// Update task status
export const updateTaskStatus = createAsyncThunk(
  'projectTasks/updateTaskStatus',
  async (
    { taskId, status, blockedReason }: { taskId: string; status: TaskStatus; blockedReason?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await projectTasksApi.updateTaskStatus(taskId, status, blockedReason);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update task status');
    }
  }
);

// Reassign task
export const reassignTask = createAsyncThunk(
  'projectTasks/reassignTask',
  async ({ taskId, assigneeId }: { taskId: string; assigneeId: string }, { rejectWithValue }) => {
    try {
      const response = await projectTasksApi.reassignTask(taskId, assigneeId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to reassign task');
    }
  }
);

// Generate tasks from scope
export const generateTasksFromScope = createAsyncThunk(
  'projectTasks/generateTasksFromScope',
  async (scopeData: GenerateTasksFromScopeDto, { rejectWithValue }) => {
    try {
      const response = await projectTasksApi.generateTasksFromScope(scopeData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to generate tasks from scope');
    }
  }
);

// Fetch assignable users
export const fetchAssignableUsers = createAsyncThunk(
  'projectTasks/fetchAssignableUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await projectTasksApi.getAssignableUsers();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch assignable users');
    }
  }
);

// Fetch task stats
export const fetchTaskStats = createAsyncThunk(
  'projectTasks/fetchTaskStats',
  async (params: { projectId?: string; taskType?: string } | undefined, { rejectWithValue }) => {
    try {
      const response = await projectTasksApi.getTaskStats(params?.projectId, params?.taskType);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch task stats');
    }
  }
);

// Fetch all projects for dropdown
export const fetchProjects = createAsyncThunk(
  'projectTasks/fetchProjects',
  async (_, { rejectWithValue }) => {
    try {
      const response = await projectTasksApi.getProjects();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch projects');
    }
  }
);

// Fetch services for a specific project
export const fetchProjectServices = createAsyncThunk(
  'projectTasks/fetchProjectServices',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const services = await projectTasksApi.getProjectServices(projectId);
      return services;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch project services');
    }
  }
);

// Request unlock for a locked task
export const requestTaskUnlock = createAsyncThunk(
  'projectTasks/requestTaskUnlock',
  async ({ taskId, reason }: { taskId: string; reason: string }, { rejectWithValue }) => {
    try {
      const response = await projectTasksApi.requestUnlock(taskId, reason);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to submit unlock request');
    }
  }
);

// Review (approve/reject) an unlock request
export const reviewUnlockRequest = createAsyncThunk(
  'projectTasks/reviewUnlockRequest',
  async (
    { requestId, decision, reviewNote }: { requestId: string; decision: 'approved' | 'rejected'; reviewNote?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await projectTasksApi.reviewUnlockRequest(requestId, decision, reviewNote);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to review unlock request');
    }
  }
);

// Direct unlock a task (admin action)
export const directUnlockTask = createAsyncThunk(
  'projectTasks/directUnlockTask',
  async ({ taskId }: { taskId: string }, { rejectWithValue }) => {
    try {
      const response = await projectTasksApi.directUnlock(taskId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to unlock task');
    }
  }
);

// Manually lock a task (admin action)
export const manualLockTask = createAsyncThunk(
  'projectTasks/manualLockTask',
  async ({ taskId }: { taskId: string }, { rejectWithValue }) => {
    try {
      const response = await projectTasksApi.manualLock(taskId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to lock task');
    }
  }
);

// Fetch all pending unlock requests (admin view)
export const fetchPendingUnlockRequests = createAsyncThunk(
  'projectTasks/fetchPendingUnlockRequests',
  async (params: { page?: number; pageSize?: number } | undefined, { rejectWithValue }) => {
    try {
      const response = await projectTasksApi.getPendingUnlockRequests(params?.page, params?.pageSize);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch pending unlock requests');
    }
  }
);

// Slice
const projectTasksSlice = createSlice({
  name: 'projectTasks',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<TaskFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = {};
    },
    setSelectedTask: (state, action: PayloadAction<Task | null>) => {
      state.selectedTask = action.payload;
    },
    clearSelectedTask: (state) => {
      state.selectedTask = null;
    },
    clearTasks: (state) => {
      state.tasks = [];
      state.selectedTask = null;
      state.stats = null;
      state.pagination = {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0
      };
    },
    // Optimistic update for status change
    optimisticStatusUpdate: (state, action: PayloadAction<{ taskId: string; status: TaskStatus }>) => {
      const { taskId, status } = action.payload;
      const taskIndex = state.tasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        state.tasks[taskIndex].status = status;
      }
      if (state.selectedTask?.id === taskId) {
        state.selectedTask.status = status;
      }
      const myTaskIndex = state.myTasks.findIndex(t => t.id === taskId);
      if (myTaskIndex !== -1) {
        state.myTasks[myTaskIndex].status = status;
      }
    },
    // Clear project services when project changes
    clearProjectServices: (state) => {
      state.projectServices = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Tasks
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload.data;
        state.pagination = {
          page: action.payload.meta.page,
          pageSize: action.payload.meta.pageSize,
          total: action.payload.meta.total,
          totalPages: action.payload.meta.totalPages
        };
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch Project Tasks (for project-level view)
      .addCase(fetchProjectTasks.pending, (state) => {
        state.loadingProjectTasks = true;
        state.error = null;
      })
      .addCase(fetchProjectTasks.fulfilled, (state, action) => {
        state.loadingProjectTasks = false;
        state.projectTasks = action.payload.data;
        state.stats = action.payload.meta.stats || null;
        state.pagination = {
          page: action.payload.meta.page,
          pageSize: action.payload.meta.pageSize,
          total: action.payload.meta.total,
          totalPages: action.payload.meta.totalPages
        };
      })
      .addCase(fetchProjectTasks.rejected, (state, action) => {
        state.loadingProjectTasks = false;
        state.error = action.payload as string;
      })

      // Fetch Task By ID
      .addCase(fetchTaskById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTaskById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedTask = action.payload;
        // Update in list if exists
        const index = state.tasks.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      })
      .addCase(fetchTaskById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch My Tasks
      .addCase(fetchMyTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.myTasks = action.payload.data;
      })
      .addCase(fetchMyTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Create Task
      .addCase(createTask.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.creating = false;
        state.tasks.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(createTask.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      })

      // Update Task
      .addCase(updateTask.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.updating = false;
        const index = state.tasks.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
        if (state.selectedTask?.id === action.payload.id) {
          state.selectedTask = action.payload;
        }
        const myTaskIndex = state.myTasks.findIndex(t => t.id === action.payload.id);
        if (myTaskIndex !== -1) {
          state.myTasks[myTaskIndex] = action.payload;
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      // Update Task Status
      .addCase(updateTaskStatus.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateTaskStatus.fulfilled, (state, action) => {
        state.updating = false;
        const index = state.tasks.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
        if (state.selectedTask?.id === action.payload.id) {
          state.selectedTask = action.payload;
        }
        const myTaskIndex = state.myTasks.findIndex(t => t.id === action.payload.id);
        if (myTaskIndex !== -1) {
          state.myTasks[myTaskIndex] = action.payload;
        }
      })
      .addCase(updateTaskStatus.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      // Reassign Task
      .addCase(reassignTask.pending, (state) => {
        state.reassigning = true;
        state.error = null;
      })
      .addCase(reassignTask.fulfilled, (state, action) => {
        state.reassigning = false;
        const index = state.tasks.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
        if (state.selectedTask?.id === action.payload.id) {
          state.selectedTask = action.payload;
        }
      })
      .addCase(reassignTask.rejected, (state, action) => {
        state.reassigning = false;
        state.error = action.payload as string;
      })

      // Generate Tasks From Scope
      .addCase(generateTasksFromScope.pending, (state) => {
        state.generatingFromScope = true;
        state.error = null;
      })
      .addCase(generateTasksFromScope.fulfilled, (state, action) => {
        state.generatingFromScope = false;
        state.tasks = [...action.payload, ...state.tasks];
        state.pagination.total += action.payload.length;
      })
      .addCase(generateTasksFromScope.rejected, (state, action) => {
        state.generatingFromScope = false;
        state.error = action.payload as string;
      })

      // Fetch Assignable Users
      .addCase(fetchAssignableUsers.pending, (state) => {
        state.loadingAssignableUsers = true;
        state.error = null;
      })
      .addCase(fetchAssignableUsers.fulfilled, (state, action) => {
        state.loadingAssignableUsers = false;
        state.assignableUsers = action.payload;
      })
      .addCase(fetchAssignableUsers.rejected, (state, action) => {
        state.loadingAssignableUsers = false;
        state.error = action.payload as string;
      })

      // Fetch Task Stats
      .addCase(fetchTaskStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })

      // Fetch Projects
      .addCase(fetchProjects.pending, (state) => {
        state.loadingProjects = true;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loadingProjects = false;
        state.projects = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loadingProjects = false;
        state.error = action.payload as string;
      })

      // Fetch Project Services
      .addCase(fetchProjectServices.pending, (state) => {
        state.loadingProjectServices = true;
      })
      .addCase(fetchProjectServices.fulfilled, (state, action) => {
        state.loadingProjectServices = false;
        state.projectServices = action.payload;
      })
      .addCase(fetchProjectServices.rejected, (state, action) => {
        state.loadingProjectServices = false;
        state.error = action.payload as string;
      })

      // Request Task Unlock
      .addCase(requestTaskUnlock.pending, (state) => {
        state.submittingUnlockRequest = true;
        state.error = null;
      })
      .addCase(requestTaskUnlock.fulfilled, (state, action) => {
        state.submittingUnlockRequest = false;
        const newRequest = action.payload;
        const taskId = newRequest.taskId;

        // Helper to add the unlock request to a task's unlockRequests array
        const addUnlockRequest = (task: Task) => {
          if (task.id === taskId) {
            task.unlockRequests = [newRequest, ...(task.unlockRequests || [])];
          }
        };

        // Update in all task lists so UI shows "Request Pending" immediately
        state.tasks.forEach(addUnlockRequest);
        state.projectTasks.forEach(addUnlockRequest);
        state.myTasks.forEach(addUnlockRequest);

        if (state.selectedTask?.id === taskId) {
          state.selectedTask.unlockRequests = [
            newRequest,
            ...(state.selectedTask.unlockRequests || [])
          ];
        }
      })
      .addCase(requestTaskUnlock.rejected, (state, action) => {
        state.submittingUnlockRequest = false;
        state.error = action.payload as string;
      })

      // Review Unlock Request
      .addCase(reviewUnlockRequest.pending, (state) => {
        state.reviewingUnlockRequest = true;
        state.error = null;
      })
      .addCase(reviewUnlockRequest.fulfilled, (state, action) => {
        state.reviewingUnlockRequest = false;
        const reviewed = action.payload;
        const isApproved = reviewed.status === 'approved';
        const taskId = reviewed.taskId;

        // Remove from pending list
        state.pendingUnlockRequests = state.pendingUnlockRequests.filter(
          r => r.id !== reviewed.id
        );

        // Update the unlock request status in task's unlockRequests array
        // This is critical: after rejection, changes 'pending' to 'rejected'
        // so the UI shows "Request Unlock" instead of "Request Pending"
        const updateUnlockRequestInTask = (task: Task) => {
          if (task.id === taskId && task.unlockRequests) {
            task.unlockRequests = task.unlockRequests.map(r =>
              r.id === reviewed.id ? { ...r, status: reviewed.status } : r
            );
          }
        };

        state.tasks.forEach(updateUnlockRequestInTask);
        state.projectTasks.forEach(updateUnlockRequestInTask);
        state.myTasks.forEach(updateUnlockRequestInTask);
        if (state.selectedTask?.id === taskId && state.selectedTask.unlockRequests) {
          state.selectedTask.unlockRequests = state.selectedTask.unlockRequests.map(r =>
            r.id === reviewed.id ? { ...r, status: reviewed.status } : r
          );
        }

        // If approved, also unlock the task across all lists
        if (isApproved) {
          const updateLock = (task: Task) => {
            if (task.id === taskId) {
              task.isLocked = false;
              task.lockedAt = null;
            }
          };

          state.tasks.forEach(updateLock);
          state.projectTasks.forEach(updateLock);
          state.myTasks.forEach(updateLock);
          if (state.selectedTask?.id === taskId) {
            state.selectedTask.isLocked = false;
            state.selectedTask.lockedAt = null;
          }
        }
      })
      .addCase(reviewUnlockRequest.rejected, (state, action) => {
        state.reviewingUnlockRequest = false;
        state.error = action.payload as string;
      })

      // Manual Lock Task (admin)
      .addCase(manualLockTask.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(manualLockTask.fulfilled, (state, action) => {
        state.updating = false;
        const lockedTask = action.payload;
        const taskId = lockedTask.id;

        const updateLock = (task: Task) => {
          if (task.id === taskId) {
            task.isLocked = true;
            task.lockedAt = lockedTask.lockedAt || new Date().toISOString();
          }
        };

        state.tasks.forEach(updateLock);
        state.projectTasks.forEach(updateLock);
        state.myTasks.forEach(updateLock);
        if (state.selectedTask?.id === taskId) {
          state.selectedTask.isLocked = true;
          state.selectedTask.lockedAt = lockedTask.lockedAt || new Date().toISOString();
        }
      })
      .addCase(manualLockTask.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      // Direct Unlock Task (admin)
      .addCase(directUnlockTask.pending, (state) => {
        state.reviewingUnlockRequest = true;
        state.error = null;
      })
      .addCase(directUnlockTask.fulfilled, (state, action) => {
        state.reviewingUnlockRequest = false;
        const unlockedTask = action.payload;
        const taskId = unlockedTask.id;

        // Update isLocked across all task lists
        const updateLock = (task: Task) => {
          if (task.id === taskId) {
            task.isLocked = false;
            task.lockedAt = null;
          }
        };

        state.tasks.forEach(updateLock);
        state.projectTasks.forEach(updateLock);
        state.myTasks.forEach(updateLock);
        if (state.selectedTask?.id === taskId) {
          state.selectedTask.isLocked = false;
          state.selectedTask.lockedAt = null;
        }

        // Also remove any related pending unlock requests
        state.pendingUnlockRequests = state.pendingUnlockRequests.filter(
          r => r.taskId !== taskId
        );
      })
      .addCase(directUnlockTask.rejected, (state, action) => {
        state.reviewingUnlockRequest = false;
        state.error = action.payload as string;
      })

      // Fetch Pending Unlock Requests
      .addCase(fetchPendingUnlockRequests.pending, (state) => {
        state.loadingUnlockRequests = true;
        state.error = null;
      })
      .addCase(fetchPendingUnlockRequests.fulfilled, (state, action) => {
        state.loadingUnlockRequests = false;
        state.pendingUnlockRequests = action.payload;
      })
      .addCase(fetchPendingUnlockRequests.rejected, (state, action) => {
        state.loadingUnlockRequests = false;
        state.error = action.payload as string;
      });
  }
});

export const {
  clearError,
  setFilters,
  resetFilters,
  setSelectedTask,
  clearSelectedTask,
  clearTasks,
  optimisticStatusUpdate,
  clearProjectServices
} = projectTasksSlice.actions;

// Selectors
export const selectTasks = (state: RootState) => state.projectTasks.tasks;
export const selectProjectTasks = (state: RootState) => state.projectTasks.projectTasks;
export const selectMyTasks = (state: RootState) => state.projectTasks.myTasks;
export const selectSelectedTask = (state: RootState) => state.projectTasks.selectedTask;
export const selectAssignableUsers = (state: RootState) => state.projectTasks.assignableUsers;
export const selectTasksLoading = (state: RootState) => state.projectTasks.loading;
export const selectProjectTasksLoading = (state: RootState) => state.projectTasks.loadingProjectTasks;
export const selectTasksCreating = (state: RootState) => state.projectTasks.creating;
export const selectTasksUpdating = (state: RootState) => state.projectTasks.updating;
export const selectTasksReassigning = (state: RootState) => state.projectTasks.reassigning;
export const selectGeneratingFromScope = (state: RootState) => state.projectTasks.generatingFromScope;
export const selectLoadingAssignableUsers = (state: RootState) => state.projectTasks.loadingAssignableUsers;
export const selectTasksError = (state: RootState) => state.projectTasks.error;
export const selectTaskFilters = (state: RootState) => state.projectTasks.filters;
export const selectTaskStats = (state: RootState) => state.projectTasks.stats;
export const selectTaskPagination = (state: RootState) => state.projectTasks.pagination;
export const selectProjects = (state: RootState) => state.projectTasks.projects;
export const selectProjectServices = (state: RootState) => state.projectTasks.projectServices;
export const selectLoadingProjects = (state: RootState) => state.projectTasks.loadingProjects;
export const selectLoadingProjectServices = (state: RootState) => state.projectTasks.loadingProjectServices;
export const selectPendingUnlockRequests = (state: RootState) => state.projectTasks.pendingUnlockRequests;
export const selectLoadingUnlockRequests = (state: RootState) => state.projectTasks.loadingUnlockRequests;
export const selectSubmittingUnlockRequest = (state: RootState) => state.projectTasks.submittingUnlockRequest;
export const selectReviewingUnlockRequest = (state: RootState) => state.projectTasks.reviewingUnlockRequest;

// Filtered selectors
export const selectTasksByStatus = (state: RootState) => {
  const tasks = state.projectTasks.tasks;
  return {
    to_do: tasks.filter(t => t.status === 'to_do'),
    doing: tasks.filter(t => t.status === 'doing'),
    blocked: tasks.filter(t => t.status === 'blocked'),
    done: tasks.filter(t => t.status === 'done')
  };
};

export const selectTasksBySla = (state: RootState) => {
  const tasks = state.projectTasks.tasks;
  return {
    on_track: tasks.filter(t => t.slaStatus === 'on_track'),
    due_today: tasks.filter(t => t.slaStatus === 'due_today'),
    overdue: tasks.filter(t => t.slaStatus === 'overdue')
  };
};

export const selectTasksByPriority = (state: RootState) => {
  const tasks = state.projectTasks.tasks;
  return {
    high: tasks.filter(t => t.priority === 'high'),
    medium: tasks.filter(t => t.priority === 'medium'),
    low: tasks.filter(t => t.priority === 'low')
  };
};

export default projectTasksSlice.reducer;
