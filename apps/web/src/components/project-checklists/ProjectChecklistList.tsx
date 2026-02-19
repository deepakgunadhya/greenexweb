import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store";
import { toast } from "sonner";
import {
  fetchProjectChecklists,
  fetchAvailableTemplates,
  fetchChecklistAssignableUsers,
  assignTemplate,
  selectChecklistsLoading,
  selectChecklistsError,
  selectAvailableTemplates,
  selectTemplatesLoading,
  selectTemplateAssigning,
  selectChecklistAssignableUsers,
  selectChecklistAssignableUsersLoading,
  setFilters,
  selectFilteredChecklists,
  clearError,
} from "../../store/slices/projectChecklistsSlice";
import ProjectChecklistsAPI from "../../lib/api/project-checklists";
import { PermissionGate } from "../common/PermissionGate";
import { ProjectDetailsHeader } from "../common/ProjectDetailsHeader";
import {
  Plus,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  Download,
  Upload,
  X,
  Paperclip,
  Calendar,
  MessageSquare,
  XCircle,
  CheckCircle2,
  User,
} from "lucide-react";
import { clientSubmissionsApi } from "../../lib/api/client-submissions";
import { Pagination } from "../pagination/Pagination";

const statusColors: Record<string, string> = {
  assigned: "bg-blue-100 text-blue-700",
  submitted: "bg-purple-100 text-purple-700",
  under_review: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  verified: "bg-emerald-100 text-emerald-700",
  draft: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  ready_for_verification: "bg-purple-100 text-purple-700",
  verified_passed: "bg-green-100 text-green-700",
  verified_failed: "bg-red-100 text-red-700",
  finalized: "bg-emerald-100 text-emerald-700",
  superseded: "bg-gray-100 text-gray-500",
};

const statusIcons: Record<string, React.ReactNode> = {
  assigned: <Clock className="w-4 h-4" />,
  submitted: <Upload className="w-4 h-4" />,
  under_review: <Eye className="w-4 h-4" />,
  approved: <CheckCircle className="w-4 h-4" />,
  rejected: <AlertTriangle className="w-4 h-4" />,
  verified: <CheckCircle className="w-4 h-4" />,
  draft: <FileText className="w-4 h-4" />,
  in_progress: <Clock className="w-4 h-4" />,
  ready_for_verification: <AlertTriangle className="w-4 h-4" />,
  verified_passed: <CheckCircle className="w-4 h-4" />,
  verified_failed: <AlertTriangle className="w-4 h-4" />,
  finalized: <CheckCircle className="w-4 h-4" />,
  superseded: <FileText className="w-4 h-4" />,
};

// Interface for the API response
interface TemplateFileAttachment {
  id: string;
  originalName: string;
  filePath: string;
  mimeType: string;
  fileSize?: string;
}

interface TemplateFile {
  id: string;
  title: string;
  description?: string;
  category: string;
  createdAt: string;
  attachments: TemplateFileAttachment[];
}

interface ClientSubmission {
  id: string;
  version: number;
  filePath: string;
  originalName: string;
  fileSize?: string;
  mimeType?: string;
  status: string;
  uploadedBy: string;
  uploadedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewRemarks?: string;
  clientComment?: string;
  isLatest: boolean;
  submissionSource?: string;
  uploader?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface ProjectTemplateAssignment {
  id: string;
  projectId: string;
  templateFileId: string;
  status: string;
  assignedBy?: string;
  assignedAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
  currentRemarks?: string;
  assignedToUserId?: string;
  assignedToUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  templateFile: TemplateFile;
  submissions: ClientSubmission[];
}

export const ProjectChecklistList: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const dispatch = useAppDispatch();

