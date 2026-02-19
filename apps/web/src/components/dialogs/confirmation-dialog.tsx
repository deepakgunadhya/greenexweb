import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';

/**
 * Confirmation Dialog Types
 */
export type ConfirmationType = 'danger' | 'warning' | 'info' | 'success';

/**
 * Confirmation Dialog Props
 */
export interface ConfirmationDialogProps {
  /**
   * Dialog open/close state
   */
  open: boolean;

  /**
   * Callback when dialog should close
   */
  onOpenChange: (open: boolean) => void;

  /**
   * Dialog title
   */
  title: string;

  /**
   * Dialog description/message
   */
  description: string;

  /**
   * Type of confirmation dialog - determines styling and icon
   * @default 'info'
   */
  type?: ConfirmationType;

  /**
   * Primary action button text
   * @default 'Confirm'
   */
  actionLabel?: string;

  /**
   * Cancel button text
   * @default 'Cancel'
   */
  cancelLabel?: string;

  /**
   * Callback when user confirms the action
   */
  onConfirm: () => void | Promise<void>;

  /**
   * Callback when user cancels the action
   */
  onCancel?: () => void;

  /**
   * Show loading state on action button
   */
  isLoading?: boolean;

  /**
   * Disable action button
   */
  isDisabled?: boolean;

  /**
   * Additional CSS class names
   */
  className?: string;
}

/**
 * Get configuration based on confirmation type
 */
function getTypeConfig(type: ConfirmationType) {
  const configs = {
    danger: {
      icon: Trash2,
      color: 'text-red-600',
      backgroundColor: 'bg-red-50',
      borderColor: 'border-red-200',
      buttonColor: 'bg-red-600 hover:bg-red-700 active:bg-red-800',
      buttonFocusRing: 'focus:ring-red-500',
    },
    warning: {
      icon: AlertCircle,
      color: 'text-amber-600',
      backgroundColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      buttonColor: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800',
      buttonFocusRing: 'focus:ring-amber-500',
    },
    info: {
      icon: AlertCircle,
      color: 'text-blue-600',
      backgroundColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      buttonColor: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
      buttonFocusRing: 'focus:ring-blue-500',
    },
    success: {
      icon: CheckCircle2,
      color: 'text-green-600',
      backgroundColor: 'bg-green-50',
      borderColor: 'border-green-200',
      buttonColor: 'bg-green-600 hover:bg-green-700 active:bg-green-800',
      buttonFocusRing: 'focus:ring-green-500',
    },
  };

  return configs[type];
}

/**
 * Confirmation Dialog Component
 *
 * A reusable, accessible confirmation dialog for common user actions.
 * Uses Radix UI Dialog for accessibility and Tailwind CSS for styling.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * return (
 *   <>
 *     <button onClick={() => setOpen(true)}>Delete</button>
 *
 *     <ConfirmationDialog
 *       open={open}
 *       onOpenChange={setOpen}
 *       type="danger"
 *       title="Delete Item?"
 *       description="This action cannot be undone."
 *       actionLabel="Delete"
 *       onConfirm={async () => {
 *         await deleteItem();
 *       }}
 *     />
 *   </>
 * );
 * ```
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  type = 'info',
  actionLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
  isDisabled = false,
  className,
}: ConfirmationDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const typeConfig = getTypeConfig(type);
  const Icon = typeConfig.icon;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 data-[state=open]:animate-fade-in" />

        {/* Content */}
        <Dialog.Content
          className={`
            fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2
            rounded-lg border border-slate-200 bg-white p-6 shadow-lg
            data-[state=open]:animate-fade-in
            ${className}
          `}
        >
          {/* Close Button */}
          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full
                         text-slate-400 hover:bg-slate-100 hover:text-slate-600
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                         transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>

          {/* Header with Icon */}
          <div className="mb-4 flex items-start gap-4">
            <div
              className={`
                flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full
                ${typeConfig.backgroundColor}
              `}
            >
              <Icon className={`h-6 w-6 ${typeConfig.color}`} />
            </div>

            <div className="flex-1 pt-1">
              <Dialog.Title
                className="text-lg font-semibold text-slate-900"
              >
                {title}
              </Dialog.Title>
            </div>
          </div>

          {/* Description */}
          <Dialog.Description
            className="mb-6 text-sm text-slate-600 leading-relaxed"
          >
            {description}
          </Dialog.Description>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {/* Cancel Button */}
            <button
              onClick={handleCancel}
              disabled={isSubmitting || isLoading || isDisabled}
              className="
                flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5
                text-sm font-medium text-slate-700
                hover:bg-slate-50 active:bg-slate-100
                focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            >
              {cancelLabel}
            </button>

            {/* Confirm Button */}
            <button
              onClick={handleConfirm}
              disabled={isSubmitting || isLoading || isDisabled}
              className={`
                flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5
                text-sm font-medium text-white
                focus:outline-none focus:ring-2 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
                ${typeConfig.buttonColor}
                ${typeConfig.buttonFocusRing}
              `}
            >
              {isSubmitting || isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Processing...</span>
                </>
              ) : (
                actionLabel
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default ConfirmationDialog;
