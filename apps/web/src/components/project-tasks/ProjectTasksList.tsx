import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store";
import { toast } from "sonner";
import {
  fetchProjectTasks,
  fetchAssignableUsers,
  fetchProjectServices,
  createTask,
  updateTask,
  updateTaskStatus,
  reassignTask,
  requestTaskUnlock,
  reviewUnlockRequest,
  directUnlockTask,
  manualLockTask,
  fetchPendingUnlockRequests,
  clearError,
  selectProjectTasks,
  selectAssignableUsers,
  selectProjectServices,
  selectProjectTasksLoading,
  selectTasksCreating,
  selectTasksUpdating,
  selectTasksReassigning,
  selectTasksError,
  selectLoadingProjectServices,
  selectTaskPagination,
  selectPendingUnlockRequests,
  selectSubmittingUnlockRequest,
  selectReviewingUnlockRequest
} from "../../store/slices/projectTasksSlice";
import { Pagination } from "../pagination/Pagination";
import {
  Task,
  TaskStatus,
  TaskPriority,
  SlaStatus,
  CreateTaskDto,
  UpdateTaskDto
} from "../../lib/api/project-tasks";
import { PermissionGate } from "../common/PermissionGate";
import { ProjectDetailsHeader } from "../common/ProjectDetailsHeader";
import {
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  Edit,
  X,
  Calendar,
  User,
  ListTodo,
  UserPlus,
  Lock,
  Unlock
} from "lucide-react";
import { useAuthStore } from "../../stores/auth-store";
import { checkPermission } from "../../utils/permissions";

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

