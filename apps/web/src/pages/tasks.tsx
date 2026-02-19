import { useEffect, useState, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import {
  fetchTasks,
  fetchAssignableUsers,
  fetchTaskStats,
  fetchProjects,
  fetchProjectServices,
  createTask,
  updateTask,
  updateTaskStatus,
  reassignTask,
  generateTasksFromScope,
  requestTaskUnlock,
  reviewUnlockRequest,
  directUnlockTask,
  manualLockTask,
  fetchPendingUnlockRequests,
  clearError,
  clearProjectServices,
  selectTasks,
  selectAssignableUsers,
  selectProjects,
  selectProjectServices,
  selectTasksLoading,
  selectTasksCreating,
  selectTasksUpdating,
  selectTasksReassigning,
  selectGeneratingFromScope,
  selectTasksError,
  selectTaskStats,
  selectTaskPagination,
  selectLoadingProjects,
  selectLoadingProjectServices,
  selectPendingUnlockRequests,
  selectSubmittingUnlockRequest,
  selectReviewingUnlockRequest
} from "../store/slices/projectTasksSlice";
import {
  Task,
  TaskStatus,
  TaskPriority,
  SlaStatus,
  CreateTaskDto,
  UpdateTaskDto,
  GenerateTasksFromScopeDto
} from "../lib/api/project-tasks";
import { PermissionGate } from "../components/auth/permission-gate";
import { Pagination } from "../components/pagination/Pagination";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/dialogs";
import { useConfirmation } from "@/hooks/use-confirmation";
import { useAuthStore } from "@/stores/auth-store";
import { checkPermission } from "@/utils/permissions";

// Status colors and labels
const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  to_do: { label: "To Do", color: "text-slate-700", bgColor: "bg-slate-100" },
  doing: { label: "Doing", color: "text-blue-700", bgColor: "bg-blue-100" },
  blocked: { label: "Blocked", color: "text-red-700", bgColor: "bg-red-100" },
  done: { label: "Done", color: "text-green-700", bgColor: "bg-green-100" }
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bgColor: string }> = {
  low: { label: "Low", color: "text-slate-600", bgColor: "bg-slate-100" },
  medium: { label: "Medium", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  high: { label: "High", color: "text-red-700", bgColor: "bg-red-100" }
};

const SLA_CONFIG: Record<SlaStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  on_track: { label: "On Track", color: "text-green-700", bgColor: "bg-green-100", icon: "✓" },
  due_today: { label: "Due Today", color: "text-yellow-700", bgColor: "bg-yellow-100", icon: "⚡" },
  overdue: { label: "Overdue", color: "text-red-700", bgColor: "bg-red-100", icon: "⚠" }
};

