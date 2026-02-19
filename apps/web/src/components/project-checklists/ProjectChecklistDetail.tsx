import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchProjectChecklist,
  updateChecklistItem,
  verifyChecklist,
  updateChecklistStatus,
  uploadItemFile,
  fetchChecklistCompleteness,
  submitFileForReview,
  markFileUnderReview,
  sendFileBackWithRemarks,
  verifyFile,
  closeChecklistAndLockFiles,
  fetchFileVersionHistory,
  submitChecklistForReview,
  selectSelectedChecklist,
  selectChecklistsLoading,
  selectChecklistsUpdating,
  selectChecklistsVerifying,
  selectChecklistsUploading,
  selectChecklistsError,
  selectCompletenessData,
} from '../../store/slices/projectChecklistsSlice';
import { ChecklistStatus, UpdateChecklistItemDto, VerifyChecklistDto } from '../../lib/api/project-checklists';
import ProjectChecklistsAPI from '../../lib/api/project-checklists';
import { PermissionGate } from '../common/PermissionGate';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  FileText,
  MessageSquare,
  User,
  Download,
  Send,
  Eye,
  XCircle,
  Lock,
  History
} from 'lucide-react';

const statusColors: Record<ChecklistStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  ready_for_verification: 'bg-purple-100 text-purple-700',
  verified_passed: 'bg-green-100 text-green-700',
  verified_failed: 'bg-red-100 text-red-700',
  finalized: 'bg-emerald-100 text-emerald-700',
  superseded: 'bg-gray-100 text-gray-500',
};

const fileStatusColors: Record<string, string> = {
  uploaded: 'bg-slate-100 text-slate-700',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-purple-100 text-purple-700',
  responded: 'bg-orange-100 text-orange-700',
  resubmitted: 'bg-cyan-100 text-cyan-700',
  verified: 'bg-green-100 text-green-700',
  closed: 'bg-emerald-100 text-emerald-700',
};

