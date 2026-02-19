import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api/client";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Hash,
  FileText,
  ClipboardList,
  CheckCircle,
  Clock,
  AlertTriangle,
  LayoutDashboard,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  projectNumber: string;
  status: string;
  verificationStatus?: string;
  executionStatus?: string;
  clientReviewStatus?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  organization?: {
    id: string;
    name: string;
  };
  quotation?: {
    id: string;
    quotation_number: string;
    title: string;
  };
}

interface ProjectDetailsHeaderProps {
  projectId: string;
  showBackButton?: boolean;
  currentPage?: "details" | "checklists" | "tasks";
}

const statusColors: Record<string, string> = {
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

const getStatusIcon = (status: string) => {
  switch (status?.toLowerCase()) {
    case "completed":
    case "verification_passed":
    case "execution_complete":
      return <CheckCircle className="w-4 h-4" />;
    case "execution_in_progress":
    case "client_review":
      return <Clock className="w-4 h-4" />;
    case "planned":
      return <FileText className="w-4 h-4" />;
    default:
      return <AlertTriangle className="w-4 h-4" />;
  }
};

export const ProjectDetailsHeader: React.FC<ProjectDetailsHeaderProps> = ({
  projectId,
  showBackButton = true,
  currentPage,
}) => {
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await apiClient.get(`/projects/${projectId}`);
        setProject(response.data.data);
      } catch (error) {
        console.error("Error fetching project:", error);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <div className="animate-pulse flex items-center space-x-4">
          <div className="h-10 w-10 bg-slate-200 rounded-lg"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-700 text-sm">Failed to load project details</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
      {/* Top Row: Back Button & Project Name */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4">
          {showBackButton && (
            <button
              onClick={() => navigate("/projects")}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors mt-1"
              title="Back to Projects"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h2 className="text-xl font-semibold text-slate-900">
                {project.name}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
                  statusColors[project.status] || "bg-slate-100 text-slate-700"
                }`}
              >
                {getStatusIcon(project.status)}
                {project.status?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </span>
            </div>
            <div className="flex items-center space-x-4 text-sm text-slate-500">
              <span className="flex items-center">
                <Hash className="w-4 h-4 mr-1" />
                {project.projectNumber}
              </span>
              {project.organization && (
                <span className="flex items-center">
                  <Building2 className="w-4 h-4 mr-1" />
                  {project.organization.name}
                </span>
              )}
              {project.startDate && (
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {formatDate(project.startDate)}
                  {project.endDate && ` - ${formatDate(project.endDate)}`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate(`/projects/${projectId}/details`)}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              currentPage === "details"
                ? "bg-primary-100 text-primary-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Details
          </button>
          <button
            onClick={() => navigate(`/projects/${projectId}/checklists`)}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              currentPage === "checklists"
                ? "bg-green-100 text-green-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            Checklists
          </button>
          <button
            onClick={() => navigate(`/projects/${projectId}/tasks`)}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              currentPage === "tasks"
                ? "bg-blue-100 text-blue-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FileText className="w-4 h-4 mr-2" />
            Tasks
          </button>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-slate-600 mt-3 pt-3 border-t border-slate-100">
          {project.description}
        </p>
      )}

      {/* Status Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
        {project.verificationStatus && (
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Verification</p>
            <p className="text-sm font-medium text-slate-700">
              {project.verificationStatus?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </p>
          </div>
        )}
        {project.executionStatus && (
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Execution</p>
            <p className="text-sm font-medium text-slate-700">
              {project.executionStatus?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </p>
          </div>
        )}
        {project.clientReviewStatus && (
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Client Review</p>
            <p className="text-sm font-medium text-slate-700">
              {project.clientReviewStatus?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </p>
          </div>
        )}
        {project.paymentStatus && (
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Payment</p>
            <p className="text-sm font-medium text-slate-700">
              {project.paymentStatus?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetailsHeader;
