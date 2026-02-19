import React from 'react';
import { X } from 'lucide-react';
import { SubmissionReview } from './SubmissionReview';

interface AssignmentDetailsModalProps {
  assignmentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AssignmentDetailsModal: React.FC<AssignmentDetailsModalProps> = ({
  assignmentId,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Assignment Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <SubmissionReview assignmentId={assignmentId} />
        </div>
      </div>
    </div>
  );
};
