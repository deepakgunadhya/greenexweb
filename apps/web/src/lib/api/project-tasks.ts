import apiClient from './client';

// Types
export type TaskStatus = 'to_do' | 'doing' | 'blocked' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type SlaStatus = 'on_track' | 'due_today' | 'overdue';
export type TaskType = 'project' | 'general';
export type UnlockRequestStatus = 'pending' | 'approved' | 'rejected';

// Project type for dropdown
export interface ProjectForDropdown {
  id: string;
  projectNumber: string;
  name: string;
  organizationId: string;
  status: string;
  organization?: {
    id: string;
    name: string;
  };
  projectServices?: {
    id: string;
    service: {
      id: string;
      name: string;
      category: string;
    };
  }[];
}

// Service type from project
export interface ProjectService {
  id: string;
  name: string;
  category: string;
}

export interface Task {
  id: string;
  projectId?: string | null;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  slaStatus: SlaStatus;
  taskType: TaskType;
  dueDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  notes?: string;
  blockedReason?: string;
  checklistLink?: string;
  serviceId?: string;
  isLocked: boolean;
  lockedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  project?: {
    id: string;
    projectNumber: string;
    name: string;
  } | null;
  service?: {
    id: string;
    name: string;
    category: string;
  };
  unlockRequests?: UnlockRequest[];
}

export interface UnlockRequest {
  id: string;
  taskId: string;
  reason: string;
  status: UnlockRequestStatus;
  reviewNote?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  requestedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  reviewedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  task: {
    id: string;
    title: string;
    projectId?: string | null;
    dueDate?: string;
    project?: {
      id: string;
      name: string;
      projectNumber: string;
    } | null;
    assignee?: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
  };
}

export interface TaskFilters {
  projectId?: string;
  assigneeId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  slaStatus?: SlaStatus;
  serviceId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
  taskType?: TaskType;
}

export interface CreateTaskDto {
  projectId?: string;
  title: string;
  description?: string;
  assigneeId: string;
  serviceId?: string;
  checklistLink?: string;
  dueDate?: string;
  priority?: TaskPriority;
  notes?: string;
  taskType?: TaskType;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  assigneeId?: string;
  serviceId?: string;
  checklistLink?: string;
  dueDate?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  blockedReason?: string;
  notes?: string;
  estimatedHours?: number;
  actualHours?: number;
}

export interface GenerateTasksFromScopeDto {
  projectId: string;
  scopeText: string;
  defaultAssigneeId?: string;
  defaultPriority?: TaskPriority;
  defaultDueDate?: string;
}

export interface TaskStats {
  total: number;
  byStatus: {
    to_do: number;
    doing: number;
    blocked: number;
    done: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
  };
  bySla: {
    on_track: number;
    due_today: number;
    overdue: number;
  };
  unassigned: number;
}

export interface AssignableUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: {
    id: string;
    name: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    stats?: TaskStats;
  };
}

export interface SingleResponse<T> {
  success: boolean;
  data: T;
}