  // Use any type for now since we're dealing with mixed data
  const checklists = useAppSelector(selectFilteredChecklists) as any[];
  const loading = useAppSelector(selectChecklistsLoading);
  const error = useAppSelector(selectChecklistsError);
  const availableTemplates = useAppSelector(selectAvailableTemplates);
  const templatesLoading = useAppSelector(selectTemplatesLoading);
  const assigning = useAppSelector(selectTemplateAssigning);
  const assignableUsers = useAppSelector(selectChecklistAssignableUsers);
  const assignableUsersLoading = useAppSelector(selectChecklistAssignableUsersLoading);

  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(10);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedAssignedUser, setSelectedAssignedUser] = useState<string>("");
  const [assignmentReason, setAssignmentReason] = useState("");
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [selectedChecklistId, setSelectedChecklistId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadComment, setUploadComment] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingSubmission, setReviewingSubmission] = useState<ClientSubmission | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  // Detail modal state - must be declared before the useEffect that references it
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);

  // Close template modal handler
  const handleCloseTemplateModal = useCallback(() => {
    setShowTemplateModal(false);
    setSelectedTemplate("");
    setSelectedAssignedUser("");
    setAssignmentReason("");
  }, []);

  // Close file upload modal handler
  const handleCloseFileUploadModal = useCallback(() => {
    setShowFileUploadModal(false);
    setSelectedChecklistId("");
    setSelectedFile(null);
    setUploadComment("");
  }, []);

  // Close review modal handler
  const handleCloseReviewModal = useCallback(() => {
    setShowReviewModal(false);
    setReviewingSubmission(null);
    setReviewRemarks("");
  }, []);

  // Close detail modal handler - must be declared before the useEffect that references it
  const handleCloseDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedAssignment(null);
  }, []);

  // Handle Escape key to close modals
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showTemplateModal) {
          handleCloseTemplateModal();
        }
        if (showFileUploadModal) {
          handleCloseFileUploadModal();
        }
        if (showReviewModal) {
          handleCloseReviewModal();
        }
        if (showDetailModal) {
          handleCloseDetailModal();
        }
      }
    };

    if (showTemplateModal || showFileUploadModal || showReviewModal || showDetailModal) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [showTemplateModal, showFileUploadModal, showReviewModal, showDetailModal, handleCloseTemplateModal, handleCloseFileUploadModal, handleCloseReviewModal, handleCloseDetailModal]);

  useEffect(() => {
    if (projectId) {
      dispatch(fetchProjectChecklists({ projectId }));
    }
  }, [dispatch, projectId]);

  const handleViewChecklist = (assignment: any) => {
    setSelectedAssignment(assignment);
    setShowDetailModal(true);
  };

  const handleDetailBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleCloseDetailModal();
    }
  };

  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
    setCurrentPage(1);
    dispatch(setFilters({ status: status || undefined }));
  };

  // Client-side pagination
  const paginatedChecklists = useMemo(() => {
    const start = (currentPage - 1) * currentPageSize;
    return checklists.slice(start, start + currentPageSize);
  }, [checklists, currentPage, currentPageSize]);

  const totalPages = Math.ceil(checklists.length / currentPageSize);

  const handleShowTemplateModal = async () => {
    if (!projectId) return;

    // Fetch available templates and assignable users via Redux
    dispatch(fetchAvailableTemplates(projectId));
    dispatch(fetchChecklistAssignableUsers(projectId));
    setShowTemplateModal(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileUpload = async () => {
    if (!projectId || !selectedChecklistId || !selectedFile) return;

    setIsUploading(true);

    try {
      await clientSubmissionsApi.adminUploadSubmission({
        assignmentId: selectedChecklistId,
        file: selectedFile,
        comment: uploadComment.trim() || undefined,
      });
      toast.success("Submission uploaded successfully");
      handleCloseFileUploadModal();
      // Refresh the checklist list
      dispatch(fetchProjectChecklists({ projectId }));
    } catch (error: any) {
      console.error("Failed to upload file:", error);
      toast.error(error?.response?.data?.error?.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAttachmentDownload = async (attachment: TemplateFileAttachment) => {
    try {
      await ProjectChecklistsAPI.downloadTemplateFile(attachment.id);
      toast.success("File downloaded successfully");
    } catch (error: any) {
      console.error("Failed to download file:", error);
      toast.error(error?.message || "Failed to download file");
    }
  };

  const handleSubmissionDownload = async (_assignmentId: string, submissionId: string) => {
    if (!projectId) return;
    try {
      await clientSubmissionsApi.downloadSubmission(submissionId);
      toast.success("File downloaded successfully");
    } catch (error: any) {
      console.error("Failed to download file:", error);
      toast.error(error?.message || "Failed to download file");
    }
  };

  const handleAssignTemplate = async () => {
    if (!projectId || !selectedTemplate) return;

    try {
      await dispatch(
        assignTemplate({
          projectId,
          templateFileId: selectedTemplate,
          assignedToUserId: selectedAssignedUser || undefined,
          reason: assignmentReason,
        })
      ).unwrap();
      handleCloseTemplateModal();
      if (projectId) {
        dispatch(fetchProjectChecklists({ projectId }));
      }
    } catch (error) {
      console.error("Failed to assign template:", error);
    }
  };

  const handleTemplateBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleCloseTemplateModal();
    }
  };

  const handleFileUploadBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleCloseFileUploadModal();
    }
  };

  // Review modal handlers
  const handleOpenReviewModal = (submission: ClientSubmission) => {
    setReviewingSubmission(submission);
    setReviewRemarks("");
    setShowReviewModal(true);
  };

  const handleReviewSubmission = async (action: 'approve' | 'reject') => {
    if (!reviewingSubmission) return;

    // Reject requires remarks
    if (action === 'reject' && !reviewRemarks.trim()) {
      toast.error('Please provide remarks for rejection');
      return;
    }

    setIsReviewing(true);
    try {
      await clientSubmissionsApi.reviewSubmission({
        submissionId: reviewingSubmission.id,
        action,
        remarks: reviewRemarks.trim() || undefined,
      });

      toast.success(action === 'approve' ? 'Submission approved successfully' : 'Submission rejected with remarks');
      handleCloseReviewModal();

      // Refresh the checklist list
      if (projectId) {
        dispatch(fetchProjectChecklists({ projectId }));
      }
    } catch (error: any) {
      console.error('Failed to review submission:', error);
      toast.error(error?.response?.data?.error?.message || `Failed to ${action} submission`);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleReviewBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleCloseReviewModal();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatFileSize = (bytes: string | number | undefined) => {
    if (!bytes) return "N/A";
    const size = typeof bytes === "string" ? parseInt(bytes) : bytes;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getUniqueStatuses = (): string[] => {
    const statuses = new Set(checklists.map((c) => c.status));
    return Array.from(statuses);
  };

  // Helper to check if data is ProjectTemplateAssignment format
  const isTemplateAssignment = (item: any): item is ProjectTemplateAssignment => {
    return item && item.templateFile !== undefined;
  };

  // Get display name for checklist/assignment
  const getDisplayName = (item: any): string => {
    if (isTemplateAssignment(item)) {
      return item.templateFile?.title || "Untitled";
    }
    return item.template?.name || item.name || "Untitled";
  };

  // Get category for checklist/assignment
  const getCategory = (item: any): string => {
    if (isTemplateAssignment(item)) {
      return item.templateFile?.category || "General";
    }
    return item.template?.category || item.category || "General";
  };

  // Get description for checklist/assignment
  const getDescription = (item: any): string | undefined => {
    if (isTemplateAssignment(item)) {
      return item.templateFile?.description;
    }
    return item.template?.description || item.description;
  };

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

  if (loading && checklists.length === 0) {
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
          currentPage="checklists"
        />
      )}

      {/* Page Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Project Checklists</h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage and track project checklist completion
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <PermissionGate requiredPermissions={["checklists:create"]}>
            <button
              type="button"
              onClick={handleShowTemplateModal}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Assign Template
            </button>
          </PermissionGate>

          {/* <PermissionGate requiredPermissions={["checklists:create"]}>
            <button
              type="button"
              onClick={handleCreateChecklists}
              disabled={creating}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              {creating ? "Creating..." : "Create Checklists"}
            </button>
          </PermissionGate> */}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-xs">
            <label
              htmlFor="status-filter"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Filter by Status
            </label>
            <select
              id="status-filter"
              value={selectedStatus}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              {getUniqueStatuses().map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-slate-600 pt-6">
            Showing {paginatedChecklists.length} of {checklists.length} checklist{checklists.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Checklists Grid */}
      {checklists.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No checklists found</h3>
          <p className="text-slate-600 mb-4">
            {selectedStatus
              ? "No checklists match your current filters."
              : "Get started by assigning a template to this project."}
          </p>
          {!selectedStatus && (
            <PermissionGate requiredPermissions={["checklists:create"]}>
              <button
                type="button"
                onClick={handleShowTemplateModal}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Assign Template
              </button>
            </PermissionGate>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {paginatedChecklists.map((checklist) => {
            const isAssignment = isTemplateAssignment(checklist);
            const attachments = isAssignment ? checklist.templateFile?.attachments || [] : [];
            const submissions = isAssignment ? checklist.submissions || [] : [];
            submissions.find((s: ClientSubmission) => s.isLatest);

            return (
              <div
                key={checklist.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Header */}
                <div className="p-5 pb-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 mb-1 truncate">
                        {getDisplayName(checklist)}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                          {getCategory(checklist)}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        statusColors[checklist.status] || "bg-slate-100 text-slate-700"
                      } flex-shrink-0`}
                    >
                      <span className="mr-1.5">{statusIcons[checklist.status]}</span>
                      {checklist.status.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </div>
                  </div>

                  {/* Description */}
                  {getDescription(checklist) && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                      {getDescription(checklist)}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-slate-600">
                      <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                      <span>Assigned: {formatDate(checklist.assignedAt || checklist.createdAt)}</span>
                    </div>

                    {checklist.assignedToUser && (
                      <div className="flex items-center text-slate-600">
                        <User className="w-4 h-4 mr-2 text-slate-400" />
                        <span>Assigned to: {checklist.assignedToUser.firstName} {checklist.assignedToUser.lastName}</span>
                      </div>
                    )}

                    {checklist.currentRemarks && (
                      <div className="flex items-start text-slate-600">
                        <MessageSquare className="w-4 h-4 mr-2 mt-0.5 text-slate-400 flex-shrink-0" />
                        <span className="line-clamp-2">{checklist.currentRemarks}</span>
                      </div>
                    )}
                  </div>

                  {/* Template Attachments */}
                  {attachments.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Template Files
                        </span>
                        <span className="text-xs text-slate-400">
                          {attachments.length} file{attachments.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-28 overflow-y-auto">
                        {attachments.map((attachment: TemplateFileAttachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center justify-between group py-1.5 px-2 rounded-md hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <Paperclip className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span
                                className="text-xs text-slate-600 truncate"
                                title={attachment.originalName}
                              >
                                {attachment.originalName}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAttachmentDownload(attachment);
                              }}
                              className="p-1 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submissions */}
                  {submissions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Submissions
                        </span>
                        <span className="text-xs text-slate-400">
                          {submissions.length} version{submissions.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-28 overflow-y-auto">
                        {submissions.map((submission: ClientSubmission) => (
                          <div
                            key={submission.id}
                            className={`flex items-center justify-between group py-1.5 px-2 rounded-md transition-colors ${
                              submission.isLatest
                                ? "bg-green-50 border border-green-100"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span
                                className="text-xs text-slate-600 truncate"
                                title={submission.originalName}
                              >
                                v{submission.version}: {submission.originalName}
                              </span>
                              {submission.isLatest && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">
                                  Latest
                                </span>
                              )}
                              {submission.submissionSource === 'admin' && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-orange-100 text-orange-700 rounded">
                                  Admin
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                                  statusColors[submission.status] || "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {submission.status}
                              </span>
                              {/* Review button - only for submitted status */}
                              {submission.status === 'submitted' && submission.isLatest && (
                                <PermissionGate requiredPermissions={["checklists:review"]}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenReviewModal(submission);
                                    }}
                                    className="p-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded transition-all"
                                    title="Review Submission"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                </PermissionGate>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSubmissionDownload(checklist.id, submission.id);
                                }}
                                className="p-1 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    {checklist.verifiedAt
                      ? `Verified ${formatDate(checklist.verifiedAt)}`
                      : submissions.length > 0
                      ? `${submissions.length} submission${submissions.length !== 1 ? "s" : ""}`
                      : "No submissions yet"}
                  </div>

                  <div className="flex items-center space-x-1">
                    {/* Submit Checklist button for assigned/incomplete */}
                    {(checklist.status === 'assigned' || checklist.status === 'incomplete') && (
                      <PermissionGate requiredPermissions={["checklists:create"]}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedChecklistId(checklist.id);
                            setShowFileUploadModal(true);
                          }}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                          title="Submit Checklist"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      </PermissionGate>
                    )}

                    {/* Review button for submitted assignments */}
                    {checklist.status === 'submitted' && (
                      <PermissionGate requiredPermissions={["checklists:review"]}>
                        <button
                          type="button"
                          onClick={() => {
                            const latestSub = submissions.find((s: ClientSubmission) => s.isLatest);
                            if (latestSub) handleOpenReviewModal(latestSub);
                          }}
                          className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                          title="Review Submission"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </PermissionGate>
                    )}

                    {/* View Details button */}
                    <PermissionGate requiredPermissions={["checklists:read"]}>
                      <button
                        type="button"
                        onClick={() => handleViewChecklist(checklist)}
                        className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                        title="View Details"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </PermissionGate>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={checklists.length}
        pageSize={currentPageSize}
        loading={loading}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(size) => {
          setCurrentPageSize(size);
          setCurrentPage(1);
        }}
      />

      {/* Template Assignment Modal */}
      {showTemplateModal && (
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200"
          onClick={handleTemplateBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="template-modal-title"
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h2 id="template-modal-title" className="text-lg font-bold text-slate-800">
                  Assign Checklist Template
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Select a template to assign to this project.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseTemplateModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              {templatesLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
                  <p className="text-sm text-slate-500 font-medium">Loading templates...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {availableTemplates.length === 0 && (
                      <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-white">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-base font-semibold text-slate-900">
                          No Templates Available
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                          There are no templates available to assign to this project.
                        </p>
                      </div>
                    )}

                  {availableTemplates.length > 0 && (
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Available Templates
                      </label>

                      <div className="space-y-2">
                        {/* Available Templates from Redux */}
                        {availableTemplates.map((file: any) => {
                          const isSelected = selectedTemplate === file.id;
                          const attachments = file.attachments || [];

                          return (
                            <div
                              key={file.id}
                              onClick={() => setSelectedTemplate(file.id)}
                              className={`group relative flex items-start p-4 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                  ? "border-primary-600 bg-primary-50/50 ring-1 ring-primary-600"
                                  : "border-slate-200 bg-white hover:border-primary-300 hover:shadow-sm"
                              }`}
                            >
                              <div className="flex items-center justify-center h-5 w-5 mt-0.5 mr-4 flex-shrink-0">
                                <div
                                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                    isSelected
                                      ? "border-primary-600 bg-primary-600"
                                      : "border-slate-300 bg-white group-hover:border-primary-400"
                                  }`}
                                >
                                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className={`text-sm font-semibold ${isSelected ? "text-primary-900" : "text-slate-900"}`}>
                                    {file.title}
                                  </h4>
                                  <span className="inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-slate-100 text-slate-600">
                                    {file.category}
                                  </span>
                                </div>

                                {file.description && (
                                  <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                                    {file.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                  <span className="flex items-center">
                                    <Paperclip className="w-3 h-3 mr-1" />
                                    {attachments.length} file{attachments.length !== 1 ? "s" : ""}
                                  </span>
                                  <span>{formatDate(file.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Assign To User Section */}
                  <div className="pt-2">
                    <label htmlFor="assigned-user" className="block text-sm font-semibold text-slate-700 mb-2">
                      Assign To User <span className="font-normal text-slate-400">(Optional)</span>
                    </label>
                    <select
                      id="assigned-user"
                      value={selectedAssignedUser}
                      onChange={(e) => setSelectedAssignedUser(e.target.value)}
                      disabled={assignableUsersLoading}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    >
                      <option value="">No specific user (visible to all)</option>
                      {assignableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}{user.role ? ` (${user.role.name})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-xs text-slate-400">
                      If selected, only this user and Super Admin will see this template.
                    </p>
                  </div>

                  {/* Reason Section */}
                  <div className="pt-2">
                    <label htmlFor="assignment-reason" className="block text-sm font-semibold text-slate-700 mb-2">
                      Reason for Assignment <span className="font-normal text-slate-400">(Optional)</span>
                    </label>
                    <textarea
                      id="assignment-reason"
                      value={assignmentReason}
                      onChange={(e) => setAssignmentReason(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
                      placeholder="e.g., Required for environmental compliance..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={handleCloseTemplateModal}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignTemplate}
                disabled={!selectedTemplate || assigning}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigning ? "Assigning..." : "Assign Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      {showFileUploadModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleFileUploadBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="file-upload-modal-title"
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 id="file-upload-modal-title" className="text-lg font-semibold text-slate-900">
                Upload Submission
              </h2>
              <button
                type="button"
                onClick={handleCloseFileUploadModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Select Checklist if not pre-selected */}
              {!selectedChecklistId && (
                <div>
                  <label htmlFor="checklist-select" className="block text-sm font-medium text-slate-700 mb-2">
                    Select Checklist <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="checklist-select"
                    value={selectedChecklistId}
                    onChange={(e) => setSelectedChecklistId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Choose a checklist...</option>
                    {checklists.map((checklist) => (
                      <option key={checklist.id} value={checklist.id}>
                        {getDisplayName(checklist)} ({getCategory(checklist)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Show selected checklist name */}
              {selectedChecklistId && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Uploading to:</span>{" "}
                    {getDisplayName(checklists.find((c) => c.id === selectedChecklistId))}
                  </p>
                </div>
              )}

              {/* File Input */}
              <div>
                <label htmlFor="file-select" className="block text-sm font-medium text-slate-700 mb-2">
                  Select File <span className="text-red-500">*</span>
                </label>
                <input
                  id="file-select"
                  type="file"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-slate-100"
                />
                {selectedFile && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-700">{selectedFile.name}</span>
                      <span className="text-xs text-slate-500">({formatFileSize(selectedFile.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        const input = document.getElementById("file-select") as HTMLInputElement;
                        if (input) input.value = "";
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Comment */}
              <div>
                <label htmlFor="upload-comment" className="block text-sm font-medium text-slate-700 mb-2">
                  Comment <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  id="upload-comment"
                  value={uploadComment}
                  onChange={(e) => setUploadComment(e.target.value)}
                  rows={2}
                  disabled={isUploading}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-slate-100 resize-none text-sm"
                  placeholder="Add a note about this submission..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex space-x-3 p-5 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={handleCloseFileUploadModal}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFileUpload}
                disabled={!selectedChecklistId || !selectedFile || isUploading}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Review Modal */}
      {showReviewModal && reviewingSubmission && (
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200"
          onClick={handleReviewBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <div>
                <h2 id="review-modal-title" className="text-lg font-bold text-slate-800">
                  Review Submission
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Approve or reject the client's submission
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseReviewModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Submission Details */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">File</span>
                  <span className="text-sm text-slate-600">{reviewingSubmission.originalName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Version</span>
                  <span className="text-sm text-slate-600">v{reviewingSubmission.version}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Uploaded</span>
                  <span className="text-sm text-slate-600">
                    {new Date(reviewingSubmission.uploadedAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Status</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors[reviewingSubmission.status] || "bg-slate-100 text-slate-600"}`}>
                    {reviewingSubmission.status}
                  </span>
                </div>
                {reviewingSubmission.uploader && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Uploaded By</span>
                    <span className="text-sm text-slate-600">
                      {reviewingSubmission.uploader.firstName} {reviewingSubmission.uploader.lastName}
                    </span>
                  </div>
                )}
              </div>

              {/* Client Comment */}
              {reviewingSubmission.clientComment && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center">
                    <MessageSquare className="w-3.5 h-3.5 mr-1" />
                    Client Comment
                  </p>
                  <p className="text-sm text-blue-700">{reviewingSubmission.clientComment}</p>
                </div>
              )}

              {/* Download Button */}
              <button
                type="button"
                onClick={() => clientSubmissionsApi.downloadSubmission(reviewingSubmission.id)}
                className="w-full flex items-center justify-center px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Submission to Review
              </button>

              {/* Remarks Input */}
              <div>
                <label htmlFor="review-remarks" className="block text-sm font-semibold text-slate-700 mb-2">
                  Remarks <span className="font-normal text-slate-400">(Required for rejection)</span>
                </label>
                <textarea
                  id="review-remarks"
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
                  placeholder="Enter remarks for the client (e.g., what needs to be corrected)..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={handleCloseReviewModal}
                disabled={isReviewing}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReviewSubmission('reject')}
                disabled={isReviewing || !reviewRemarks.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                {isReviewing ? "Processing..." : "Reject"}
              </button>
              <button
                type="button"
                onClick={() => handleReviewSubmission('approve')}
                disabled={isReviewing}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {isReviewing ? "Processing..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Detail Modal */}
      {showDetailModal && selectedAssignment && (
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200"
          onClick={handleDetailBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-modal-title"
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h2 id="detail-modal-title" className="text-lg font-bold text-slate-800">
                  {selectedAssignment.templateFile?.title || "Assignment Details"}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {selectedAssignment.templateFile?.category || "General"} • Assigned {formatDate(selectedAssignment.assignedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[selectedAssignment.status] || "bg-slate-100 text-slate-600"}`}>
                  {selectedAssignment.status?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </span>
                <button
                  type="button"
                  onClick={handleCloseDetailModal}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Description */}
              {selectedAssignment.templateFile?.description && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Description</h3>
                  <p className="text-sm text-slate-600">{selectedAssignment.templateFile.description}</p>
                </div>
              )}

              {/* Template Files */}
              {selectedAssignment.templateFile?.attachments?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Template Files</h3>
                  <div className="space-y-2">
                    {selectedAssignment.templateFile.attachments.map((attachment: TemplateFileAttachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                      >
                        <div className="flex items-center space-x-3">
                          <Paperclip className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-700">{attachment.originalName}</p>
                            <p className="text-xs text-slate-500">{formatFileSize(attachment.fileSize)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAttachmentDownload(attachment)}
                          className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submissions History */}
              {selectedAssignment.submissions?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Submission History</h3>
                  <div className="space-y-3">
                    {selectedAssignment.submissions.map((submission: ClientSubmission) => (
                      <div
                        key={submission.id}
                        className={`p-4 rounded-lg border ${
                          submission.isLatest
                            ? "bg-green-50 border-green-200"
                            : "bg-slate-50 border-slate-100"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-slate-700">
                                Version {submission.version}: {submission.originalName}
                              </span>
                              {submission.isLatest && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">
                                  Latest
                                </span>
                              )}
                              {submission.submissionSource === 'admin' && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-orange-100 text-orange-700 rounded">
                                  Admin
                                </span>
                              )}
                              <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${statusColors[submission.status] || "bg-slate-100 text-slate-600"}`}>
                                {submission.status}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 space-y-1">
                              <p>Uploaded: {new Date(submission.uploadedAt).toLocaleString()}</p>
                              {submission.uploader && (
                                <p>By: {submission.uploader.firstName} {submission.uploader.lastName}</p>
                              )}
                              {submission.clientComment && (
                                <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded text-blue-700">
                                  <p className="font-medium flex items-center">
                                    <MessageSquare className="w-3 h-3 mr-1" />
                                    Client Comment:
                                  </p>
                                  <p>{submission.clientComment}</p>
                                </div>
                              )}
                              {submission.reviewRemarks && (
                                <div className="mt-2 p-2 bg-orange-50 border border-orange-100 rounded text-orange-700">
                                  <p className="font-medium">Admin Remarks:</p>
                                  <p>{submission.reviewRemarks}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {/* Review button for submitted status */}
                            {submission.status === 'submitted' && submission.isLatest && (
                              <PermissionGate requiredPermissions={["checklists:review"]}>
                                <button
                                  onClick={() => {
                                    handleCloseDetailModal();
                                    handleOpenReviewModal(submission);
                                  }}
                                  className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                                  title="Review Submission"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </PermissionGate>
                            )}
                            <button
                              onClick={() => clientSubmissionsApi.downloadSubmission(submission.id)}
                              className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Submissions Yet */}
              {(!selectedAssignment.submissions || selectedAssignment.submissions.length === 0) && (
                <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-100">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-600">No submissions yet</p>
                  <p className="text-xs text-slate-400 mt-1">Client has not uploaded any documents for this template</p>
                </div>
              )}

              {/* Current Remarks */}
              {selectedAssignment.currentRemarks && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-amber-800 mb-2">Current Remarks</h3>
                  <p className="text-sm text-amber-700">{selectedAssignment.currentRemarks}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={handleCloseDetailModal}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectChecklistList;
