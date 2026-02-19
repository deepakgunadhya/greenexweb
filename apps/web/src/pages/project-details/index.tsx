import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { ProjectDetailsHeader } from "@/components/common/ProjectDetailsHeader";
import { PermissionGate } from "@/components/common/PermissionGate";
import {
  Building2,
  Calendar,
  Hash,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Briefcase,
  ListChecks,
  ClipboardList,
  ArrowRight,
  User,
  Mail,
  Phone,
  Paperclip,
  Download,
} from "lucide-react";

// Types based on ProjectWithDetails from backend
interface ProjectService {
  id: string;
  service: {
    id: string;
    name: string;
    category: string;
    description?: string;
  };
}

interface ProjectTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface ProjectTemplateAssignment {
  id: string;
  status: string;
  templateFile?: {
    id: string;
    title: string;
    category: string;
  };
}

interface ProjectDetails {
  id: string;
  projectNumber: string;
  name: string;
  description?: string;
  status: string;
  verificationStatus?: string;
  executionStatus?: string;
  clientReviewStatus?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
  estimatedCost?: number;
  actualCost?: number;
  notes?: string;
  poNumber?: string;
  poAttachmentPath?: string;
  poAttachmentOriginalName?: string;
  poAttachmentMimeType?: string;
  poAttachmentSize?: string;
  createdAt: string;
  updatedAt: string;
  organization: {
    id: string;
    name: string;
    type: string;
    email?: string;
    phone?: string;
  };
  quotation: {
    id: string;
    quotation_number: string;
    title: string;
    amount?: number;
    status: string;
    lead: {
      id: string;
      title: string;
      contactName?: string;
      contactEmail?: string;
    };
  };
  projectServices: ProjectService[];
  tasks: ProjectTask[];
  templateAssignments?: ProjectTemplateAssignment[];
}

// Task statistics interface
interface TaskStats {
  total: number;
  to_do: number;
  doing: number;
  blocked: number;
  done: number;
}

// Checklist statistics interface
interface ChecklistStats {
  total: number;
  assigned: number;
  submitted: number;
  incomplete: number;
  verified: number;
}

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-slate-100 text-slate-700",
  checklist_finalized: "bg-blue-100 text-blue-700",
  verification_passed: "bg-emerald-100 text-emerald-700",
  execution_in_progress: "bg-amber-100 text-amber-700",
  execution_complete: "bg-purple-100 text-purple-700",
  draft_prepared: "bg-purple-100 text-purple-700",
  client_review: "bg-cyan-100 text-cyan-700",
  account_closure: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-700",
};

const TASK_STATUS_COLORS: Record<string, string> = {
  to_do: "bg-slate-100 text-slate-700",
  doing: "bg-blue-100 text-blue-700",
  blocked: "bg-red-100 text-red-700",
  done: "bg-green-100 text-green-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
};