export const ProjectChecklistDetail: React.FC = () => {
  const { projectId, checklistId } = useParams<{ projectId: string; checklistId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const checklist = useAppSelector(selectSelectedChecklist);
  const loading = useAppSelector(selectChecklistsLoading);
  const updating = useAppSelector(selectChecklistsUpdating);
  const verifying = useAppSelector(selectChecklistsVerifying);
  const uploading = useAppSelector(selectChecklistsUploading);
  const error = useAppSelector(selectChecklistsError);
  const completenessData = useAppSelector(selectCompletenessData);

  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [itemValues, setItemValues] = useState<Record<string, any>>({});
  const [verificationMode, setVerificationMode] = useState(false);
  const [itemVerifications, setItemVerifications] = useState<Record<string, { status: 'accepted' | 'needs_clarification'; comment?: string }>>({});
  const [verificationComments, setVerificationComments] = useState('');

  // File status workflow state
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionHistory, setVersionHistory] = useState<any[]>([]);

  useEffect(() => {
    if (projectId && checklistId) {
      dispatch(fetchProjectChecklist({ projectId, checklistId }));
      dispatch(fetchChecklistCompleteness({ projectId, checklistId }));
    }
  }, [dispatch, projectId, checklistId]);

  useEffect(() => {
    if (checklist?.items) {
      const values: Record<string, any> = {};
      checklist.items.forEach(item => {
        values[item.id] = {
          valueText: item.valueText || '',
          valueNumber: item.valueNumber || '',
          valueDate: item.valueDate ? item.valueDate.split('T')[0] : '',
          valueBoolean: item.valueBoolean || false,
        };
      });
      setItemValues(values);
    }
  }, [checklist]);

  const handleItemUpdate = async (itemId: string) => {
    if (!projectId || !checklistId) return;

    const updateData: UpdateChecklistItemDto = {};
    const values = itemValues[itemId];
    const item = checklist?.items?.find(i => i.id === itemId);

    if (!item) return;

    switch (item.templateItem.type) {
      case 'text':
      case 'textarea':
      case 'dropdown':
        updateData.valueText = values.valueText;
        break;
      case 'number':
        updateData.valueNumber = values.valueNumber ? Number(values.valueNumber) : undefined;
        break;
      case 'date':
        updateData.valueDate = values.valueDate;
        break;
    }

    try {
      await dispatch(updateChecklistItem({
        projectId,
        checklistId,
        itemId,
        itemData: updateData
      })).unwrap();
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  };

  const handleFileUpload = async (itemId: string, file: File) => {
    if (!projectId || !checklistId) return;

    try {
      await dispatch(uploadItemFile({
        projectId,
        checklistId,
        itemId,
        file
      })).unwrap();
    } catch (error) {
      console.error('Failed to upload file:', error);
    }
  };

  const handleStatusUpdate = async (newStatus: ChecklistStatus) => {
    if (!projectId || !checklistId) return;

    try {
      await dispatch(updateChecklistStatus({
        projectId,
        checklistId,
        status: newStatus
      })).unwrap();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleVerification = async () => {
    if (!projectId || !checklistId || !checklist) return;

    const verificationData: VerifyChecklistDto = {
      verificationComments,
      itemVerifications: Object.entries(itemVerifications).map(([itemId, verification]) => ({
        itemId,
        verifiedStatus: verification.status,
        verifierComment: verification.comment,
      })),
    };

    try {
      await dispatch(verifyChecklist({
        projectId,
        checklistId,
        verificationData
      })).unwrap();
      setVerificationMode(false);
    } catch (error) {
      console.error('Failed to verify checklist:', error);
    }
  };

  // File Status Workflow Handlers
  const handleSubmitFile = async (fileId: string) => {
    if (!projectId) return;
    try {
      await dispatch(submitFileForReview({ projectId, fileId })).unwrap();
      toast.success('File submitted for review');
      // Refetch checklist to show updated status
      dispatch(fetchProjectChecklist({ projectId, checklistId: checklistId! }));
    } catch (error: any) {
      toast.error(error || 'Failed to submit file');
    }
  };

  const handleMarkUnderReview = async (fileId: string) => {
    if (!projectId) return;
    try {
      await dispatch(markFileUnderReview({ projectId, fileId })).unwrap();
      toast.success('File marked as under review');
      dispatch(fetchProjectChecklist({ projectId, checklistId: checklistId! }));
    } catch (error: any) {
      toast.error(error || 'Failed to mark file under review');
    }
  };

  const handleSendBack = async () => {
    if (!projectId || !selectedFileId || !remarks.trim()) {
      toast.error('Please enter remarks');
      return;
    }
    try {
      await dispatch(sendFileBackWithRemarks({ projectId, fileId: selectedFileId, remarks })).unwrap();
      toast.success('File sent back with remarks');
      setShowRemarksModal(false);
      setRemarks('');
      setSelectedFileId(null);
      dispatch(fetchProjectChecklist({ projectId, checklistId: checklistId! }));
    } catch (error: any) {
      toast.error(error || 'Failed to send file back');
    }
  };

  const handleVerifyFile = async (fileId: string) => {
    if (!projectId) return;
    try {
      await dispatch(verifyFile({ projectId, fileId })).unwrap();
      toast.success('File verified successfully');
      dispatch(fetchProjectChecklist({ projectId, checklistId: checklistId! }));
    } catch (error: any) {
      toast.error(error || 'Failed to verify file');
    }
  };

  const handleCloseChecklist = async () => {
    if (!projectId || !checklistId) return;
    if (!window.confirm('Are you sure you want to close this checklist? This will lock all files permanently.')) {
      return;
    }
    try {
      await dispatch(closeChecklistAndLockFiles({ projectId, checklistId })).unwrap();
      toast.success('Checklist closed and all files locked');
      dispatch(fetchProjectChecklist({ projectId, checklistId }));
    } catch (error: any) {
      toast.error(error || 'Failed to close checklist');
    }
  };

  const handleViewVersionHistory = async (fileId: string) => {
    if (!projectId) return;
    try {
      const result = await dispatch(fetchFileVersionHistory({ projectId, fileId })).unwrap();
      setVersionHistory(Array.isArray(result) ? result : (result as any).versions || []);
      setShowVersionHistory(true);
    } catch (error: any) {
      toast.error(error || 'Failed to fetch version history');
    }
  };

  const handleSubmitChecklistForReview = async () => {
    if (!projectId || !checklistId) return;
    try {
      await dispatch(submitChecklistForReview({ projectId, checklistId })).unwrap();
      toast.success('Checklist submitted for review');
      dispatch(fetchProjectChecklist({ projectId, checklistId }));
    } catch (error: any) {
      toast.error(error || 'Failed to submit checklist');
    }
  };

  const renderItemInput = (item: any) => {
    const value = itemValues[item.id] || {};
    const isEditing = editingItem === item.id;

    if (!isEditing) {
      // Display mode
      const displayValue = (() => {
        switch (item.templateItem.type) {
          case 'text':
          case 'textarea':
          case 'dropdown':
            return item.valueText || <span className="text-slate-400 italic">Not filled</span>;
          case 'number':
            return item.valueNumber || <span className="text-slate-400 italic">Not filled</span>;
          case 'date':
            return item.valueDate ? new Date(item.valueDate).toLocaleDateString() : <span className="text-slate-400 italic">Not filled</span>;
          case 'boolean':
            return item.valueBoolean ? 'Yes' : 'No';
          case 'file':
          case 'multi_file':
            return item.files?.length > 0 ? (
              <div className="space-y-3">
                {item.files.map((file: any) => (
                  <div key={file.id} className="border border-slate-200 rounded-lg p-3 bg-white">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center flex-1 min-w-0">
                        <FileText className="w-4 h-4 mr-2 flex-shrink-0 text-slate-600" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block" title={file.originalName}>
                            {file.originalName}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${fileStatusColors[file.status] || 'bg-slate-100 text-slate-700'}`}>
                              {file.status?.replace('_', ' ').toUpperCase() || 'UPLOADED'}
                            </span>
                            {file.isLocked && (
                              <span className="inline-flex items-center text-xs text-slate-500">
                                <Lock className="w-3 h-3 mr-1" />
                                Locked
                              </span>
                            )}
                            <span className="text-xs text-slate-500">v{file.version}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (projectId && checklistId && item.id && file.id) {
                            try {
                              await ProjectChecklistsAPI.downloadItemFile(projectId, checklistId, item.id, file.id);
                              toast.success('File downloaded successfully');
                            } catch (error: any) {
                              console.error('Failed to download file:', error);
                              toast.error(error?.message || 'Failed to download file');
                            }
                          }
                        }}
                        className="p-1.5 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>

                    {/* File metadata */}
                    <div className="text-xs text-slate-500 space-y-1 mb-2">
                      {file.uploadedAt && (
                        <div>Uploaded: {new Date(file.uploadedAt).toLocaleString()}</div>
                      )}
                      {file.submittedAt && (
                        <div>Submitted: {new Date(file.submittedAt).toLocaleString()}</div>
                      )}
                      {file.reviewedAt && (
                        <div>Reviewed: {new Date(file.reviewedAt).toLocaleString()}</div>
                      )}
                      {file.verifiedAt && (
                        <div>Verified: {new Date(file.verifiedAt).toLocaleString()}</div>
                      )}
                    </div>

                    {/* Review remarks if file was sent back */}
                    {file.reviewRemarks && (
                      <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                        <div className="font-medium text-orange-800 mb-1">Review Remarks:</div>
                        <div className="text-orange-700">{file.reviewRemarks}</div>
                      </div>
                    )}

                    {/* Action buttons */}
                    {!file.isLocked && (
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
                        {/* Client actions */}
                        <PermissionGate requiredPermissions={["checklists:submit"]}>
                          {(file.status === 'uploaded' || file.status === 'responded') && (
                            <button
                              onClick={() => handleSubmitFile(file.id)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                            >
                              <Send className="w-3 h-3 mr-1" />
                              {file.status === 'responded' ? 'Resubmit' : 'Submit for Review'}
                            </button>
                          )}
                        </PermissionGate>

                        {/* Admin actions */}
                        <PermissionGate requiredPermissions={["checklists:review"]}>
                          {file.status === 'submitted' || file.status === 'resubmitted' ? (
                            <>
                              <button
                                onClick={() => handleMarkUnderReview(file.id)}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded transition-colors"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Mark Under Review
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedFileId(file.id);
                                  setShowRemarksModal(true);
                                }}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded transition-colors"
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Send Back
                              </button>
                            </>
                          ) : null}
                        </PermissionGate>

                        <PermissionGate requiredPermissions={["checklists:verify"]}>
                          {file.status === 'under_review' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedFileId(file.id);
                                  setShowRemarksModal(true);
                                }}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded transition-colors"
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Send Back
                              </button>
                              <button
                                onClick={() => handleVerifyFile(file.id)}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded transition-colors"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verify
                              </button>
                            </>
                          )}
                        </PermissionGate>

                        {/* Version history button */}
                        <button
                          onClick={() => handleViewVersionHistory(file.id)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded transition-colors ml-auto"
                        >
                          <History className="w-3 h-3 mr-1" />
                          History
                        </button>
                      </div>
                    )}

                    {file.isLocked && (
                      <div className="mt-2 text-xs text-slate-500 italic flex items-center">
                        <Lock className="w-3 h-3 mr-1" />
                        This file is locked and cannot be modified
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : <span className="text-slate-400 italic">No files uploaded</span>;
          default:
            return <span className="text-slate-400 italic">Not filled</span>;
        }
      })();

      return (
        <div className="flex items-center justify-between">
          <div>{displayValue}</div>
          <PermissionGate requiredPermissions={["checklists:update"]}>
            {checklist?.status !== 'finalized' && checklist?.status !== 'superseded' && (
              <button
                onClick={() => setEditingItem(item.id)}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Edit
              </button>
            )}
          </PermissionGate>
        </div>
      );
    }

    // Edit mode
    switch (item.templateItem.type) {
      case 'text':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={value.valueText}
              onChange={(e) => setItemValues(prev => ({
                ...prev,
                [item.id]: { ...prev[item.id], valueText: e.target.value }
              }))}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter text..."
            />
            <button
              onClick={() => handleItemUpdate(item.id)}
              disabled={updating}
              className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setEditingItem(null)}
              className="px-3 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400"
            >
              Cancel
            </button>
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            <textarea
              value={value.valueText}
              onChange={(e) => setItemValues(prev => ({
                ...prev,
                [item.id]: { ...prev[item.id], valueText: e.target.value }
              }))}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter text..."
            />
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleItemUpdate(item.id)}
                disabled={updating}
                className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setEditingItem(null)}
                className="px-3 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400"
              >
                Cancel
              </button>
            </div>
          </div>
        );

      case 'number':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={value.valueNumber}
              onChange={(e) => setItemValues(prev => ({
                ...prev,
                [item.id]: { ...prev[item.id], valueNumber: e.target.value }
              }))}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter number..."
            />
            <button
              onClick={() => handleItemUpdate(item.id)}
              disabled={updating}
              className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setEditingItem(null)}
              className="px-3 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400"
            >
              Cancel
            </button>
          </div>
        );

      case 'date':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={value.valueDate}
              onChange={(e) => setItemValues(prev => ({
                ...prev,
                [item.id]: { ...prev[item.id], valueDate: e.target.value }
              }))}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              onClick={() => handleItemUpdate(item.id)}
              disabled={updating}
              className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setEditingItem(null)}
              className="px-3 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400"
            >
              Cancel
            </button>
          </div>
        );

      case 'dropdown':
        const options = item.templateItem.dropdownOptions || {};
        return (
          <div className="flex items-center space-x-2">
            <select
              value={value.valueText}
              onChange={(e) => setItemValues(prev => ({
                ...prev,
                [item.id]: { ...prev[item.id], valueText: e.target.value }
              }))}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select an option...</option>
              {Object.entries(options).map(([key, label]) => (
                <option key={key} value={key}>
                  {label as string}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleItemUpdate(item.id)}
              disabled={updating}
              className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setEditingItem(null)}
              className="px-3 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400"
            >
              Cancel
            </button>
          </div>
        );

      case 'file':
      case 'multi_file':
        return (
          <div className="space-y-2">
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileUpload(item.id, file);
                }
              }}
              disabled={uploading}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              onClick={() => setEditingItem(null)}
              className="px-3 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400"
            >
              Done
            </button>
          </div>
        );

      default:
        return <span className="text-slate-400 italic">Unsupported field type</span>;
    }
  };

  if (loading || !checklist) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const completeness = completenessData[checklist.id];
  const canSubmitForVerification = checklist.status === 'in_progress' && Number(checklist.completenessPercent) >= 100;
  const canVerify = checklist.status === 'ready_for_verification';
  const canFinalize = checklist.status === 'verified_passed';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/projects/${projectId}/checklists`)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{checklist.template.name}</h1>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-sm text-slate-600">{checklist.template.category}</span>
              <span className="text-sm text-slate-600">Version {checklist.version}</span>
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[checklist.status]}`}>
                {checklist.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* File Status Workflow Actions */}
          <PermissionGate requiredPermissions={["checklists:submit"]}>
            <button
              onClick={handleSubmitChecklistForReview}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit All Files
            </button>
          </PermissionGate>

          <PermissionGate requiredPermissions={["checklists:verify"]}>
            <button
              onClick={handleCloseChecklist}
              className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Lock className="w-4 h-4 mr-2" />
              Close Checklist
            </button>
          </PermissionGate>

          {/* Status Actions */}
          <PermissionGate requiredPermissions={["checklists:update"]}>
            {canSubmitForVerification && (
              <button
                onClick={() => handleStatusUpdate('ready_for_verification')}
                disabled={updating}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Submit for Verification
              </button>
            )}
          </PermissionGate>

          <PermissionGate requiredPermissions={["checklists:verify"]}>
            {canVerify && !verificationMode && (
              <button
                onClick={() => setVerificationMode(true)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Verify Checklist
              </button>
            )}

            {canFinalize && (
              <button
                onClick={() => handleStatusUpdate('finalized')}
                disabled={updating}
                className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Finalize
              </button>
            )}
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

      {/* Progress Overview */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <div className="text-2xl font-bold text-slate-900">{checklist.completenessPercent}%</div>
            <div className="text-sm text-slate-600">Completed</div>
          </div>
          {completeness && (
            <>
              <div>
                <div className="text-2xl font-bold text-slate-900">{completeness.totalItems}</div>
                <div className="text-sm text-slate-600">Total Items</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{completeness.mandatoryItems}</div>
                <div className="text-sm text-slate-600">Mandatory</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{completeness.filledMandatory}</div>
                <div className="text-sm text-slate-600">Filled Mandatory</div>
              </div>
            </>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-primary-500 transition-all duration-300"
              style={{ width: `${checklist.completenessPercent}%` }}
            />
          </div>
        </div>

        {/* Missing Items */}
        {completeness?.missingMandatoryItems && completeness.missingMandatoryItems.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-800 mb-2">Missing mandatory items:</p>
            <ul className="text-sm text-amber-700 space-y-1">
              {completeness.missingMandatoryItems.map((item, index) => (
                <li key={index} className="flex items-start">
                  <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Verification Mode */}
      {verificationMode && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4">Checklist Verification</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Overall Comments
              </label>
              <textarea
                value={verificationComments}
                onChange={(e) => setVerificationComments(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter verification comments..."
              />
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleVerification}
                disabled={verifying}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {verifying ? 'Verifying...' : 'Complete Verification'}
              </button>
              <button
                onClick={() => setVerificationMode(false)}
                className="px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checklist Items */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Checklist Items</h2>
        </div>

        <div className="divide-y divide-slate-200">
          {checklist.items?.map((item, index) => (
            <div key={item.id} className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-sm font-medium text-slate-500">#{index + 1}</span>
                    <h3 className="font-medium text-slate-900">{item.templateItem.label}</h3>
                    {item.templateItem.isMandatory && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Required
                      </span>
                    )}
                  </div>
                  
                  {item.templateItem.helpText && (
                    <p className="text-sm text-slate-600 mb-3">{item.templateItem.helpText}</p>
                  )}

                  <div className="space-y-3">
                    {renderItemInput(item)}

                    {/* Verification Status in Verification Mode */}
                    {verificationMode && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-3 mb-2">
                          <label className="text-sm font-medium text-slate-700">Verification:</label>
                          <select
                            value={itemVerifications[item.id]?.status || ''}
                            onChange={(e) => setItemVerifications(prev => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                status: e.target.value as 'accepted' | 'needs_clarification'
                              }
                            }))}
                            className="px-2 py-1 border border-slate-300 rounded text-sm"
                          >
                            <option value="">Select...</option>
                            <option value="accepted">Accepted</option>
                            <option value="needs_clarification">Needs Clarification</option>
                          </select>
                        </div>
                        
                        {itemVerifications[item.id]?.status === 'needs_clarification' && (
                          <textarea
                            value={itemVerifications[item.id]?.comment || ''}
                            onChange={(e) => setItemVerifications(prev => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                comment: e.target.value
                              }
                            }))}
                            rows={2}
                            className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                            placeholder="Explain what needs clarification..."
                          />
                        )}
                      </div>
                    )}

                    {/* Item metadata */}
                    <div className="flex items-center space-x-4 text-xs text-slate-500">
                      {item.filledBy && item.filledAt && (
                        <div className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          Filled {new Date(item.filledAt).toLocaleDateString()}
                        </div>
                      )}
                      {item.verifierComment && (
                        <div className="flex items-center">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Verified
                        </div>
                      )}
                    </div>

                    {item.verifierComment && (
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                        <strong>Verifier comment:</strong> {item.verifierComment}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )) || (
            <div className="p-6 text-center text-slate-500">
              <FileText className="w-8 h-8 mx-auto mb-2" />
              <p>No items found in this checklist.</p>
            </div>
          )}
        </div>
      </div>

      {/* Verification History */}
      {checklist.verifiedBy && checklist.verifiedAt && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Verification History</h3>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Verified on {new Date(checklist.verifiedAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-slate-600">
                  Verified by {checklist.verifiedBy}
                </p>
              </div>
            </div>
            
            {checklist.verificationComments && (
              <div className="ml-8 p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-700">{checklist.verificationComments}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Remarks Modal */}
      {showRemarksModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Send File Back with Remarks</h3>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter your remarks for the client..."
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowRemarksModal(false);
                  setRemarks('');
                  setSelectedFileId(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendBack}
                disabled={!remarks.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">File Version History</h3>
            <div className="space-y-3">
              {versionHistory.length > 0 ? (
                versionHistory.map((version: any, index: number) => (
                  <div key={version.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">Version {version.version}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${fileStatusColors[version.status] || 'bg-slate-100 text-slate-700'}`}>
                          {version.status?.replace('_', ' ').toUpperCase()}
                        </span>
                        {index === 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-700">
                            Current
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(version.uploadedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600">
                      <div>{version.originalName}</div>
                      {version.submittedAt && (
                        <div className="text-xs text-slate-500 mt-1">
                          Submitted: {new Date(version.submittedAt).toLocaleString()}
                        </div>
                      )}
                      {version.reviewRemarks && (
                        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                          <div className="font-medium text-orange-800">Remarks:</div>
                          <div className="text-orange-700">{version.reviewRemarks}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-500 py-4">
                  <History className="w-8 h-8 mx-auto mb-2" />
                  <p>No version history available</p>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setShowVersionHistory(false);
                  setVersionHistory([]);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
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

export default ProjectChecklistDetail;