export const ProjectTasksList: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const dispatch = useAppDispatch();
  const { user } = useAuthStore();

  // Check if user can manage locks
  const canManageLocks = checkPermission(user?.permissions || [], ["tasks:manage-locks"]);

  // Redux selectors
  const tasks = useAppSelector(selectProjectTasks);
  const assignableUsers = useAppSelector(selectAssignableUsers);
  const projectServices = useAppSelector(selectProjectServices);
  const loading = useAppSelector(selectProjectTasksLoading);
  const isCreating = useAppSelector(selectTasksCreating);
  const isUpdating = useAppSelector(selectTasksUpdating);
  const isReassigning = useAppSelector(selectTasksReassigning);
  const error = useAppSelector(selectTasksError);
  const isLoadingProjectServices = useAppSelector(selectLoadingProjectServices);
  const pagination = useAppSelector(selectTaskPagination);
  const pendingUnlockRequests = useAppSelector(selectPendingUnlockRequests);
  const isSubmittingUnlockRequest = useAppSelector(selectSubmittingUnlockRequest);
  const isReviewingUnlockRequest = useAppSelector(selectReviewingUnlockRequest);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(10);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showUnlockRequestModal, setShowUnlockRequestModal] = useState(false);
  const [showRejectNoteModal, setShowRejectNoteModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [unlockReason, setUnlockReason] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [selectedUnlockRequestId, setSelectedUnlockRequestId] = useState<string | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const [searchTerm, setSearchTerm] = useState("");

  // Form states
  const [formData, setFormData] = useState<CreateTaskDto>({
    projectId: projectId || "",
    title: "",
    description: "",
    assigneeId: "",
    serviceId: "",
    checklistLink: "",
    dueDate: "",
    priority: "medium",
    notes: ""
  });

  const [statusFormData, setStatusFormData] = useState<{ status: TaskStatus; blockedReason: string }>({
    status: "to_do",
    blockedReason: ""
  });

  const [reassignFormData, setReassignFormData] = useState<{ assigneeId: string }>({
    assigneeId: ""
  });

  // Load initial data
  useEffect(() => {
    if (projectId) {
      dispatch(fetchProjectTasks({ projectId, page: 1, pageSize: currentPageSize }));
      dispatch(fetchAssignableUsers());
      dispatch(fetchProjectServices(projectId));
    }
  }, [dispatch, projectId]);

  // Fetch pending unlock requests for admins
  useEffect(() => {
    if (canManageLocks) {
      dispatch(fetchPendingUnlockRequests(undefined));
    }
  }, [dispatch, canManageLocks]);

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

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        t => t.title.toLowerCase().includes(search) ||
             t.description?.toLowerCase().includes(search)
      );
    }

    if (statusFilter) {
      result = result.filter(t => t.status === statusFilter);
    }

    return result;
  }, [tasks, searchTerm, statusFilter]);

  // Stats calculation
  const stats = useMemo(() => {
    return {
      total: tasks.length,
      to_do: tasks.filter(t => t.status === "to_do").length,
      doing: tasks.filter(t => t.status === "doing").length,
      blocked: tasks.filter(t => t.status === "blocked").length,
      done: tasks.filter(t => t.status === "done").length,
      overdue: tasks.filter(t => t.slaStatus === "overdue").length
    };
  }, [tasks]);

  // Handlers
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.assigneeId) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await dispatch(createTask({ ...formData, projectId: projectId || "" })).unwrap();
      toast.success("Task created successfully");
      setShowCreateModal(false);
      resetForm();
      // Re-fetch project tasks to reflect the new task
      if (projectId) {
        setCurrentPage(1);
        dispatch(fetchProjectTasks({ projectId, page: 1, pageSize: currentPageSize }));
      }
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
      setSelectedTask(null);
      resetForm();
      if (projectId) {
        dispatch(fetchProjectTasks({ projectId, page: currentPage, pageSize: currentPageSize }));
      }
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
      toast.success(`Task status updated to ${STATUS_CONFIG[statusFormData.status].label}`);
      setShowStatusModal(false);
      setSelectedTask(null);
      if (projectId) {
        dispatch(fetchProjectTasks({ projectId, page: currentPage, pageSize: currentPageSize }));
      }
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
      setSelectedTask(null);
      if (projectId) {
        dispatch(fetchProjectTasks({ projectId, page: currentPage, pageSize: currentPageSize }));
      }
    } catch (err: any) {
      toast.error(err || "Failed to reassign task");
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
      setSelectedTask(null);
      setUnlockReason("");
    } catch (err: any) {
      toast.error(err || "Failed to submit unlock request");
    }
  };

  const handleApproveUnlock = async (requestId: string) => {
    try {
      await dispatch(reviewUnlockRequest({ requestId, decision: "approved" })).unwrap();
      toast.success("Unlock request approved - task is now unlocked");
      if (projectId) {
        dispatch(fetchProjectTasks({ projectId, page: currentPage, pageSize: currentPageSize }));
      }
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

  const openUnlockRequestModal = (task: Task) => {
    setSelectedTask(task);
    setUnlockReason("");
    setShowUnlockRequestModal(true);
  };

  const openRejectNoteModal = (requestId: string) => {
    setSelectedUnlockRequestId(requestId);
    setRejectNote("");
    setShowRejectNoteModal(true);
  };

  const handleDirectUnlock = async (task: Task) => {
    try {
      await dispatch(directUnlockTask({ taskId: task.id })).unwrap();
      toast.success("Task unlocked successfully");
      if (projectId) {
        dispatch(fetchProjectTasks({ projectId, page: currentPage, pageSize: currentPageSize }));
      }
    } catch (err: any) {
      toast.error(err || "Failed to unlock task");
    }
  };

  const handleManualLock = async (task: Task) => {
    try {
      await dispatch(manualLockTask({ taskId: task.id })).unwrap();
      toast.success("Task locked successfully");
      if (projectId) {
        dispatch(fetchProjectTasks({ projectId, page: currentPage, pageSize: currentPageSize }));
      }
    } catch (err: any) {
      toast.error(err || "Failed to lock task");
    }
  };

  const resetForm = () => {
    setFormData({
      projectId: projectId || "",
      title: "",
      description: "",
      assigneeId: "",
      serviceId: "",
      checklistLink: "",
      dueDate: "",
      priority: "medium",
      notes: ""
    });
  };

  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    setFormData({
      projectId: task.projectId || "",
      title: task.title,
      description: task.description || "",
      assigneeId: task.assignee?.id || "",
      serviceId: task.serviceId || "",
      checklistLink: task.checklistLink || "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
      priority: task.priority,
      notes: task.notes || ""
    });
    setShowEditModal(true);
  };

  const openStatusModal = (task: Task) => {
    setSelectedTask(task);
    setStatusFormData({
      status: task.status,
      blockedReason: task.blockedReason || ""
    });
    setShowStatusModal(true);
  };

  const openReassignModal = (task: Task) => {
    setSelectedTask(task);
    setReassignFormData({
      assigneeId: task.assignee?.id || ""
    });
    setShowReassignModal(true);
  };

  const openViewModal = (task: Task) => {
    setSelectedTask(task);
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

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Details Header */}
      {projectId && (
        <ProjectDetailsHeader
          projectId={projectId}
          showBackButton={true}
          currentPage="tasks"
        />
      )}

      {/* Page Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Project Tasks</h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage and track tasks for this project
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <PermissionGate requiredPermissions={["tasks:create"]}>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">Total</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">To Do</p>
          <p className="text-2xl font-bold text-slate-700">{stats.to_do}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">{stats.doing}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">Blocked</p>
          <p className="text-2xl font-bold text-red-600">{stats.blocked}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.done}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">Overdue</p>
          <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-200">
          <p className="text-sm text-amber-600">Locked</p>
          <p className="text-2xl font-bold text-amber-600">{tasks.filter(t => t.isLocked).length}</p>
        </div>
      </div>

      {/* Pending Unlock Requests Panel (Admin Only) */}
      {canManageLocks && pendingUnlockRequests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <Lock className="w-5 h-5 text-amber-600 mr-2" />
            <h3 className="text-sm font-semibold text-amber-800">
              Pending Unlock Requests ({pendingUnlockRequests.length})
            </h3>
          </div>
          <div className="space-y-3">
            {pendingUnlockRequests.map((req) => (
              <div key={req.id} className="bg-white rounded-lg border border-amber-100 p-3 flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium text-slate-900 truncate">{req.task.title}</p>
                  <p className="text-xs text-slate-500">
                    Requested by {req.requestedBy.firstName} {req.requestedBy.lastName}
                  </p>
                  <p className="text-xs text-slate-600 mt-1 italic">"{req.reason}"</p>
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
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="max-w-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "")}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
          <div className="text-sm text-slate-600">
            Showing {filteredTasks.length} of {pagination.total} task{pagination.total !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Tasks Grid */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <ListTodo className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No tasks found</h3>
          <p className="text-slate-600 mb-4">
            {statusFilter
              ? "No tasks match your current filters."
              : "Get started by creating a task for this project."}
          </p>
          {!statusFilter && (
            <PermissionGate requiredPermissions={["tasks:create"]}>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Task
              </button>
            </PermissionGate>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`bg-white rounded-xl border ${task.isLocked ? "border-amber-200" : "border-slate-200"} hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden`}
            >
              {/* Lock Banner */}
              {task.isLocked && (
                <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 flex items-center">
                  <Lock className="w-3.5 h-3.5 text-amber-500 mr-2" />
                  <span className="text-xs font-medium text-amber-700">
                    Locked on {formatDate(task.lockedAt || undefined)}
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="p-5 pb-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 mb-1 truncate">
                      {task.title}
                    </h3>
                    {task.service && (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                          {task.service.name}
                        </span>
                      </div>
                    )}
                  </div>
                  {task.isLocked && !canManageLocks ? (
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        STATUS_CONFIG[task.status].bgColor
                      } ${STATUS_CONFIG[task.status].color} flex-shrink-0 opacity-60`}
                      title="Task is locked - cannot change status"
                    >
                      {task.status === "done" && <CheckCircle className="w-3 h-3 mr-1" />}
                      {task.status === "doing" && <Clock className="w-3 h-3 mr-1" />}
                      {task.status === "blocked" && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {STATUS_CONFIG[task.status].label}
                    </span>
                  ) : (
                    <button
                      onClick={() => openStatusModal(task)}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        STATUS_CONFIG[task.status].bgColor
                      } ${STATUS_CONFIG[task.status].color} flex-shrink-0 hover:opacity-80 cursor-pointer`}
                    >
                      {task.status === "done" && <CheckCircle className="w-3 h-3 mr-1" />}
                      {task.status === "doing" && <Clock className="w-3 h-3 mr-1" />}
                      {task.status === "blocked" && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {STATUS_CONFIG[task.status].label}
                    </button>
                  )}
                </div>

                {/* Description */}
                {task.description && (
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    {task.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="space-y-2 text-sm">
                  {task.assignee && (
                    <div className="flex items-center text-slate-600">
                      <User className="w-4 h-4 mr-2 text-slate-400" />
                      <span>{task.assignee.firstName} {task.assignee.lastName}</span>
                    </div>
                  )}

                  {task.dueDate && (
                    <div className="flex items-center text-slate-600">
                      <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                      <span>Due: {formatDate(task.dueDate)}</span>
                      {task.slaStatus && (
                        <span className={`ml-2 px-1.5 py-0.5 text-[10px] font-medium rounded ${SLA_CONFIG[task.slaStatus].bgColor} ${SLA_CONFIG[task.slaStatus].color}`}>
                          {SLA_CONFIG[task.slaStatus].icon} {SLA_CONFIG[task.slaStatus].label}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${PRIORITY_CONFIG[task.priority].bgColor} ${PRIORITY_CONFIG[task.priority].color}`}>
                      {PRIORITY_CONFIG[task.priority].label}
                    </span>
                  </div>
                </div>

                {/* Blocked Reason */}
                {task.blockedReason && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-xs text-red-700">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      {task.blockedReason}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Created {formatDate(task.createdAt)}
                </div>

                <div className="flex items-center space-x-1">
                  {/* View Details button */}
                  <button
                    type="button"
                    onClick={() => openViewModal(task)}
                    className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {task.isLocked ? (
                    canManageLocks ? (
                      <>
                        {/* Admin: Unlock button */}
                        <button
                          type="button"
                          onClick={() => handleDirectUnlock(task)}
                          className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                          title="Unlock Task"
                        >
                          <Unlock className="w-4 h-4" />
                        </button>
                        {/* Admin: Edit even when locked */}
                        <PermissionGate requiredPermissions={["tasks:update"]}>
                          <button
                            type="button"
                            onClick={() => openEditModal(task)}
                            className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
                            title="Edit Task (Admin)"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </PermissionGate>
                        {/* Admin: Reassign even when locked */}
                        <PermissionGate requiredPermissions={["tasks:assign"]}>
                          <button
                            type="button"
                            onClick={() => openReassignModal(task)}
                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                            title="Reassign Task (Admin)"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                        </PermissionGate>
                      </>
                    ) : (
                      task.unlockRequests?.some(r => r.status === 'pending') ? (
                        /* Pending indicator */
                        <span
                          className="p-2 text-blue-400 cursor-default"
                          title="Unlock request is pending review"
                        >
                          <Clock className="w-4 h-4" />
                        </span>
                      ) : (
                        /* Request Unlock button */
                        <button
                          type="button"
                          onClick={() => openUnlockRequestModal(task)}
                          className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                          title="Request Unlock"
                        >
                          <Unlock className="w-4 h-4" />
                        </button>
                      )
                    )
                  ) : (
                    <>
                      {/* Admin: Manual lock button for unlocked tasks */}
                      {canManageLocks && task.status !== 'done' && (
                        <button
                          type="button"
                          onClick={() => handleManualLock(task)}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                          title="Lock Task"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                      )}
                      {/* Edit button */}
                      <PermissionGate requiredPermissions={["tasks:update"]}>
                        <button
                          type="button"
                          onClick={() => openEditModal(task)}
                          className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
                          title="Edit Task"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </PermissionGate>

                      {/* Reassign button */}
                      <PermissionGate requiredPermissions={["tasks:assign"]}>
                        <button
                          type="button"
                          onClick={() => openReassignModal(task)}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                          title="Reassign Task"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </PermissionGate>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        pageSize={currentPageSize}
        loading={loading}
        onPageChange={(page) => {
          setCurrentPage(page);
          if (projectId) {
            dispatch(fetchProjectTasks({ projectId, page, pageSize: currentPageSize }));
          }
        }}
        onPageSizeChange={(size) => {
          setCurrentPageSize(size);
          setCurrentPage(1);
          if (projectId) {
            dispatch(fetchProjectTasks({ projectId, page: 1, pageSize: size }));
          }
        }}
      />

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Create New Task</h2>
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
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
              <div className="grid grid-cols-2 gap-4">
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
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Edit Task</h2>
              <button
                onClick={() => { setShowEditModal(false); setSelectedTask(null); resetForm(); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
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
                  onClick={() => { setShowEditModal(false); setSelectedTask(null); resetForm(); }}
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
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Update Task Status</h2>
                <p className="text-sm text-slate-500 mt-1">{selectedTask.title}</p>
              </div>
              <button
                onClick={() => { setShowStatusModal(false); setSelectedTask(null); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
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
                  onClick={() => { setShowStatusModal(false); setSelectedTask(null); }}
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
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Reassign Task</h2>
                <p className="text-sm text-slate-500 mt-1">{selectedTask.title}</p>
              </div>
              <button
                onClick={() => { setShowReassignModal(false); setSelectedTask(null); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
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
                  onClick={() => { setShowReassignModal(false); setSelectedTask(null); }}
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

      {/* View Task Modal */}
      {showViewModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{selectedTask.title}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedTask.project ? `${selectedTask.project.name} (${selectedTask.project.projectNumber})` : "General Task"}
                </p>
              </div>
              <button
                onClick={() => { setShowViewModal(false); setSelectedTask(null); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Lock Warning Banner */}
              {selectedTask.isLocked && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start">
                  <Lock className="w-5 h-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">
                      This task was automatically locked on {formatDate(selectedTask.lockedAt || undefined)} because it exceeded its due date.
                    </p>
                    {canManageLocks ? (
                      <button
                        onClick={() => { handleDirectUnlock(selectedTask); setShowViewModal(false); setSelectedTask(null); }}
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
                      onClick={() => { handleDirectUnlock(selectedTask); setShowViewModal(false); setSelectedTask(null); }}
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
                onClick={() => { setShowViewModal(false); setSelectedTask(null); }}
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
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Request Task Unlock</h2>
                <p className="text-sm text-slate-500 mt-1">{selectedTask.title}</p>
              </div>
              <button
                onClick={() => { setShowUnlockRequestModal(false); setSelectedTask(null); setUnlockReason(""); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
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
                  onClick={() => { setShowUnlockRequestModal(false); setSelectedTask(null); setUnlockReason(""); }}
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
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Reject Unlock Request</h2>
              <button
                onClick={() => { setShowRejectNoteModal(false); setSelectedUnlockRequestId(null); setRejectNote(""); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
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
    </div>
  );
};

export default ProjectTasksList;
