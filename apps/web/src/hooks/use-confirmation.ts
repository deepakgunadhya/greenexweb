import { useState, useCallback } from 'react';
import { ConfirmationType } from '@/components/dialogs/confirmation-dialog';

/**
 * Confirmation Dialog State
 */
export interface ConfirmationState {
  open: boolean;
  title: string;
  description: string;
  type: ConfirmationType;
  actionLabel: string;
  cancelLabel: string;
  isLoading: boolean;
  isDisabled: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * Hook for managing confirmation dialog state
 *
 * @example
 * ```tsx
 * const confirmation = useConfirmation();
 *
 * const handleDeleteClick = () => {
 *   confirmation.ask({
 *     title: 'Delete Item?',
 *     description: 'This action cannot be undone.',
 *     type: 'danger',
 *     onConfirm: async () => {
 *       await deleteItem();
 *     },
 *   });
 * };
 *
 * return (
 *   <>
 *     <button onClick={handleDeleteClick}>Delete</button>
 *     <ConfirmationDialog {...confirmation.dialog} />
 *   </>
 * );
 * ```
 */
export function useConfirmation() {
  const [state, setState] = useState<ConfirmationState>({
    open: false,
    title: '',
    description: '',
    type: 'info',
    actionLabel: 'Confirm',
    cancelLabel: 'Cancel',
    isLoading: false,
    isDisabled: false,
    onConfirm: () => {},
    onCancel: undefined,
  });

  const ask = useCallback(
    (options: {
      title: string;
      description: string;
      type?: ConfirmationType;
      actionLabel?: string;
      cancelLabel?: string;
      onConfirm: () => void | Promise<void>;
      onCancel?: () => void;
      isLoading?: boolean;
      isDisabled?: boolean;
    }) => {
      setState({
        open: true,
        title: options.title,
        description: options.description,
        type: options.type ?? 'info',
        actionLabel: options.actionLabel ?? 'Confirm',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        isLoading: options.isLoading ?? false,
        isDisabled: options.isDisabled ?? false,
        onConfirm: options.onConfirm,
        onCancel: options.onCancel,
      });
    },
    []
  );

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  return {
    /**
     * Dialog props to spread into ConfirmationDialog component
     */
    dialog: {
      open: state.open,
      onOpenChange: close,
      title: state.title,
      description: state.description,
      type: state.type,
      actionLabel: state.actionLabel,
      cancelLabel: state.cancelLabel,
      isLoading: state.isLoading,
      isDisabled: state.isDisabled,
      onConfirm: state.onConfirm,
      onCancel: state.onCancel,
    },

    /**
     * Show confirmation dialog
     */
    ask,

    /**
     * Close confirmation dialog
     */
    close,

    /**
     * Check if dialog is open
     */
    isOpen: state.open,
  };
}

export default useConfirmation;
