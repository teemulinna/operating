import React, { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export interface ToastState {
  message: string;
  type: ToastType;
  isVisible: boolean;
}

export function useToastManager() {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'info',
    isVisible: false
  });

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 4000) => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, isVisible: false }));
    }, duration);
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, isVisible: false }));
  }, []);

  const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const showError = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const showInfo = useCallback((message: string) => showToast(message, 'info'), [showToast]);
  const showWarning = useCallback((message: string) => showToast(message, 'warning'), [showToast]);

  return {
    toast,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showInfo,
    showWarning
  };
}

// Toast notification component for rendering
export function ToastNotification({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast.isVisible) return null;

  const bgColorClass = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  }[toast.type] || 'bg-blue-500';

  return (
    <div
      className={`fixed top-4 right-4 ${bgColorClass} text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm`}
      data-testid={`${toast.type}-message`}
      role="alert"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{toast.message}</span>
        <button
          onClick={onClose}
          className="ml-4 text-white hover:text-gray-200 focus:outline-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// Additional component for backward compatibility with old ToastComponent usage
export function ToastComponent() {
  return null; // Empty component for backward compatibility
}