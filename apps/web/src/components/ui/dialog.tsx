import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  children,
  className = "",
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";

      // Focus trap
      if (dialogRef.current) {
        dialogRef.current.focus();
      }
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className={`relative bg-white rounded-lg shadow-xl w-auto mx-4 ${className}`}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
};

export interface DialogHeaderProps {
  children: React.ReactNode;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({
  children,
  onClose,
  showCloseButton = true,
}) => {
  return (
    <div className="flex items-center justify-between p-6 border-b border-slate-200">
      <div className="flex-1">{children}</div>
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="ml-4 p-1 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export const DialogTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <h2 className="text-lg font-semibold text-slate-900">{children}</h2>;
};

export const DialogDescription: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <p className="text-sm text-slate-600 mt-1">{children}</p>;
};

export const DialogContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => {
  return <div className={`p-6 ${className}`}>{children}</div>;
};

export const DialogActions: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => {
  return (
    <div
      className={`flex justify-end space-x-3 px-6 py-4 bg-slate-50 rounded-b-lg ${className}`}
    >
      {children}
    </div>
  );
};

// Confirmation Dialog Component
export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
}) => {
  const getConfirmButtonProps = () => {
    switch (variant) {
      case "danger":
        return {
          className: "bg-red-600 hover:bg-red-700 text-white",
        };
      case "warning":
        return {
          className: "bg-amber-600 hover:bg-amber-700 text-white",
        };
      case "info":
        return {
          className: "bg-primary-600 hover:bg-primary-700 text-white",
        };
      default:
        return {
          className: "bg-red-600 hover:bg-red-700 text-white",
        };
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogHeader onClose={onClose}>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

      <DialogContent>
        <DialogDescription>{description}</DialogDescription>
      </DialogContent>

      <DialogActions>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          {...getConfirmButtonProps()}
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