export function TasksPage() {
  const dispatch = useAppDispatch();
  const { user } = useAuthStore();

  // Check if user has permission to view all tasks (based on dynamic permissions from login)
  const canViewAllTasks = checkPermission(user?.permissions || [], ["tasks:read-all"]);

  const tasks = useAppSelector(selectTasks);
  const assignableUsers = useAppSelector(selectAssignableUsers);
  const projects = useAppSelector(selectProjects);
  const projectServices = useAppSelector(selectProjectServices);
  const isLoading = useAppSelector(selectTasksLoading);
  const isCreating = useAppSelector(selectTasksCreating);
  const isUpdating = useAppSelector(selectTasksUpdating);
  const isReassigning = useAppSelector(selectTasksReassigning);
  const isGeneratingFromScope = useAppSelector(selectGeneratingFromScope);
  const isLoadingProjects = useAppSelector(selectLoadingProjects);
  const isLoadingProjectServices = useAppSelector(selectLoadingProjectServices);
  const pendingUnlockRequests = useAppSelector(selectPendingUnlockRequests);
  const isSubmittingUnlockRequest = useAppSelector(selectSubmittingUnlockRequest);
  const isReviewingUnlockRequest = useAppSelector(selectReviewingUnlockRequest);
  const error = useAppSelector(selectTasksError);
  const stats = useAppSelector(selectTaskStats);
  const pagination = useAppSelector(selectTaskPagination);

  // Check if user can manage locks
  const canManageLocks = checkPermission(user?.permissions || [], ["tasks:manage-locks"]);

  // Tab state for task type filtering
  const [activeTab, setActiveTab] = useState<"all" | "general" | "project">("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showUnlockRequestModal, setShowUnlockRequestModal] = useState(false);
  const [showRejectNoteModal, setShowRejectNoteModal] = useState(false);
  const [selectedTask, setSelectedTaskLocal] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [unlockReason, setUnlockReason] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [selectedUnlockRequestId, setSelectedUnlockRequestId] = useState<string | null>(null);
  const confirmation = useConfirmation();

  // Form states
  const [formData, setFormData] = useState<CreateTaskDto>({
    projectId: "",
    title: "",
    description: "",
    assigneeId: "",
    serviceId: "",
    checklistLink: "",
    dueDate: "",
    priority: "medium",
    notes: "",
    taskType: "project"
  });

  const [statusFormData, setStatusFormData] = useState<{ status: TaskStatus; blockedReason: string }>({
    status: "to_do",
    blockedReason: ""
  });

  const [reassignFormData, setReassignFormData] = useState<{ assigneeId: string }>({
    assigneeId: ""
  });

  const [scopeFormData, setScopeFormData] = useState<GenerateTasksFromScopeDto>({
    projectId: "",
    scopeText: "",
    defaultAssigneeId: "",
    defaultPriority: "medium",
    defaultDueDate: ""
  });

  // Filter states
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "">("");
  const [slaFilter, setSlaFilter] = useState<SlaStatus | "">("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [taskTypeFilter, setTaskTypeFilter] = useState<"" | "general" | "project">("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(20);

  // Build filters object for API calls
  const buildFilters = () => {
    const filters: Record<string, string> = {};

    // Tab-based task type filter takes precedence, but advanced filter can override when tab is "all"
    if (activeTab !== "all") {
      filters.taskType = activeTab;
    } else if (taskTypeFilter) {
      filters.taskType = taskTypeFilter;
    }

    // Project filter
    if (projectFilter) {
      filters.projectId = projectFilter;
    }

    // Status filter
    if (statusFilter) {
      filters.status = statusFilter;
    }

    // Priority filter
    if (priorityFilter) {
      filters.priority = priorityFilter;
    }

    // SLA filter
    if (slaFilter) {
      filters.slaStatus = slaFilter;
    }

    // Assignee filter
    if (assigneeFilter) {
      filters.assigneeId = assigneeFilter;
    }

    // Search term
    if (searchTerm) {
      filters.search = searchTerm;
    }

    return filters;
  };

  // Load initial data and reload when tab or filters change
  useEffect(() => {
    const filters = buildFilters();
    setCurrentPage(1);
    dispatch(fetchTasks({ filters, page: 1, pageSize: currentPageSize }));
    dispatch(fetchAssignableUsers());
    const statsTaskType = activeTab !== "all" ? activeTab : undefined;
    dispatch(fetchTaskStats({ taskType: statsTaskType }));
    dispatch(fetchProjects());
  }, [dispatch, activeTab, projectFilter, taskTypeFilter, statusFilter, priorityFilter, slaFilter, assigneeFilter, searchTerm]);

  // Fetch pending unlock requests for admins
  useEffect(() => {
    if (canManageLocks) {
      dispatch(fetchPendingUnlockRequests(undefined));
    }
  }, [dispatch, canManageLocks]);

  // Load project services when project changes in create modal
  useEffect(() => {
    if (formData.projectId) {
      dispatch(fetchProjectServices(formData.projectId));
    } else {
      dispatch(clearProjectServices());
    }
  }, [formData.projectId, dispatch]);

  // Load project services when project changes in scope modal
  useEffect(() => {
    if (scopeFormData.projectId && showGenerateModal) {
      dispatch(fetchProjectServices(scopeFormData.projectId));
    }
  }, [scopeFormData.projectId, showGenerateModal, dispatch]);

  // Handle error display
  useEffect(() => {
    if (error) {
      toast.error(error);
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  // Filtered tasks - API now handles filtering, just return tasks directly
  const filteredTasks = useMemo(() => {
    return tasks;
  }, [tasks]);

  // Handlers
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    const isGeneralTask = formData.taskType === "general";

    if (!isGeneralTask && !formData.projectId) {
      toast.error("Please select a project for project tasks");
      return;
    }

    if (!formData.title || !formData.assigneeId) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const taskPayload: CreateTaskDto = {
        ...formData,
        taskType: isGeneralTask ? "general" : "project",
        projectId: isGeneralTask ? undefined : formData.projectId,
        serviceId: isGeneralTask ? undefined : formData.serviceId,
      };
      await dispatch(createTask(taskPayload)).unwrap();
      toast.success("Task created successfully");
      setShowCreateModal(false);
      resetForm();
    } catch (err: any) {
      toast.error(err || "Failed to create task");
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTask) return;

    try {
      const updateData: UpdateTaskDto = {
        title: formData.title,
        description: formData.description,
        assigneeId: formData.assigneeId,
        serviceId: formData.serviceId || undefined,
        dueDate: formData.dueDate || null,
        priority: formData.priority,
        notes: formData.notes
      };

      await dispatch(updateTask({ taskId: selectedTask.id, data: updateData })).unwrap();
      toast.success("Task updated successfully");
      setShowEditModal(false);
      setSelectedTaskLocal(null);
      resetForm();
      dispatch(clearProjectServices());
    } catch (err: any) {
      toast.error(err || "Failed to update task");
    }
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTask) return;

    if (statusFormData.status === "blocked" && !statusFormData.blockedReason) {
      toast.error("Please provide a reason for blocking");
      return;
    }

    try {
      await dispatch(updateTaskStatus({
        taskId: selectedTask.id,
        status: statusFormData.status,
        blockedReason: statusFormData.blockedReason || undefined
      })).unwrap();
      // Refresh stats after status change
      const statsTaskType = activeTab !== "all" ? activeTab : undefined;
      dispatch(fetchTaskStats({ taskType: statsTaskType }));
      toast.success(`Task status updated to ${STATUS_CONFIG[statusFormData.status].label}`);
      setShowStatusModal(false);
      setSelectedTaskLocal(null);
    } catch (err: any) {
      toast.error(err || "Failed to update task status");
    }
  };

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTask || !reassignFormData.assigneeId) {
      toast.error("Please select a user to assign");
      return;
    }

    try {
      await dispatch(reassignTask({
        taskId: selectedTask.id,
        assigneeId: reassignFormData.assigneeId
      })).unwrap();
      toast.success("Task reassigned successfully");
      setShowReassignModal(false);
      setSelectedTaskLocal(null);
    } catch (err: any) {
      toast.error(err || "Failed to reassign task");
    }
  };

  const handleGenerateFromScope = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scopeFormData.projectId || !scopeFormData.scopeText) {
      toast.error("Please provide project and scope text");
      return;
    }

    try {
      const result = await dispatch(generateTasksFromScope(scopeFormData)).unwrap();
      toast.success(`Generated ${result.length} tasks from scope`);
      setShowGenerateModal(false);
      setScopeFormData({
        projectId: "",
        scopeText: "",
        defaultAssigneeId: "",
        defaultPriority: "medium",
        defaultDueDate: ""
      });
    } catch (err: any) {
      toast.error(err || "Failed to generate tasks from scope");
    }
  };

  const handleUnlockRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !unlockReason.trim()) {
      toast.error("Please provide a reason for the unlock request");
      return;
    }
    try {
      await dispatch(requestTaskUnlock({ taskId: selectedTask.id, reason: unlockReason })).unwrap();
      toast.success("Unlock request submitted successfully");
      setShowUnlockRequestModal(false);
      setSelectedTaskLocal(null);
      setUnlockReason("");
    } catch (err: any) {
      toast.error(err || "Failed to submit unlock request");
    }
  };

  const handleApproveUnlock = async (requestId: string) => {
    try {
      await dispatch(reviewUnlockRequest({ requestId, decision: "approved" })).unwrap();
      toast.success("Unlock request approved - task is now unlocked");
      // Refresh tasks
      const filters = buildFilters();
      dispatch(fetchTasks({ filters, page: currentPage, pageSize: currentPageSize }));
    } catch (err: any) {
      toast.error(err || "Failed to approve unlock request");
    }
  };

  const handleRejectUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnlockRequestId) return;
    try {
      await dispatch(reviewUnlockRequest({
        requestId: selectedUnlockRequestId,
        decision: "rejected",
        reviewNote: rejectNote || undefined
      })).unwrap();
      toast.success("Unlock request rejected");
      setShowRejectNoteModal(false);
      setSelectedUnlockRequestId(null);
      setRejectNote("");
    } catch (err: any) {
      toast.error(err || "Failed to reject unlock request");
    }
  };

  const handleDirectUnlock = async (task: Task) => {
    try {
      await dispatch(directUnlockTask({ taskId: task.id })).unwrap();
      toast.success("Task unlocked successfully");
      const filters = buildFilters();
      dispatch(fetchTasks({ filters, page: currentPage, pageSize: currentPageSize }));
    } catch (err: any) {
      toast.error(err || "Failed to unlock task");
    }
  };

  const handleManualLock = async (task: Task) => {
    try {
      await dispatch(manualLockTask({ taskId: task.id })).unwrap();
      toast.success("Task locked successfully");
      const filters = buildFilters();
      dispatch(fetchTasks({ filters, page: currentPage, pageSize: currentPageSize }));
    } catch (err: any) {
      toast.error(err || "Failed to lock task");
    }
  };

  const openUnlockRequestModal = (task: Task) => {
    setSelectedTaskLocal(task);
    setUnlockReason("");
    setShowUnlockRequestModal(true);
  };

  const openRejectNoteModal = (requestId: string) => {
    setSelectedUnlockRequestId(requestId);
    setRejectNote("");
    setShowRejectNoteModal(true);
  };

  const resetForm = () => {
    setFormData({
      projectId: "",
      title: "",
      description: "",
      assigneeId: "",
      serviceId: "",
      checklistLink: "",
      dueDate: "",
      priority: "medium",
      notes: "",
      taskType: "project"
    });
  };

  const openEditModal = (task: Task) => {
    setSelectedTaskLocal(task);
    // Load project services for the task's project
    if (task.projectId) {
      dispatch(fetchProjectServices(task.projectId));
    }
    setFormData({
      projectId: task.projectId || "",
      title: task.title,
      description: task.description || "",
      assigneeId: task.assignee?.id || "",
      serviceId: task.serviceId || "",
      checklistLink: task.checklistLink || "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
      priority: task.priority,
      notes: task.notes || "",
      taskType: task.taskType || "project"
    });
    setShowEditModal(true);
  };

  const openStatusModal = (task: Task) => {
    setSelectedTaskLocal(task);
    setStatusFormData({
      status: task.status,
      blockedReason: task.blockedReason || ""
    });
    setShowStatusModal(true);
  };

  const openReassignModal = (task: Task) => {
    setSelectedTaskLocal(task);
    setReassignFormData({
      assigneeId: task.assignee?.id || ""
    });
    setShowReassignModal(true);
  };

  const openViewModal = (task: Task) => {
    setSelectedTaskLocal(task);
    setShowViewModal(true);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setPriorityFilter("");
    setSlaFilter("");
    setAssigneeFilter("");
    setProjectFilter("");
    setTaskTypeFilter("");
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || statusFilter || priorityFilter || slaFilter || assigneeFilter || projectFilter || taskTypeFilter;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Task Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage project tasks, general tasks, and track progress
          </p>
          {/* Role-based visibility indicator */}
          <div className="mt-2">
            {canViewAllTasks ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Viewing all tasks
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                Viewing my assigned tasks
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <PermissionGate requiredPermissions={["tasks:create"]}>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
            >
              <span className="mr-2">📝</span>
              Generate from Scope
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <span className="mr-2">+</span>
              Create Task
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Task Type Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-1" aria-label="Task type tabs">
          {([
            { key: "all", label: "All Tasks" },
            { key: "general", label: "General Tasks" },
            { key: "project", label: "Project Tasks" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-primary-600 border border-slate-200 border-b-white -mb-px"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500">Total Tasks</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500">To Do</p>
            <p className="text-2xl font-bold text-slate-700">{stats.byStatus.to_do}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{stats.byStatus.doing}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500">Blocked</p>
            <p className="text-2xl font-bold text-red-600">{stats.byStatus.blocked}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">{stats.byStatus.done}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500">Overdue</p>
            <p className="text-2xl font-bold text-red-600">{stats.bySla.overdue}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-200">
            <p className="text-sm text-amber-600">Locked</p>
            <p className="text-2xl font-bold text-amber-600">{tasks.filter(t => t.isLocked).length}</p>
          </div>
        </div>
      )}

      {/* Pending Unlock Requests Panel (Admin Only) */}
      {canManageLocks && pendingUnlockRequests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <svg className="w-5 h-5 text-amber-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="text-sm font-semibold text-amber-800">
              Pending Unlock Requests ({pendingUnlockRequests.length})
            </h3>
          </div>
          <div className="space-y-3">
            {pendingUnlockRequests.map((req) => (
              <div key={req.id} className="bg-white rounded-lg border border-amber-100 p-3 flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {req.task.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    Requested by {req.requestedBy.firstName} {req.requestedBy.lastName}
                    {req.task.project ? ` | ${req.task.project.name}` : ""}
                  </p>
                  <p className="text-xs text-slate-600 mt-1 italic">
                    "{req.reason}"
                  </p>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={() => handleApproveUnlock(req.id)}
                    disabled={isReviewingUnlockRequest}
                    className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 disabled:opacity-50 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => openRejectNoteModal(req.id)}
                    disabled={isReviewingUnlockRequest}
                    className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
        {/* Primary Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            disabled={isLoadingProjects}
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.projectNumber} - {project.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "")}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | "")}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Priorities</option>
            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              showAdvancedFilters
                ? "bg-primary-50 text-primary-700 border-primary-300"
                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
            }`}
          >
            {showAdvancedFilters ? "Hide" : "Show"} Advanced
            <svg
              className={`w-4 h-4 ml-1 inline-block transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Advanced Filters Row */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200">
            {/* SLA Filter */}
            <select
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value as SlaStatus | "")}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All SLA Status</option>
              {Object.entries(SLA_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            {/* Assignee Filter */}
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Assignees</option>
              {assignableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>

            {/* Task Type Filter (when on "All Tasks" tab) */}
            {activeTab === "all" && (
              <select
                value={taskTypeFilter}
                onChange={(e) => setTaskTypeFilter(e.target.value as "" | "general" | "project")}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Task Types</option>
                <option value="general">General Tasks</option>
                <option value="project">Project Tasks</option>
              </select>
            )}
          </div>
        )}

        {/* Active Filters Summary & Clear */}
        {hasActiveFilters && (
          <div className="mt-3 flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {projectFilter && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Project: {projects.find(p => p.id === projectFilter)?.name || "Selected"}
                  <button onClick={() => setProjectFilter("")} className="ml-1 hover:text-blue-900">×</button>
                </span>
              )}
              {statusFilter && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                  Status: {STATUS_CONFIG[statusFilter].label}
                  <button onClick={() => setStatusFilter("")} className="ml-1 hover:text-slate-900">×</button>
                </span>
              )}
              {priorityFilter && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Priority: {PRIORITY_CONFIG[priorityFilter].label}
                  <button onClick={() => setPriorityFilter("")} className="ml-1 hover:text-yellow-900">×</button>
                </span>
              )}
              {slaFilter && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  SLA: {SLA_CONFIG[slaFilter].label}
                  <button onClick={() => setSlaFilter("")} className="ml-1 hover:text-green-900">×</button>
                </span>
              )}
              {assigneeFilter && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Assignee: {assignableUsers.find(u => u.id === assigneeFilter)?.firstName || "Selected"}
                  <button onClick={() => setAssigneeFilter("")} className="ml-1 hover:text-purple-900">×</button>
                </span>
              )}
              {taskTypeFilter && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                  Type: {taskTypeFilter === "general" ? "General" : "Project"}
                  <button onClick={() => setTaskTypeFilter("")} className="ml-1 hover:text-teal-900">×</button>
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm("")} className="ml-1 hover:text-gray-900">×</button>
                </span>
              )}
            </div>
            <button
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-slate-500">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500">No tasks found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Assignee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    SLA
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className={`hover:bg-slate-50 ${task.isLocked ? "bg-amber-50/30" : ""}`}>
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        {task.isLocked && (
                          <span className="mr-2 flex-shrink-0" title={`Locked on ${formatDate(task.lockedAt || undefined)}`}>
                            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-slate-500 truncate max-w-xs">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {task.project ? (
                        <>
                          <p className="text-sm text-slate-600">{task.project.name}</p>
                          <p className="text-xs text-slate-400">{task.project.projectNumber}</p>
                        </>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-teal-100 text-teal-700">
                          General Task
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {task.assignee ? (
                        <div>
                          <p className="text-sm text-slate-900">
                            {task.assignee.firstName} {task.assignee.lastName}
                          </p>
                          <p className="text-xs text-slate-400">{task.assignee.email}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {task.isLocked && !canManageLocks ? (
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_CONFIG[task.status].bgColor} ${STATUS_CONFIG[task.status].color} opacity-60`}
                          title="Task is locked - cannot change status"
                        >
                          {STATUS_CONFIG[task.status].label}
                        </span>
                      ) : (
                        <button
                          onClick={() => openStatusModal(task)}
                          className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_CONFIG[task.status].bgColor} ${STATUS_CONFIG[task.status].color} hover:opacity-80 cursor-pointer`}
                        >
                          {STATUS_CONFIG[task.status].label}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${PRIORITY_CONFIG[task.priority].bgColor} ${PRIORITY_CONFIG[task.priority].color}`}>
                        {PRIORITY_CONFIG[task.priority].label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${SLA_CONFIG[task.slaStatus].bgColor} ${SLA_CONFIG[task.slaStatus].color}`}>
                        {SLA_CONFIG[task.slaStatus].icon} {SLA_CONFIG[task.slaStatus].label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {formatDate(task.dueDate)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openViewModal(task)}
                          className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {task.isLocked ? (
                          canManageLocks ? (
                            <>
                              {/* Admin: Unlock button */}
                              <button
                                onClick={() => handleDirectUnlock(task)}
                                className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Unlock Task"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                </svg>
                              </button>
                              {/* Admin: Edit even when locked */}
                              <PermissionGate requiredPermissions={["tasks:update"]}>
                                <button
                                  onClick={() => openEditModal(task)}
                                  className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="Edit (Admin)"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              </PermissionGate>
                              {/* Admin: Reassign even when locked */}
                              <PermissionGate requiredPermissions={["tasks:assign"]}>
                                <button
                                  onClick={() => openReassignModal(task)}
                                  className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Reassign (Admin)"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </button>
                              </PermissionGate>
                            </>
                          ) : (
                            task.unlockRequests?.some(r => r.status === 'pending') ? (
                              <span
                                className="p-2 text-blue-400 cursor-default"
                                title="Unlock request is pending review"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </span>
                            ) : (
                              <button
                                onClick={() => openUnlockRequestModal(task)}
                                className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Request Unlock"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                </svg>
                              </button>
                            )
                          )
                        ) : (
                          <>
                            {/* Admin: Manual lock button for unlocked tasks */}
                            {canManageLocks && task.status !== 'done' && (
                              <button
                                onClick={() => handleManualLock(task)}
                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Lock Task"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              </button>
                            )}
                            <PermissionGate requiredPermissions={["tasks:update"]}>
                              <button
                                onClick={() => openEditModal(task)}
                                className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </PermissionGate>
                            <PermissionGate requiredPermissions={["tasks:assign"]}>
                              <button
                                onClick={() => openReassignModal(task)}
                                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Reassign"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </button>
                            </PermissionGate>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        pageSize={currentPageSize}
        loading={isLoading}
        onPageChange={(page) => {
          setCurrentPage(page);
          const filters = buildFilters();
          dispatch(fetchTasks({ filters, page, pageSize: currentPageSize }));
        }}
        onPageSizeChange={(size) => {
          setCurrentPageSize(size);
          setCurrentPage(1);
          const filters = buildFilters();
          dispatch(fetchTasks({ filters, page: 1, pageSize: size }));
        }}
      />

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Create New Task</h2>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              {/* Task Type Selector */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Task Type
                </label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, taskType: "project", projectId: "", serviceId: "" })}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${
                      formData.taskType === "project"
                        ? "bg-primary-50 text-primary-700 border-primary-300"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    Project Task
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, taskType: "general", projectId: "", serviceId: "" })}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${
                      formData.taskType === "general"
                        ? "bg-teal-50 text-teal-700 border-teal-300"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    General Task
                  </button>
                </div>
              </div>

              {/* Project selector - only for project tasks */}
              {formData.taskType !== "general" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Project <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value, serviceId: "" })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    disabled={isLoadingProjects}
                  >
                    <option value="">Select project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.projectNumber} - {project.name}
                      </option>
                    ))}
                  </select>
                  {isLoadingProjects && (
                    <p className="text-xs text-slate-400 mt-1">Loading projects...</p>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Task description"
                />
              </div>
              <div className={`grid ${formData.taskType !== "general" ? "grid-cols-2" : "grid-cols-1"} gap-4`}>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Assignee <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.assigneeId}
                    onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select assignee</option>
                    {assignableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.role?.name || 'User'})
                      </option>
                    ))}
                  </select>
                </div>
                {formData.taskType !== "general" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Related Service
                    </label>
                    <select
                      value={formData.serviceId || ""}
                      onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      disabled={!formData.projectId || isLoadingProjectServices}
                    >
                      <option value="">Select service (optional)</option>
                      {projectServices.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name} ({service.category})
                        </option>
                      ))}
                    </select>
                    {isLoadingProjectServices && (
                      <p className="text-xs text-slate-400 mt-1">Loading services...</p>
                    )}
                    {!formData.projectId && (
                      <p className="text-xs text-slate-400 mt-1">Select a project first</p>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Internal notes"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {isCreating ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Edit Task</h2>
            </div>
            <form onSubmit={handleUpdateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Assignee
                  </label>
                  <select
                    value={formData.assigneeId}
                    onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select assignee</option>
                    {assignableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.role?.name || 'User'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Related Service
                  </label>
                  <select
                    value={formData.serviceId || ""}
                    onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    disabled={isLoadingProjectServices}
                  >
                    <option value="">Select service (optional)</option>
                    {projectServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} ({service.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedTaskLocal(null); resetForm(); }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Update Task Status</h2>
              <p className="text-sm text-slate-500 mt-1">{selectedTask.title}</p>
            </div>
            <form onSubmit={handleStatusChange} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  New Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatusFormData({ ...statusFormData, status: key as TaskStatus })}
                      className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${
                        statusFormData.status === key
                          ? `${config.bgColor} ${config.color} border-current`
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>
              {statusFormData.status === "blocked" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Blocked Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={statusFormData.blockedReason}
                    onChange={(e) => setStatusFormData({ ...statusFormData, blockedReason: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Explain why this task is blocked..."
                  />
                </div>
              )}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowStatusModal(false); setSelectedTaskLocal(null); }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {isUpdating ? "Updating..." : "Update Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {showReassignModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Reassign Task</h2>
              <p className="text-sm text-slate-500 mt-1">{selectedTask.title}</p>
            </div>
            <form onSubmit={handleReassign} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Assign To <span className="text-red-500">*</span>
                </label>
                <select
                  value={reassignFormData.assigneeId}
                  onChange={(e) => setReassignFormData({ assigneeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select assignee</option>
                  {assignableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.role?.name || 'User'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowReassignModal(false); setSelectedTaskLocal(null); }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReassigning}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {isReassigning ? "Reassigning..." : "Reassign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate from Scope Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Generate Tasks from Scope</h2>
              <p className="text-sm text-slate-500 mt-1">
                Each line in the scope text will become a separate task
              </p>
            </div>
            <form onSubmit={handleGenerateFromScope} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={scopeFormData.projectId}
                  onChange={(e) => setScopeFormData({ ...scopeFormData, projectId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  disabled={isLoadingProjects}
                >
                  <option value="">Select project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.projectNumber} - {project.name}
                    </option>
                  ))}
                </select>
                {isLoadingProjects && (
                  <p className="text-xs text-slate-400 mt-1">Loading projects...</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Scope Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={scopeFormData.scopeText}
                  onChange={(e) => setScopeFormData({ ...scopeFormData, scopeText: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  placeholder="Enter scope items, one per line:&#10;Site inspection&#10;Document review&#10;Data collection&#10;Report preparation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Default Assignee (optional)
                </label>
                <select
                  value={scopeFormData.defaultAssigneeId || ""}
                  onChange={(e) => setScopeFormData({ ...scopeFormData, defaultAssigneeId: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">No default assignee</option>
                  {assignableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.role?.name || 'User'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Default Priority
                  </label>
                  <select
                    value={scopeFormData.defaultPriority || "medium"}
                    onChange={(e) => setScopeFormData({ ...scopeFormData, defaultPriority: e.target.value as TaskPriority })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Default Due Date
                  </label>
                  <input
                    type="date"
                    value={scopeFormData.defaultDueDate || ""}
                    onChange={(e) => setScopeFormData({ ...scopeFormData, defaultDueDate: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingFromScope}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {isGeneratingFromScope ? "Generating..." : "Generate Tasks"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Task Modal */}
      {showViewModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{selectedTask.title}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedTask.project
                    ? `${selectedTask.project.name} (${selectedTask.project.projectNumber})`
                    : "General Task"}
                </p>
              </div>
              <button
                onClick={() => { setShowViewModal(false); setSelectedTaskLocal(null); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Lock Warning Banner */}
              {selectedTask.isLocked && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start">
                  <svg className="w-5 h-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">
                      This task was automatically locked on {formatDate(selectedTask.lockedAt || undefined)} because it exceeded its due date.
                    </p>
                    {canManageLocks ? (
                      <button
                        onClick={() => { handleDirectUnlock(selectedTask); setShowViewModal(false); setSelectedTaskLocal(null); }}
                        className="text-sm text-amber-700 underline hover:text-amber-900 mt-1"
                      >
                        Unlock this task
                      </button>
                    ) : (
                      selectedTask.unlockRequests?.some(r => r.status === 'pending') ? (
                        <p className="text-sm text-blue-600 mt-1 font-medium">
                          Unlock request is pending review
                        </p>
                      ) : (
                        <button
                          onClick={() => { setShowViewModal(false); openUnlockRequestModal(selectedTask); }}
                          className="text-sm text-amber-700 underline hover:text-amber-900 mt-1"
                        >
                          Request Unlock
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${STATUS_CONFIG[selectedTask.status].bgColor} ${STATUS_CONFIG[selectedTask.status].color}`}>
                  {STATUS_CONFIG[selectedTask.status].label}
                </span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${PRIORITY_CONFIG[selectedTask.priority].bgColor} ${PRIORITY_CONFIG[selectedTask.priority].color}`}>
                  {PRIORITY_CONFIG[selectedTask.priority].label} Priority
                </span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${SLA_CONFIG[selectedTask.slaStatus].bgColor} ${SLA_CONFIG[selectedTask.slaStatus].color}`}>
                  {SLA_CONFIG[selectedTask.slaStatus].icon} {SLA_CONFIG[selectedTask.slaStatus].label}
                </span>
                {selectedTask.isLocked && (
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-amber-100 text-amber-700">
                    Locked
                  </span>
                )}
              </div>

              {/* Description */}
              {selectedTask.description && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-1">Description</h3>
                  <p className="text-sm text-slate-600">{selectedTask.description}</p>
                </div>
              )}

              {/* Blocked Reason */}
              {selectedTask.blockedReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h3 className="text-sm font-medium text-red-700 mb-1">Blocked Reason</h3>
                  <p className="text-sm text-red-600">{selectedTask.blockedReason}</p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-1">Assignee</h3>
                  <p className="text-sm text-slate-600">
                    {selectedTask.assignee
                      ? `${selectedTask.assignee.firstName} ${selectedTask.assignee.lastName}`
                      : "Unassigned"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-1">Due Date</h3>
                  <p className="text-sm text-slate-600">{formatDate(selectedTask.dueDate)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-1">Created By</h3>
                  <p className="text-sm text-slate-600">
                    {selectedTask.createdBy.firstName} {selectedTask.createdBy.lastName}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-1">Created At</h3>
                  <p className="text-sm text-slate-600">{formatDate(selectedTask.createdAt)}</p>
                </div>
                {selectedTask.completedAt && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 mb-1">Completed At</h3>
                    <p className="text-sm text-slate-600">{formatDate(selectedTask.completedAt)}</p>
                  </div>
                )}
                {selectedTask.service && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 mb-1">Related Service</h3>
                    <p className="text-sm text-slate-600">{selectedTask.service.name}</p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedTask.notes && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-1">Notes</h3>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                    {selectedTask.notes}
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end space-x-3">
              {selectedTask.isLocked ? (
                canManageLocks ? (
                  <>
                    <button
                      onClick={() => { handleDirectUnlock(selectedTask); setShowViewModal(false); setSelectedTaskLocal(null); }}
                      className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100"
                    >
                      Unlock Task
                    </button>
                    <PermissionGate requiredPermissions={["tasks:update"]}>
                      <button
                        onClick={() => { setShowViewModal(false); openEditModal(selectedTask); }}
                        className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100"
                      >
                        Edit Task
                      </button>
                    </PermissionGate>
                  </>
                ) : (
                  selectedTask.unlockRequests?.some(r => r.status === 'pending') ? (
                    <span className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg">
                      Request Pending
                    </span>
                  ) : (
                    <button
                      onClick={() => { setShowViewModal(false); openUnlockRequestModal(selectedTask); }}
                      className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100"
                    >
                      Request Unlock
                    </button>
                  )
                )
              ) : (
                <PermissionGate requiredPermissions={["tasks:update"]}>
                  <button
                    onClick={() => { setShowViewModal(false); openEditModal(selectedTask); }}
                    className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100"
                  >
                    Edit Task
                  </button>
                </PermissionGate>
              )}
              <button
                onClick={() => { setShowViewModal(false); setSelectedTaskLocal(null); }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Request Modal */}
      {showUnlockRequestModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Request Task Unlock</h2>
              <p className="text-sm text-slate-500 mt-1">{selectedTask.title}</p>
            </div>
            <form onSubmit={handleUnlockRequest} className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  This task was locked on {formatDate(selectedTask.lockedAt || undefined)} because it exceeded its due date ({formatDate(selectedTask.dueDate)}).
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reason for Unlock <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Explain why this task needs to be unlocked..."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowUnlockRequestModal(false); setSelectedTaskLocal(null); setUnlockReason(""); }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUnlockRequest || !unlockReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {isSubmittingUnlockRequest ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Unlock Note Modal */}
      {showRejectNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Reject Unlock Request</h2>
            </div>
            <form onSubmit={handleRejectUnlock} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Rejection Note (optional)
                </label>
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Provide a reason for rejection..."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowRejectNoteModal(false); setSelectedUnlockRequestId(null); setRejectNote(""); }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReviewingUnlockRequest}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isReviewingUnlockRequest ? "Rejecting..." : "Reject Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog {...confirmation.dialog} />
    </div>
  );
}

export default TasksPage;
