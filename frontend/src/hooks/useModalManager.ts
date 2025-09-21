import { useState, useCallback, useEffect } from 'react';
import * as React from 'react';

export interface ModalState<T> {
  isFormModalOpen: boolean;
  isDeleteDialogOpen: boolean;
  isViewModalOpen: boolean;
  editingItem: T | null;
  deletingItem: T | null;
  viewingItem: T | null;
  modalData: Record<string, any>;
}

export interface UseModalManagerReturn<T> {
  state: ModalState<T>;
  openFormModal: (item?: T | null, data?: Record<string, any>) => void;
  closeFormModal: () => void;
  openDeleteDialog: (item: T, data?: Record<string, any>) => void;
  closeDeleteDialog: () => void;
  openViewModal: (item: T, data?: Record<string, any>) => void;
  closeViewModal: () => void;
  closeAllModals: () => void;
  setModalData: (data: Record<string, any>) => void;
  isAnyModalOpen: boolean;
}

/**
 * Modal state and lifecycle management hook
 * 
 * Features:
 * - Manages multiple modal types (form, delete, view)
 * - Tracks editing/deleting/viewing items
 * - Supports additional modal data
 * - Provides convenience methods for modal operations
 * - Type-safe with TypeScript generics
 * - Keyboard event handling (ESC to close)
 * - Body scroll lock when modals are open
 */
export function useModalManager<T = any>(): UseModalManagerReturn<T> {
  const [state, setState] = useState<ModalState<T>>({
    isFormModalOpen: false,
    isDeleteDialogOpen: false,
    isViewModalOpen: false,
    editingItem: null,
    deletingItem: null,
    viewingItem: null,
    modalData: {},
  });

  // Body scroll lock effect
  useEffect(() => {
    const isAnyOpen = state.isFormModalOpen || state.isDeleteDialogOpen || state.isViewModalOpen;
    
    if (isAnyOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [state.isFormModalOpen, state.isDeleteDialogOpen, state.isViewModalOpen]);

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAllModals();
      }
    };

    const isAnyOpen = state.isFormModalOpen || state.isDeleteDialogOpen || state.isViewModalOpen;
    
    if (isAnyOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [state.isFormModalOpen, state.isDeleteDialogOpen, state.isViewModalOpen]);

  const openFormModal = useCallback((item?: T | null, data?: Record<string, any>) => {
    setState(prev => ({
      ...prev,
      isFormModalOpen: true,
      editingItem: item || null,
      modalData: data || {},
      // Close other modals
      isDeleteDialogOpen: false,
      isViewModalOpen: false,
      deletingItem: null,
      viewingItem: null,
    }));
  }, []);

  const closeFormModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      isFormModalOpen: false,
      editingItem: null,
      modalData: {},
    }));
  }, []);

  const openDeleteDialog = useCallback((item: T, data?: Record<string, any>) => {
    setState(prev => ({
      ...prev,
      isDeleteDialogOpen: true,
      deletingItem: item,
      modalData: data || {},
      // Close other modals
      isFormModalOpen: false,
      isViewModalOpen: false,
      editingItem: null,
      viewingItem: null,
    }));
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDeleteDialogOpen: false,
      deletingItem: null,
      modalData: {},
    }));
  }, []);

  const openViewModal = useCallback((item: T, data?: Record<string, any>) => {
    setState(prev => ({
      ...prev,
      isViewModalOpen: true,
      viewingItem: item,
      modalData: data || {},
      // Close other modals
      isFormModalOpen: false,
      isDeleteDialogOpen: false,
      editingItem: null,
      deletingItem: null,
    }));
  }, []);

  const closeViewModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      isViewModalOpen: false,
      viewingItem: null,
      modalData: {},
    }));
  }, []);

  const closeAllModals = useCallback(() => {
    setState({
      isFormModalOpen: false,
      isDeleteDialogOpen: false,
      isViewModalOpen: false,
      editingItem: null,
      deletingItem: null,
      viewingItem: null,
      modalData: {},
    });
  }, []);

  const setModalData = useCallback((data: Record<string, any>) => {
    setState(prev => ({
      ...prev,
      modalData: { ...prev.modalData, ...data },
    }));
  }, []);

  const isAnyModalOpen = state.isFormModalOpen || state.isDeleteDialogOpen || state.isViewModalOpen;

  return {
    state,
    openFormModal,
    closeFormModal,
    openDeleteDialog,
    closeDeleteDialog,
    openViewModal,
    closeViewModal,
    closeAllModals,
    setModalData,
    isAnyModalOpen,
  };
}

// Modal backdrop component for consistent styling
export interface ModalBackdropProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  closeOnBackdropClick?: boolean;
  'data-testid'?: string;
}

export function ModalBackdrop({ 
  isOpen, 
  onClose, 
  children, 
  className = '',
  closeOnBackdropClick = true,
  'data-testid': testId
}: ModalBackdropProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return React.createElement(
    'div',
    {
      className: `fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`,
      onClick: handleBackdropClick,
      'data-testid': testId,
      role: 'dialog',
      'aria-modal': 'true'
    },
    children
  );
}

// Confirmation dialog component
export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'info';
  'data-testid'?: string;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  variant = 'danger',
  'data-testid': testId = 'confirmation-dialog'
}: ConfirmationDialogProps) {
  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  };

  return React.createElement(
    ModalBackdrop,
    { 
      isOpen, 
      onClose, 
      'data-testid': testId,
      children: React.createElement(
        'div',
        { className: 'bg-white rounded-lg p-6 w-full max-w-md mx-4 transform transition-all' },
        React.createElement(
          'div',
          { className: 'mb-4' },
          React.createElement(
            'h2',
            { className: 'text-xl font-bold text-gray-900 mb-2' },
            title
          ),
          React.createElement(
            'p',
            { className: 'text-gray-600', 'data-testid': `${testId}-message` },
            message
          )
        ),
        React.createElement(
          'div',
          { className: 'flex justify-end space-x-3' },
          React.createElement(
            'button',
            {
              onClick: onClose,
              disabled: isLoading,
              className: 'px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed',
              'data-testid': `${testId}-cancel`
            },
            cancelText
          ),
          React.createElement(
            'button',
            {
              onClick: onConfirm,
              disabled: isLoading,
              className: `px-4 py-2 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 ${variantStyles[variant]}`,
              'data-testid': `${testId}-confirm`
            },
            isLoading ? 'Processing...' : confirmText
          )
        )
      )
    }
  );
}

export default useModalManager;