// API Functions
const projectTasksApi = {
  /**
   * Get all tasks with filtering and pagination
   */
  getTasks: async (
    filters?: TaskFilters,
    page = 1,
    pageSize = 20,
    sortBy = 'dueDate',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<PaginatedResponse<Task>> => {
    const params = new URLSearchParams();

    if (filters?.projectId) params.append('projectId', filters.projectId);
    if (filters?.assigneeId) params.append('assigneeId', filters.assigneeId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.slaStatus) params.append('slaStatus', filters.slaStatus);
    if (filters?.serviceId) params.append('serviceId', filters.serviceId);
    if (filters?.dueDateFrom) params.append('dueDateFrom', filters.dueDateFrom);
    if (filters?.dueDateTo) params.append('dueDateTo', filters.dueDateTo);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.taskType) params.append('taskType', filters.taskType);

    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());
    params.append('sortBy', sortBy);
    params.append('sortOrder', sortOrder);

    const response = await apiClient.get(`/tasks?${params.toString()}`);
    return {
      data: response.data.data,
      meta: response.data.meta
    };
  },

  /**
   * Get task by ID
   */
  getTaskById: async (taskId: string): Promise<SingleResponse<Task>> => {
    const response = await apiClient.get(`/tasks/${taskId}`);
    return response.data;
  },

  /**
   * Get tasks for a specific project with stats
   */
  getProjectTasks: async (
    projectId: string,
    filters?: Omit<TaskFilters, 'projectId'>,
    page = 1,
    pageSize = 50
  ): Promise<PaginatedResponse<Task>> => {
    const params = new URLSearchParams();

    if (filters?.assigneeId) params.append('assigneeId', filters.assigneeId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.slaStatus) params.append('slaStatus', filters.slaStatus);

    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());

    const response = await apiClient.get(`/tasks/project/${projectId}?${params.toString()}`);
    return {
      data: response.data.data,
      meta: response.data.meta
    };
  },

  /**
   * Get tasks assigned to current user
   */
  getMyTasks: async (
    filters?: Omit<TaskFilters, 'assigneeId'>,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResponse<Task>> => {
    const params = new URLSearchParams();

    if (filters?.projectId) params.append('projectId', filters.projectId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.slaStatus) params.append('slaStatus', filters.slaStatus);

    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());

    const response = await apiClient.get(`/tasks/my-tasks?${params.toString()}`);
    return {
      data: response.data.data,
      meta: response.data.meta
    };
  },

  /**
   * Create a new task
   */
  createTask: async (data: CreateTaskDto): Promise<SingleResponse<Task>> => {
    const response = await apiClient.post('/tasks', data);
    return response.data;
  },

  /**
   * Update a task
   */
  updateTask: async (taskId: string, data: UpdateTaskDto): Promise<SingleResponse<Task>> => {
    const response = await apiClient.put(`/tasks/${taskId}`, data);
    return response.data;
  },

  /**
   * Update task status only
   */
  updateTaskStatus: async (
    taskId: string,
    status: TaskStatus,
    blockedReason?: string
  ): Promise<SingleResponse<Task>> => {
    const response = await apiClient.patch(`/tasks/${taskId}/status`, {
      status,
      blockedReason
    });
    return response.data;
  },

  /**
   * Reassign task to different user
   */
  reassignTask: async (taskId: string, assigneeId: string): Promise<SingleResponse<Task>> => {
    const response = await apiClient.patch(`/tasks/${taskId}/reassign`, {
      assigneeId
    });
    return response.data;
  },

  /**
   * Generate tasks from scope text
   */
  generateTasksFromScope: async (data: GenerateTasksFromScopeDto): Promise<SingleResponse<Task[]>> => {
    const response = await apiClient.post('/tasks/generate-from-scope', data);
    return response.data;
  },

  /**
   * Get users that can be assigned tasks
   */
  getAssignableUsers: async (): Promise<SingleResponse<AssignableUser[]>> => {
    const response = await apiClient.get('/tasks/assignable-users');
    return response.data;
  },

  /**
   * Get task statistics
   */
  getTaskStats: async (projectId?: string, taskType?: string): Promise<SingleResponse<TaskStats>> => {
    const params = new URLSearchParams();
    if (projectId) params.append('projectId', projectId);
    if (taskType) params.append('taskType', taskType);
    const queryString = params.toString();
    const url = queryString ? `/tasks/stats?${queryString}` : '/tasks/stats';
    const response = await apiClient.get(url);
    return response.data;
  },

  /**
   * Get all projects for dropdown (with projectNumber displayed)
   */
  getProjects: async (): Promise<{ data: ProjectForDropdown[] }> => {
    const response = await apiClient.get('/projects');
    return response.data;
  },

  /**
   * Get project by ID with services
   */
  getProjectById: async (projectId: string): Promise<{ data: ProjectForDropdown }> => {
    const response = await apiClient.get(`/projects/${projectId}`);
    return response.data;
  },

  /**
   * Get services for a specific project
   */
  getProjectServices: async (projectId: string): Promise<ProjectService[]> => {
    const response = await apiClient.get(`/projects/${projectId}`);
    const project = response.data.data;
    // Extract services from projectServices relation
    return (project.projectServices || []).map((ps: any) => ({
      id: ps.service.id,
      name: ps.service.name,
      category: ps.service.category
    }));
  },

  // ============================================
  // Task Locking & Unlock Request APIs
  // ============================================

  /**
   * Request unlock for a locked task
   */
  requestUnlock: async (taskId: string, reason: string): Promise<SingleResponse<UnlockRequest>> => {
    const response = await apiClient.post(`/tasks/${taskId}/unlock-request`, { reason });
    return response.data;
  },

  /**
   * Review (approve/reject) an unlock request
   */
  reviewUnlockRequest: async (
    requestId: string,
    decision: 'approved' | 'rejected',
    reviewNote?: string
  ): Promise<SingleResponse<UnlockRequest>> => {
    const response = await apiClient.patch(`/tasks/unlock-requests/${requestId}/review`, {
      decision,
      reviewNote
    });
    return response.data;
  },

  /**
   * Get unlock request history for a task
   */
  getUnlockRequests: async (
    taskId: string,
    page = 1,
    pageSize = 10
  ): Promise<{ data: UnlockRequest[]; meta: any }> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());
    const response = await apiClient.get(`/tasks/${taskId}/unlock-requests?${params.toString()}`);
    return { data: response.data.data, meta: response.data.meta };
  },

  /**
   * Get all pending unlock requests (admin view)
   */
  getPendingUnlockRequests: async (
    page = 1,
    pageSize = 20
  ): Promise<{ data: UnlockRequest[]; meta: any }> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());
    const response = await apiClient.get(`/tasks/unlock-requests/pending?${params.toString()}`);
    return { data: response.data.data, meta: response.data.meta };
  },

  /**
   * Directly unlock a task (admin action, no unlock request needed)
   */
  directUnlock: async (taskId: string): Promise<SingleResponse<Task>> => {
    const response = await apiClient.patch(`/tasks/${taskId}/direct-unlock`);
    return response.data;
  },

  /**
   * Manually lock a task (admin action)
   */
  manualLock: async (taskId: string): Promise<SingleResponse<Task>> => {
    const response = await apiClient.patch(`/tasks/${taskId}/manual-lock`);
    return response.data;
  }
};

export default projectTasksApi;
