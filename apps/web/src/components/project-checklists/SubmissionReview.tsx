import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  reviewSubmission,
  fetchSubmissionHistory,
  downloadSubmission,
  selectSelectedAssignment,
  selectSubmissionHistory,
  selectReviewing,
  selectLoadingHistory,
  selectError,
} from '../../store/slices/projectTemplateAssignmentsSlice';
import { PermissionGate } from '../common/PermissionGate';
import { toast } from 'sonner';
import { Download, FileText, CheckCircle, XCircle, AlertCircle, Clock, User, Calendar } from 'lucide-react';

interface SubmissionReviewProps {
  assignmentId: string;
  onClose?: () => void;
}

export const SubmissionReview: React.FC<SubmissionReviewProps> = ({ assignmentId, onClose }) => {
  const dispatch = useAppDispatch();
  const assignment = useAppSelector(selectSelectedAssignment);
  const submissionHistory = useAppSelector(selectSubmissionHistory);
  const reviewing = useAppSelector(selectReviewing);
  const loadingHistory = useAppSelector(selectLoadingHistory);
  useAppSelector(selectError);

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [approveRemarks, setApproveRemarks] = useState('');

  useEffect(() => {
    if (assignmentId) {
      dispatch(fetchSubmissionHistory(assignmentId));
    }
  }, [dispatch, assignmentId]);

  const latestSubmission = submissionHistory.find(s => s.isLatest);

  const handleDownloadTemplate = async (attachmentId: string) => {
    try {
      // Download template attachment
      const response = await fetch(
        `/api/v1/template-files/attachments/${attachmentId}/download`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('greenex_token')}`,
          },
        }
      );

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template-file';
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download template');
    }
  };

  const handleDownloadSubmission = async (submissionId: string) => {
    try {
      await dispatch(downloadSubmission(submissionId)).unwrap();
      toast.success('Submission downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download submission');
    }
  };

  const handleReject = async () => {
    if (!latestSubmission || !rejectRemarks.trim()) {
      toast.error('Please provide rejection remarks');
      return;
    }

    try {
      await dispatch(reviewSubmission({
        submissionId: latestSubmission.id,
        action: 'reject',
        remarks: rejectRemarks,
      })).unwrap();

      toast.success('Submission rejected successfully');
      setShowRejectDialog(false);
      setRejectRemarks('');

      // Refresh history
      dispatch(fetchSubmissionHistory(assignmentId));
    } catch (error) {
      console.error('Reject error:', error);
      toast.error(error as string || 'Failed to reject submission');
    }
  };

  const handleApprove = async () => {
    if (!latestSubmission) return;

    try {
      await dispatch(reviewSubmission({
        submissionId: latestSubmission.id,
        action: 'approve',
        remarks: approveRemarks || undefined,
      })).unwrap();

      toast.success('Submission approved successfully');
      setShowApproveDialog(false);
      setApproveRemarks('');

      // Refresh history
      dispatch(fetchSubmissionHistory(assignmentId));
    } catch (error) {
      console.error('Approve error:', error);
      toast.error(error as string || 'Failed to approve submission');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      default:
        return null;
    }
  };

  const getAssignmentStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">Awaiting Upload</span>;
      case 'submitted':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Pending Review</span>;
      case 'incomplete':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Needs Resubmission</span>;
      case 'verified':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Verified</span>;
      default:
        return null;
    }
  };

  if (!assignment) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{assignment.templateFile.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{assignment.templateFile.description}</p>
          <div className="mt-2 flex items-center space-x-2">
            <span className="text-xs text-slate-500">Status:</span>
            {getAssignmentStatusBadge(assignment.status)}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-500"
          >
            <XCircle className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Current Remarks */}
      {assignment.currentRemarks && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-orange-800">Client Action Required</h3>
              <p className="mt-1 text-sm text-orange-700">{assignment.currentRemarks}</p>
            </div>
          </div>
        </div>
      )}

      {/* Template Files */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-medium text-slate-900 mb-4">Template Files</h3>
        <div className="space-y-3">
          {assignment.templateFile.attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center flex-1 min-w-0">
                <FileText className="w-5 h-5 text-slate-600 mr-3 flex-shrink-0" />
                <span className="text-sm font-medium text-slate-700 truncate" title={attachment.originalName}>
                  {attachment.originalName}
                </span>
              </div>
              <button
                onClick={() => handleDownloadTemplate(attachment.id)}
                className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                title="Download template"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Latest Submission */}
      {latestSubmission && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-900">Latest Submission</h3>
            {getStatusBadge(latestSubmission.status)}
          </div>

          <div className="space-y-4">
            {/* File Info */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center flex-1 min-w-0">
                <FileText className="w-5 h-5 text-slate-600 mr-3 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-700 truncate" title={latestSubmission.originalName}>
                    {latestSubmission.originalName}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Version {latestSubmission.version} • {(Number(latestSubmission.fileSize) / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDownloadSubmission(latestSubmission.id)}
                className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                title="Download submission"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            {/* Upload Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="flex items-center text-slate-500 mb-1">
                  <User className="w-4 h-4 mr-1" />
                  Uploaded By
                </div>
                <p className="text-slate-900 font-medium">
                  {latestSubmission.uploader.firstName} {latestSubmission.uploader.lastName}
                </p>
              </div>
              <div>
                <div className="flex items-center text-slate-500 mb-1">
                  <Calendar className="w-4 h-4 mr-1" />
                  Upload Date
                </div>
                <p className="text-slate-900 font-medium">
                  {new Date(latestSubmission.uploadedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {/* Review Info */}
            {latestSubmission.reviewedAt && latestSubmission.reviewer && (
              <div className="pt-4 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex items-center text-slate-500 mb-1">
                      <User className="w-4 h-4 mr-1" />
                      Reviewed By
                    </div>
                    <p className="text-slate-900 font-medium">
                      {latestSubmission.reviewer.firstName} {latestSubmission.reviewer.lastName}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center text-slate-500 mb-1">
                      <Calendar className="w-4 h-4 mr-1" />
                      Review Date
                    </div>
                    <p className="text-slate-900 font-medium">
                      {new Date(latestSubmission.reviewedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                {latestSubmission.reviewRemarks && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500 mb-1">Remarks:</p>
                    <p className="text-sm text-slate-700">{latestSubmission.reviewRemarks}</p>
                  </div>
                )}
              </div>
            )}

            {/* Review Actions */}
            {latestSubmission.status === 'submitted' && (
              <PermissionGate requiredPermissions={['checklists:review']}>
                <div className="flex items-center space-x-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => setShowRejectDialog(true)}
                    disabled={reviewing}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <XCircle className="w-4 h-4 inline-block mr-2" />
                    Reject
                  </button>
                  <button
                    onClick={() => setShowApproveDialog(true)}
                    disabled={reviewing}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <CheckCircle className="w-4 h-4 inline-block mr-2" />
                    Approve
                  </button>
                </div>
              </PermissionGate>
            )}
          </div>
        </div>
      )}

      {/* Submission History */}
      {submissionHistory.length > 1 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-medium text-slate-900 mb-4">Submission History</h3>
          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {submissionHistory.map((submission) => (
                <div
                  key={submission.id}
                  className={`p-4 rounded-lg border ${
                    submission.isLatest
                      ? 'bg-primary-50 border-primary-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-slate-900">
                          Version {submission.version}
                        </span>
                        {getStatusBadge(submission.status)}
                        {submission.isLatest && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary-600 text-white">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">{submission.originalName}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Uploaded {new Date(submission.uploadedAt).toLocaleDateString()} by{' '}
                        {submission.uploader.firstName} {submission.uploader.lastName}
                      </p>
                      {submission.reviewRemarks && (
                        <p className="text-xs text-slate-600 mt-2 italic">"{submission.reviewRemarks}"</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDownloadSubmission(submission.id)}
                      className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Reject Submission</h3>
            <p className="text-sm text-slate-600 mb-4">
              Please provide detailed remarks explaining why this submission is being rejected.
            </p>
            <textarea
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
              placeholder="Enter rejection remarks..."
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectRemarks('');
                }}
                disabled={reviewing}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={reviewing || !rejectRemarks.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reviewing ? 'Rejecting...' : 'Reject Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Dialog */}
      {showApproveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Approve Submission</h3>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to approve this submission? This will mark the checklist as verified.
            </p>
            <textarea
              value={approveRemarks}
              onChange={(e) => setApproveRemarks(e.target.value)}
              placeholder="Optional remarks..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowApproveDialog(false);
                  setApproveRemarks('');
                }}
                disabled={reviewing}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={reviewing}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reviewing ? 'Approving...' : 'Approve Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
