import { useState, useCallback } from 'react';
import * as React from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  isVisible: boolean;
}

export interface UseToastManagerReturn {
  toast: Toast | null;
  showToast: (message: string, type?: Toast['type'], duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  hideToast: () => void;
  isVisible: boolean;
}

/**
 * Centralized toast notification manager hook
 * 
 * Features:
 * - Type-safe toast notifications
 * - Auto-dismiss with configurable duration
 * - Convenience methods for common toast types
 * - Single toast management (replaces existing toasts)
 * - Proper cleanup on unmount
 */
export function useToastManager(): UseToastManagerReturn {
  const [toast, setToast] = useState<Toast | null>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const hideToast = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setToast(prev => prev ? { ...prev, isVisible: false } : null);
    
    // Remove the toast after fade animation
    setTimeout(() => {
      setToast(null);
    }, 300);
  }, []);

  const showToast = useCallback((
    message: string, 
    type: Toast['type'] = 'info', 
    duration: number = 4000
  ) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const id = `toast-${Date.now()}`;
    
    setToast({
      id,
      message,
      type,
      duration,
      isVisible: true
    });

    // Auto-dismiss after duration
    if (duration > 0) {
      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    }
  }, [hideToast]);

  const showError = useCallback((message: string, duration?: number) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  const showSuccess = useCallback((message: string, duration?: number) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  const showWarning = useCallback((message: string, duration?: number) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration?: number) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    toast,
    showToast,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    hideToast,
    isVisible: toast?.isVisible || false
  };
}

// Toast Notification Component
export interface ToastNotificationProps {
  toast: Toast | null;
  onClose: () => void;
  className?: string;
}

export function ToastNotification({ toast, onClose, className = '' }: ToastNotificationProps) {
  if (!toast || !toast.isVisible) return null;

  const getToastStyles = (type: Toast['type']) => {
    const baseStyles = 'fixed top-4 right-4 max-w-sm w-full bg-white rounded-lg shadow-lg border-l-4 p-4 z-50 transform transition-all duration-300 ease-in-out';
    
    const typeStyles = {
      success: 'border-green-500 text-green-800 bg-green-50',
      error: 'border-red-500 text-red-800 bg-red-50',
      warning: 'border-yellow-500 text-yellow-800 bg-yellow-50',
      info: 'border-blue-500 text-blue-800 bg-blue-50'
    };

    return `${baseStyles} ${typeStyles[type]} ${className}`;
  };

  const getTestId = (type: Toast['type']) => {
    return `${type}-toast`;
  };

  return React.createElement(
    'div',
    {
      className: getToastStyles(toast.type),
      'data-testid': getTestId(toast.type),
      role: 'alert',
      'aria-live': 'polite'
    },
    React.createElement(
      'div',
      { className: 'flex items-start' },
      React.createElement(
        'div',
        { className: 'flex-shrink-0' },
        // Icon placeholder - will be styled with CSS
        React.createElement('div', { className: `w-5 h-5 rounded-full ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : toast.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}` })
      ),
      React.createElement(
        'div',
        { className: 'ml-3 w-0 flex-1' },
        React.createElement(
          'p',
          { className: 'text-sm font-medium' },
          toast.message
        )
      ),
      React.createElement(
        'div',
        { className: 'ml-4 flex-shrink-0 flex' },
        React.createElement(
          'button',
          {
            onClick: onClose,
            className: 'bg-transparent rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500',
            'data-testid': 'close-toast',
            'aria-label': 'Close notification'
          },
          React.createElement(
            'span',
            { className: 'sr-only' },
            'Close'
          ),
          '×'
        )
      )
    )
  );
}

export default useToastManager;