export const ProjectDetailsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!projectId) return;

      try {
        setLoading(true);
        const response = await apiClient.get(`/projects/${projectId}`);
        setProject(response.data.data);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching project details:", err);
        setError(err.response?.data?.error?.message || "Failed to load project details");
        toast.error("Failed to load project details");
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetails();
  }, [projectId]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatStatus = (status?: string) => {
    if (!status) return "-";
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Calculate task statistics
  const getTaskStats = (): TaskStats => {
    const tasks = project?.tasks || [];
    return {
      total: tasks.length,
      to_do: tasks.filter((t) => t.status === "to_do").length,
      doing: tasks.filter((t) => t.status === "doing").length,
      blocked: tasks.filter((t) => t.status === "blocked").length,
      done: tasks.filter((t) => t.status === "done").length,
    };
  };

  // Calculate checklist statistics from template assignments
  const getChecklistStats = (): ChecklistStats => {
    const assignments = project?.templateAssignments || [];
    return {
      total: assignments.length,
      assigned: assignments.filter((a) => a.status === "assigned").length,
      submitted: assignments.filter((a) => a.status === "submitted").length,
      incomplete: assignments.filter((a) => a.status === "incomplete").length,
      verified: assignments.filter((a) => a.status === "verified").length,
    };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {projectId && <ProjectDetailsHeader projectId={projectId} currentPage="details" />}
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        {projectId && <ProjectDetailsHeader projectId={projectId} currentPage="details" />}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-800 mb-2">Failed to Load Project</h3>
          <p className="text-red-600 mb-4">{error || "Project not found"}</p>
          <button
            onClick={() => navigate("/projects")}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const taskStats = getTaskStats();
  const checklistStats = getChecklistStats();

  return (
    <div className="space-y-6">
      {/* Project Header with Navigation */}
      <ProjectDetailsHeader
        projectId={projectId!}
        showBackButton={true}
        currentPage="details"
      />

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Tasks Overview */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-500">Tasks</h4>
            <ListChecks className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{taskStats.total}</p>
          <div className="flex items-center space-x-2 mt-2 text-xs">
            <span className="text-green-600">{taskStats.done} done</span>
            <span className="text-slate-300">|</span>
            <span className="text-blue-600">{taskStats.doing} in progress</span>
            {taskStats.blocked > 0 && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-red-600">{taskStats.blocked} blocked</span>
              </>
            )}
          </div>
        </div>

        {/* Checklists Overview */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-500">Checklists</h4>
            <ClipboardList className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{checklistStats.total}</p>
          <div className="flex items-center space-x-2 mt-2 text-xs flex-wrap gap-1">
            <span className="text-green-600">{checklistStats.verified} verified</span>
            <span className="text-slate-300">|</span>
            <span className="text-blue-600">{checklistStats.submitted} submitted</span>
            {checklistStats.incomplete > 0 && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-orange-600">{checklistStats.incomplete} incomplete</span>
              </>
            )}
          </div>
        </div>

        {/* Services */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-500">Services</h4>
            <Briefcase className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{project.projectServices?.length || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Assigned to project</p>
        </div>

        {/* Budget */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-500">Budget</h4>
            <DollarSign className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(project.estimatedCost)}</p>
          {project.actualCost && (
            <p className="text-xs text-slate-500 mt-2">
              Actual: {formatCurrency(project.actualCost)}
            </p>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Project Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Details Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-slate-500" />
              Project Information
            </h3>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-500 mb-1">Project Number</p>
                <p className="text-sm font-medium text-slate-900 flex items-center">
                  <Hash className="w-4 h-4 mr-1 text-slate-400" />
                  {project.projectNumber}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-1">Status</p>
                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[project.status] || "bg-slate-100 text-slate-700"}`}>
                  {formatStatus(project.status)}
                </span>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-1">Start Date</p>
                <p className="text-sm font-medium text-slate-900 flex items-center">
                  <Calendar className="w-4 h-4 mr-1 text-slate-400" />
                  {formatDate(project.startDate)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-1">End Date</p>
                <p className="text-sm font-medium text-slate-900 flex items-center">
                  <Calendar className="w-4 h-4 mr-1 text-slate-400" />
                  {formatDate(project.endDate)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-1">Estimated Cost</p>
                <p className="text-sm font-medium text-slate-900">
                  {formatCurrency(project.estimatedCost)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-1">Actual Cost</p>
                <p className="text-sm font-medium text-slate-900">
                  {formatCurrency(project.actualCost)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-1">PO Number</p>
                <p className="text-sm font-medium text-slate-900">
                  {project.poNumber || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-1">PO Attachment</p>
                {project.poAttachmentPath ? (
                  <button
                    onClick={async () => {
                      try {
                        const response = await apiClient.get(
                          `/projects/${project.id}/po-attachment/download`,
                          { responseType: 'blob' }
                        );
                        const url = window.URL.createObjectURL(new Blob([response.data]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', project.poAttachmentOriginalName || 'po-attachment');
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        window.URL.revokeObjectURL(url);
                      } catch {
                        toast.error('Failed to download PO attachment');
                      }
                    }}
                    className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    <Paperclip className="w-4 h-4 mr-1" />
                    <span className="truncate max-w-[150px]">{project.poAttachmentOriginalName}</span>
                    <Download className="w-3 h-3 ml-1.5" />
                  </button>
                ) : (
                  <p className="text-sm text-slate-500">-</p>
                )}
              </div>

              <div className="col-span-2">
                <p className="text-sm text-slate-500 mb-1">Description</p>
                <p className="text-sm text-slate-700">
                  {project.description || "No description provided"}
                </p>
              </div>

              {project.notes && (
                <div className="col-span-2">
                  <p className="text-sm text-slate-500 mb-1">Internal Notes</p>
                  <p className="text-sm text-slate-700 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                    {project.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Status Workflow Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-slate-500" />
              Status Workflow
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-2">Verification</p>
                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${
                  project.verificationStatus === "passed" ? "bg-green-100 text-green-700" :
                  project.verificationStatus === "failed" ? "bg-red-100 text-red-700" :
                  "bg-slate-100 text-slate-700"
                }`}>
                  {formatStatus(project.verificationStatus) || "Pending"}
                </span>
              </div>

              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-2">Execution</p>
                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${
                  project.executionStatus === "complete" ? "bg-green-100 text-green-700" :
                  project.executionStatus === "in_progress" ? "bg-blue-100 text-blue-700" :
                  "bg-slate-100 text-slate-700"
                }`}>
                  {formatStatus(project.executionStatus) || "Pending"}
                </span>
              </div>

              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-2">Client Review</p>
                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${
                  project.clientReviewStatus === "approved" ? "bg-green-100 text-green-700" :
                  project.clientReviewStatus === "pending" ? "bg-yellow-100 text-yellow-700" :
                  "bg-slate-100 text-slate-700"
                }`}>
                  {formatStatus(project.clientReviewStatus) || "Pending"}
                </span>
              </div>

              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-2">Payment</p>
                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${
                  project.paymentStatus === "paid" ? "bg-green-100 text-green-700" :
                  project.paymentStatus === "partial" ? "bg-yellow-100 text-yellow-700" :
                  "bg-slate-100 text-slate-700"
                }`}>
                  {formatStatus(project.paymentStatus) || "Pending"}
                </span>
              </div>
            </div>
          </div>

          {/* Services Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-slate-500" />
              Project Services
            </h3>

            {project.projectServices && project.projectServices.length > 0 ? (
              <div className="space-y-3">
                {project.projectServices.map((ps) => (
                  <div
                    key={ps.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{ps.service.name}</p>
                      <p className="text-xs text-slate-500">{ps.service.category}</p>
                    </div>
                    {ps.service.description && (
                      <p className="text-xs text-slate-500 max-w-xs truncate">
                        {ps.service.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No services assigned</p>
            )}
          </div>

          {/* Recent Tasks */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <ListChecks className="w-5 h-5 mr-2 text-slate-500" />
                Recent Tasks
              </h3>
              <PermissionGate requiredPermissions={["tasks:read"]}>
                <button
                  onClick={() => navigate(`/projects/${projectId}/tasks`)}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                >
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </PermissionGate>
            </div>

            {project.tasks && project.tasks.length > 0 ? (
              <div className="space-y-3">
                {project.tasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${TASK_STATUS_COLORS[task.status] || "bg-slate-100 text-slate-700"}`}>
                          {formatStatus(task.status)}
                        </span>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${PRIORITY_COLORS[task.priority] || "bg-slate-100 text-slate-700"}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      {task.assignee && (
                        <p className="text-xs text-slate-500">
                          {task.assignee.firstName} {task.assignee.lastName}
                        </p>
                      )}
                      {task.dueDate && (
                        <p className="text-xs text-slate-400 mt-1">
                          Due: {formatDate(task.dueDate)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No tasks created yet</p>
            )}
          </div>
        </div>

        {/* Right Column - Organization & Quotation Info */}
        <div className="space-y-6">
          {/* Organization Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-slate-500" />
              Organization
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-900">{project.organization.name}</p>
                <span className="inline-flex px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded mt-1">
                  {project.organization.type}
                </span>
              </div>

              {project.organization.email && (
                <div className="flex items-center text-sm text-slate-600">
                  <Mail className="w-4 h-4 mr-2 text-slate-400" />
                  {project.organization.email}
                </div>
              )}

              {project.organization.phone && (
                <div className="flex items-center text-sm text-slate-600">
                  <Phone className="w-4 h-4 mr-2 text-slate-400" />
                  {project.organization.phone}
                </div>
              )}
            </div>
          </div>

          {/* Quotation Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-slate-500" />
              Quotation
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500">Quotation Number</p>
                <p className="text-sm font-medium text-slate-900">{project.quotation.quotation_number}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Title</p>
                <p className="text-sm text-slate-700">{project.quotation.title}</p>
              </div>

              {project.quotation.amount && (
                <div>
                  <p className="text-xs text-slate-500">Amount</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(project.quotation.amount)}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs text-slate-500">Status</p>
                <span className="inline-flex px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                  {project.quotation.status}
                </span>
              </div>
            </div>
          </div>

          {/* Lead/Contact Card */}
          {project.quotation.lead && (
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-slate-500" />
                Lead Contact
              </h3>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500">Lead Title</p>
                  <p className="text-sm font-medium text-slate-900">{project.quotation.lead.title}</p>
                </div>

                {project.quotation.lead.contactName && (
                  <div className="flex items-center text-sm text-slate-600">
                    <User className="w-4 h-4 mr-2 text-slate-400" />
                    {project.quotation.lead.contactName}
                  </div>
                )}

                {project.quotation.lead.contactEmail && (
                  <div className="flex items-center text-sm text-slate-600">
                    <Mail className="w-4 h-4 mr-2 text-slate-400" />
                    {project.quotation.lead.contactEmail}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>

            <div className="space-y-3">
              <PermissionGate requiredPermissions={["checklists:read"]}>
                <button
                  onClick={() => navigate(`/projects/${projectId}/checklists`)}
                  className="w-full flex items-center justify-between p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <span className="flex items-center">
                    <ClipboardList className="w-4 h-4 mr-2" />
                    Manage Checklists
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </PermissionGate>

              <PermissionGate requiredPermissions={["tasks:read"]}>
                <button
                  onClick={() => navigate(`/projects/${projectId}/tasks`)}
                  className="w-full flex items-center justify-between p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <span className="flex items-center">
                    <ListChecks className="w-4 h-4 mr-2" />
                    Manage Tasks
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </PermissionGate>
            </div>
          </div>

          {/* Timeline Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-slate-500" />
              Timeline
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500">Created</p>
                <p className="text-sm text-slate-700">{formatDate(project.createdAt)}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Last Updated</p>
                <p className="text-sm text-slate-700">{formatDate(project.updatedAt)}</p>
              </div>

              {project.startDate && (
                <div>
                  <p className="text-xs text-slate-500">Project Start</p>
                  <p className="text-sm text-slate-700">{formatDate(project.startDate)}</p>
                </div>
              )}

              {project.endDate && (
                <div>
                  <p className="text-xs text-slate-500">Project End</p>
                  <p className="text-sm text-slate-700">{formatDate(project.endDate)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsPage;
