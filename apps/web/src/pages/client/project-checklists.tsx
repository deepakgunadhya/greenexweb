import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchProjectAssignments,
  uploadClientSubmission,
  downloadSubmission,
  selectAssignments,
  selectAssignmentsLoading,
  selectUploading,
  selectError,
} from '../../store/slices/projectTemplateAssignmentsSlice';
import ChecklistsAPI from '../../lib/api/project-checklists';
import { Pagination } from '../../components/pagination/Pagination';
import { toast } from 'sonner';
import {
  FileText,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Paperclip,
  History,
  Calendar,
  MessageSquare,
} from 'lucide-react';

export const ClientProjectChecklistsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const dispatch = useAppDispatch();

  const assignments = useAppSelector(selectAssignments);
  const loading = useAppSelector(selectAssignmentsLoading);
  const uploading = useAppSelector(selectUploading);
  const error = useAppSelector(selectError);

  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(10);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyAssignment, setHistoryAssignment] = useState<any>(null);
  const [uploadComment, setUploadComment] = useState('');

  useEffect(() => {
    if (projectId) {
      console.log('[ClientProjectChecklists] Fetching assignments for project:', projectId);
      dispatch(fetchProjectAssignments(projectId));
    }
  }, [dispatch, projectId]);

  // Debug: Log assignments when they change
  useEffect(() => {
    console.log('[ClientProjectChecklists] Assignments updated:', assignments);
    console.log('[ClientProjectChecklists] Loading:', loading);
    console.log('[ClientProjectChecklists] Error:', error);
  }, [assignments, loading, error]);

  const paginatedAssignments = useMemo(() => {
    const start = (currentPage - 1) * currentPageSize;
    return assignments.slice(start, start + currentPageSize);
  }, [assignments, currentPage, currentPageSize]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700">
            <Clock className="w-4 h-4 mr-1.5" />
            Awaiting Upload
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
            <Clock className="w-4 h-4 mr-1.5" />
            Under Review
          </span>
        );
      case 'incomplete':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700">
            <AlertCircle className="w-4 h-4 mr-1.5" />
            Needs Resubmission
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-4 h-4 mr-1.5" />
            Approved
          </span>
        );
      default:
        return null;
    }
  };

  const handleDownloadTemplate = async (attachmentId: string) => {
    try {
      console.log('[ClientProjectChecklists] Downloading template attachment:', attachmentId);
      await ChecklistsAPI.downloadTemplateFile(attachmentId);
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('[ClientProjectChecklists] Download error:', error);
      toast.error('Failed to download template');
    }
  };

  const handleDownloadSubmission = async (submissionId: string) => {
    try {
      await dispatch(downloadSubmission(submissionId)).unwrap();
      toast.success('Submission downloaded successfully');
    } catch (error) {
      toast.error('Failed to download submission');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      validateAndAddFiles(files);
    }
  };

  const validateAndAddFiles = (filesToAdd: File[]) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg',
      'image/jpg',
    ];

    const maxSize = 10 * 1024 * 1024; // 10MB per file
    const validFiles: File[] = [];
    const errors: string[] = [];

    filesToAdd.forEach((file) => {
      // Validate file size
      if (file.size > maxSize) {
        errors.push(`${file.name}: File size exceeds 10MB`);
        return;
      }

      // Validate MIME type
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      toast.error(errors.join(', '));
    }

    if (validFiles.length > 0) {
      setUploadFiles([...uploadFiles, ...validFiles]);
      if (validFiles.length > 0) {
        toast.success(`${validFiles.length} file(s) added`);
      }
    }
  };

  const removeFile = (index: number) => {
    setUploadFiles(uploadFiles.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      validateAndAddFiles(files);
    }
  };

  const handleUploadSubmission = async () => {
    if (uploadFiles.length === 0 || !selectedAssignment) return;

    try {
      // Upload all files sequentially
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        await dispatch(uploadClientSubmission({
          assignmentId: selectedAssignment,
          file: file,
          comment: i === 0 && uploadComment.trim() ? uploadComment.trim() : undefined,
        })).unwrap();
      }

      toast.success(`${uploadFiles.length} document(s) uploaded successfully`);
      setShowUploadModal(false);
      setUploadFiles([]);
      setUploadComment('');
      setSelectedAssignment(null);

      // Refresh assignments
      if (projectId) {
        dispatch(fetchProjectAssignments(projectId));
      }
    } catch (error) {
      toast.error(error as string || 'Failed to upload document');
    }
  };

  const openUploadModal = (assignmentId: string) => {
    setSelectedAssignment(assignmentId);
    setShowUploadModal(true);
    setUploadFiles([]);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setSelectedAssignment(null);
    setUploadFiles([]);
    setUploadComment('');
  };

  const canUpload = (status: string) => {
    return status === 'assigned' || status === 'incomplete';
  };

  const openHistoryModal = (assignment: any) => {
    setHistoryAssignment(assignment);
    setShowHistoryModal(true);
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setHistoryAssignment(null);
  };

  if (loading && assignments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Project Checklists</h1>
          <p className="mt-1 text-sm text-slate-500">
            Download templates, complete them, and upload for review
          </p>
        </div>
      </div>

      {/* Assignments List */}
      {assignments.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Checklists Assigned</h3>
          <p className="text-sm text-slate-500">
            Checklist templates will appear here once they are assigned to your project.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedAssignments.map((assignment) => {
            const latestSubmission = assignment.submissions?.find(s => s.isLatest);

            return (
              <div
                key={assignment.id}
                className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {assignment.templateFile.title}
                      </h3>
                      {assignment.templateFile.description && (
                        <p className="mt-1 text-sm text-slate-600">
                          {assignment.templateFile.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="text-xs text-slate-500">
                          Category: {assignment.templateFile.category}
                        </span>
                      </div>
                    </div>
                    <div>{getStatusBadge(assignment.status)}</div>
                  </div>

                  {/* Admin Remarks (if incomplete) */}
                  {assignment.currentRemarks && assignment.status === 'incomplete' && (
                    <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-medium text-orange-800 mb-1">
                            Action Required
                          </h4>
                          <p className="text-sm text-orange-700">{assignment.currentRemarks}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Template Files */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Template Files</h4>
                    <div className="space-y-2">
                      {assignment.templateFile.attachments.map((attachment) => {
                        const isApproved = assignment.status === 'verified';
                        return (
                          <div
                            key={attachment.id}
                            className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                              isApproved ? 'bg-green-50' : 'bg-slate-50 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center flex-1 min-w-0">
                              <FileText className={`w-4 h-4 mr-2 flex-shrink-0 ${isApproved ? 'text-green-600' : 'text-slate-600'}`} />
                              <span className={`text-sm truncate ${isApproved ? 'text-green-700' : 'text-slate-700'}`} title={attachment.originalName}>
                                {attachment.originalName}
                              </span>
                            </div>
                            <button
                              onClick={() => !isApproved && handleDownloadTemplate(attachment.id)}
                              disabled={isApproved}
                              className={`p-1.5 rounded transition-colors ${
                                isApproved
                                  ? 'text-slate-400 cursor-not-allowed'
                                  : 'text-primary-600 hover:text-primary-700 hover:bg-primary-50'
                              }`}
                              title={isApproved ? 'Downloads disabled - Approved' : 'Download template'}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Latest Submission */}
                  {latestSubmission && (
                    <div className="mb-4 pt-4 border-t border-slate-200">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Your Submission</h4>
                      {(() => {
                        const isApproved = assignment.status === 'verified';
                        return (
                          <div className={`flex items-center justify-between p-3 rounded-lg ${
                            isApproved ? 'bg-green-50' : 'bg-blue-50'
                          }`}>
                            <div className="flex items-center flex-1 min-w-0">
                              <Paperclip className={`w-4 h-4 mr-2 flex-shrink-0 ${isApproved ? 'text-green-600' : 'text-blue-600'}`} />
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm truncate ${isApproved ? 'text-green-900' : 'text-blue-900'}`} title={latestSubmission.originalName}>
                                  {latestSubmission.originalName}
                                </p>
                                <p className={`text-xs mt-0.5 ${isApproved ? 'text-green-700' : 'text-blue-700'}`}>
                                  Version {latestSubmission.version} • Uploaded{' '}
                                  {new Date(latestSubmission.uploadedAt).toLocaleDateString()}
                                  {latestSubmission.submissionSource === 'admin' && latestSubmission.uploader && (
                                    <> • Submitted by {latestSubmission.uploader.firstName} {latestSubmission.uploader.lastName}</>
                                  )}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => !isApproved && handleDownloadSubmission(latestSubmission.id)}
                              disabled={isApproved}
                              className={`p-1.5 rounded transition-colors ${
                                isApproved
                                  ? 'text-slate-400 cursor-not-allowed'
                                  : 'text-blue-600 hover:text-blue-700 hover:bg-blue-100'
                              }`}
                              title={isApproved ? 'Downloads disabled - Approved' : 'Download submission'}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-3 pt-4 border-t border-slate-200">
                    {canUpload(assignment.status) ? (
                      <button
                        onClick={() => openUploadModal(assignment.id)}
                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors inline-flex items-center justify-center"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {assignment.status === 'incomplete' ? 'Resubmit Document' : 'Upload Completed Document'}
                      </button>
                    ) : assignment.status === 'submitted' ? (
                      <div className="flex-1 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-center text-sm font-medium">
                        Awaiting Admin Review
                      </div>
                    ) : assignment.status === 'verified' ? (
                      <div className="flex-1 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-center text-sm font-medium">
                        <CheckCircle className="w-4 h-4 inline-block mr-2" />
                        Approved by Admin
                      </div>
                    ) : null}

                    {/* View History Button - Always show when there are submissions or approved */}
                    {(assignment.submissions && assignment.submissions.length > 0) && (
                      <button
                        onClick={() => openHistoryModal(assignment)}
                        className={`px-4 py-2 border rounded-lg transition-colors inline-flex items-center justify-center ${
                          assignment.status === 'verified'
                            ? 'border-green-300 text-green-700 hover:bg-green-50'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                        title="View all files, history and comments"
                      >
                        <History className="w-4 h-4 mr-2" />
                        History ({assignment.submissions.length})
                      </button>
                    )}
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
        totalPages={Math.ceil(assignments.length / currentPageSize)}
        totalItems={assignments.length}
        pageSize={currentPageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setCurrentPageSize(size);
          setCurrentPage(1);
        }}
      />

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Upload Completed Document</h3>

            {/* Drag & Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-300 bg-slate-50 hover:border-slate-400'
              }`}
            >
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-sm text-slate-600 mb-2">
                Drag and drop your files here, or
              </p>
              <label className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer transition-colors">
                Browse Files
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                />
              </label>
              <p className="text-xs text-slate-500 mt-4">
                Maximum file size: 10MB per file
              </p>
            </div>

            {/* Selected Files */}
            {uploadFiles.length > 0 && (
              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-700">
                    {uploadFiles.length} file(s) selected
                  </p>
                  <button
                    onClick={() => setUploadFiles([])}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Clear All
                  </button>
                </div>
                {uploadFiles.map((file, index) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-blue-900 truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-blue-700">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Comment Input */}
            <div className="mt-4">
              <label htmlFor="upload-comment" className="block text-sm font-medium text-slate-700 mb-1">
                Add a Comment <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                id="upload-comment"
                value={uploadComment}
                onChange={(e) => setUploadComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                placeholder="Add notes for the admin about this submission..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={closeUploadModal}
                disabled={uploading}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadSubmission}
                disabled={uploading || uploadFiles.length === 0}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? 'Uploading...' : `Upload ${uploadFiles.length > 0 ? `${uploadFiles.length} Document(s)` : 'Documents'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission History Modal */}
      {showHistoryModal && historyAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Submission History & Comments
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {historyAssignment.templateFile.title}
                  </p>
                  {historyAssignment.status === 'verified' && (
                    <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                      <CheckCircle className="w-4 h-4 mr-1.5" />
                      Approved - Downloads Disabled
                    </div>
                  )}
                </div>
                <button
                  onClick={closeHistoryModal}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Template Files Section */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Template Files
                </h4>
                <div className="space-y-2">
                  {historyAssignment.templateFile.attachments.map((attachment: any) => {
                    const isApproved = historyAssignment.status === 'verified';
                    return (
                      <div
                        key={attachment.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          isApproved ? 'bg-green-50' : 'bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center flex-1 min-w-0">
                          <FileText className={`w-4 h-4 mr-2 flex-shrink-0 ${isApproved ? 'text-green-600' : 'text-slate-600'}`} />
                          <span className={`text-sm truncate ${isApproved ? 'text-green-700' : 'text-slate-700'}`} title={attachment.originalName}>
                            {attachment.originalName}
                          </span>
                        </div>
                        <button
                          onClick={() => !isApproved && handleDownloadTemplate(attachment.id)}
                          disabled={isApproved}
                          className={`p-1.5 rounded transition-colors ${
                            isApproved
                              ? 'text-slate-400 cursor-not-allowed'
                              : 'text-primary-600 hover:text-primary-700 hover:bg-primary-50'
                          }`}
                          title={isApproved ? 'Downloads disabled - Approved' : 'Download template'}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submission History Section */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                  <History className="w-4 h-4 mr-2" />
                  All Submissions ({historyAssignment.submissions?.length || 0})
                </h4>
                {historyAssignment.submissions && historyAssignment.submissions.length > 0 ? (
                  <div className="space-y-4">
                    {[...historyAssignment.submissions]
                      .sort((a: any, b: any) => b.version - a.version)
                      .map((submission: any) => {
                        const isApproved = historyAssignment.status === 'verified';
                        return (
                          <div
                            key={submission.id}
                            className={`border rounded-lg p-4 ${
                              submission.isLatest
                                ? isApproved
                                  ? 'border-green-300 bg-green-50'
                                  : 'border-primary-300 bg-primary-50'
                                : 'border-slate-200 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center flex-wrap gap-2 mb-2">
                                  <span className="text-sm font-semibold text-slate-900">
                                    Version {submission.version}
                                  </span>
                                  {submission.isLatest && (
                                    <span className={`px-2 py-0.5 text-white text-xs rounded-full ${
                                      isApproved ? 'bg-green-600' : 'bg-primary-600'
                                    }`}>
                                      Current
                                    </span>
                                  )}
                                  {submission.submissionSource === 'admin' && (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">
                                      Submitted by Admin
                                    </span>
                                  )}
                                  <span
                                    className={`px-2 py-0.5 text-xs rounded-full ${
                                      submission.status === 'submitted'
                                        ? 'bg-blue-100 text-blue-700'
                                        : submission.status === 'rejected'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-green-100 text-green-700'
                                    }`}
                                  >
                                    {submission.status === 'submitted'
                                      ? 'Under Review'
                                      : submission.status === 'rejected'
                                      ? 'Rejected'
                                      : 'Approved'}
                                  </span>
                                </div>

                                <div className="flex items-center text-sm text-slate-600 mb-2">
                                  <Calendar className="w-4 h-4 mr-1.5" />
                                  Uploaded on {new Date(submission.uploadedAt).toLocaleString()}
                                  {submission.submissionSource === 'admin' && submission.uploader && (
                                    <span className="ml-1">
                                      by {submission.uploader.firstName} {submission.uploader.lastName}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center text-sm text-slate-700">
                                  <Paperclip className="w-4 h-4 mr-1.5 flex-shrink-0" />
                                  <span className="truncate" title={submission.originalName}>
                                    {submission.originalName}
                                  </span>
                                  {submission.fileSize && (
                                    <span className="ml-2 text-slate-500">
                                      ({(parseInt(submission.fileSize) / 1024 / 1024).toFixed(2)} MB)
                                    </span>
                                  )}
                                </div>

                                {/* Client Comment */}
                                {submission.clientComment && (
                                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-xs font-medium text-blue-800 mb-1 flex items-center">
                                      <MessageSquare className="w-3.5 h-3.5 mr-1" />
                                      Your Comment:
                                    </p>
                                    <p className="text-sm text-blue-700">{submission.clientComment}</p>
                                  </div>
                                )}

                                {/* Review Remarks / Admin Feedback */}
                                {submission.reviewRemarks && (
                                  <div className={`mt-3 p-3 border rounded-lg ${
                                    submission.status === 'approved'
                                      ? 'bg-green-50 border-green-200'
                                      : 'bg-orange-50 border-orange-200'
                                  }`}>
                                    <p className={`text-xs font-medium mb-1 ${
                                      submission.status === 'approved' ? 'text-green-800' : 'text-orange-800'
                                    }`}>
                                      Admin Feedback:
                                    </p>
                                    <p className={`text-sm ${
                                      submission.status === 'approved' ? 'text-green-700' : 'text-orange-700'
                                    }`}>
                                      {submission.reviewRemarks}
                                    </p>
                                    {submission.reviewedAt && (
                                      <p className={`text-xs mt-1 ${
                                        submission.status === 'approved' ? 'text-green-600' : 'text-orange-600'
                                      }`}>
                                        Reviewed on {new Date(submission.reviewedAt).toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Show approval message even without remarks */}
                                {submission.status === 'approved' && !submission.reviewRemarks && (
                                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm text-green-700 flex items-center">
                                      <CheckCircle className="w-4 h-4 mr-1.5" />
                                      Approved by Admin
                                    </p>
                                    {submission.reviewedAt && (
                                      <p className="text-xs text-green-600 mt-1">
                                        Approved on {new Date(submission.reviewedAt).toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={() => !isApproved && handleDownloadSubmission(submission.id)}
                                disabled={isApproved}
                                className={`ml-4 p-2 rounded-lg transition-colors flex-shrink-0 ${
                                  isApproved
                                    ? 'text-slate-400 cursor-not-allowed'
                                    : 'text-primary-600 hover:text-primary-700 hover:bg-primary-50'
                                }`}
                                title={isApproved ? 'Downloads disabled - Approved' : 'Download this version'}
                              >
                                <Download className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">No submissions yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200">
              <button
                onClick={closeHistoryModal}
                className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
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

export default ClientProjectChecklistsPage;
