import React, { useState } from "react";
import {
  ChevronDown,
  Clock,
  CheckCircle,
  Archive,
  AlertTriangle,
} from "lucide-react";
import { Button } from "./button";
import { StatusBadge, StatusType } from "./status-badge";

export interface StatusTransitionProps {
  currentStatus: StatusType;
  onStatusChange: (newStatus: StatusType, reason?: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

interface StatusTransition {
  from: StatusType;
  to: StatusType;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  requiresReason?: boolean;
  confirmationMessage?: string;
}

const statusTransitions: StatusTransition[] = [
  {
    from: "DRAFT",
    to: "PUBLISHED",
    label: "Publish",
    description: "Make content live and visible to users",
    icon: CheckCircle,
    color: "bg-green-600 hover:bg-green-700 text-white",
    confirmationMessage:
      "Are you sure you want to publish this content? It will be visible to all users.",
  },
  {
    from: "PUBLISHED",
    to: "DRAFT",
    label: "Unpublish",
    description: "Move back to draft for editing",
    icon: Clock,
    color: "bg-amber-600 hover:bg-amber-700 text-white",
    requiresReason: true,
    confirmationMessage:
      "This will hide the content from users. Please provide a reason.",
  },
  {
    from: "PUBLISHED",
    to: "ARCHIVED",
    label: "Archive",
    description: "Hide content but preserve it",
    icon: Archive,
    color: "bg-slate-600 hover:bg-slate-700 text-white",
    requiresReason: true,
    confirmationMessage:
      "This will archive the content. It will no longer be visible but will be preserved.",
  },
  {
    from: "ARCHIVED",
    to: "DRAFT",
    label: "Restore to Draft",
    description: "Restore content for editing",
    icon: Clock,
    color: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  {
    from: "ARCHIVED",
    to: "PUBLISHED",
    label: "Restore & Publish",
    description: "Restore and make content live",
    icon: CheckCircle,
    color: "bg-green-600 hover:bg-green-700 text-white",
    confirmationMessage:
      "This will restore the content and make it live immediately.",
  },
  {
    from: "DRAFT",
    to: "ARCHIVED",
    label: "Archive Draft",
    description: "Archive without publishing",
    icon: Archive,
    color: "bg-slate-600 hover:bg-slate-700 text-white",
    requiresReason: true,
    confirmationMessage: "This will archive the draft content.",
  },
];

export const StatusTransition: React.FC<StatusTransitionProps> = ({
  currentStatus,
  onStatusChange,
  disabled = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [selectedTransition, setSelectedTransition] =
    useState<StatusTransition | null>(null);
  const [reason, setReason] = useState("");

  const availableTransitions = statusTransitions.filter(
    (t) => t.from === currentStatus
  );

  const handleTransitionClick = (transition: StatusTransition) => {
    if (transition.requiresReason || transition.confirmationMessage) {
      setSelectedTransition(transition);
      setShowReasonDialog(true);
    } else {
      executeTransition(transition);
    }
    setIsOpen(false);
  };

  const executeTransition = async (
    transition: StatusTransition,
    reason?: string
  ) => {
    setIsLoading(true);
    try {
      await onStatusChange(transition.to, reason);
      setShowReasonDialog(false);
      setSelectedTransition(null);
      setReason("");
    } catch (error) {
      console.error("Status transition failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedTransition) {
      executeTransition(selectedTransition, reason);
    }
  };

  if (availableTransitions.length === 0) {
    return (
      <div className={className}>
        <StatusBadge status={currentStatus} />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Current Status + Dropdown */}
      <div className="flex items-center space-x-2">
        <StatusBadge status={currentStatus} />

        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled || isLoading}
            className="p-1.5"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </Button>

          {/* Transition Options Dropdown */}
          {isOpen && (
            <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
              <div className="p-2 border-b border-slate-100">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Change Status
                </p>
              </div>
              <div className="py-1">
                {availableTransitions.map((transition, index) => {
                  const Icon = transition.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => handleTransitionClick(transition)}
                      disabled={isLoading}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-start space-x-3">
                        <Icon className="w-4 h-4 mt-0.5 text-slate-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {transition.label}
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {transition.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reason/Confirmation Dialog */}
      {showReasonDialog && selectedTransition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowReasonDialog(false)}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {selectedTransition.label}
                  </h3>
                  <p className="text-sm text-slate-600">
                    Current status:{" "}
                    <StatusBadge status={currentStatus} size="sm" />
                  </p>
                </div>
              </div>

              {selectedTransition.confirmationMessage && (
                <p className="text-sm text-slate-600 mb-4">
                  {selectedTransition.confirmationMessage}
                </p>
              )}

              {selectedTransition.requiresReason && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Reason for status change:
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Please provide a reason for this status change..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowReasonDialog(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={
                    isLoading ||
                    (selectedTransition.requiresReason && !reason.trim())
                  }
                  className={selectedTransition.color}
                >
                  {isLoading ? "Processing..." : selectedTransition.label}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
};
