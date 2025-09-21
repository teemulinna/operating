import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle2, Info, Calendar, UserPlus } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { NotificationType, NotificationPriority } from '../../types/notifications';
import { motion, AnimatePresence } from 'framer-motion';

export interface ToastNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  actionUrl?: string;
  autoHide?: boolean;
  duration?: number;
}

export interface NotificationToastProps {
  notification: ToastNotification;
  onClose: (id: string) => void;
  onAction?: (notification: ToastNotification) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export interface ToastContainerProps {
  notifications: ToastNotification[];
  onClose: (id: string) => void;
  onAction?: (notification: ToastNotification) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxToasts?: number;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onClose,
  onAction,
  position = 'top-right'
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const duration = notification.duration || (notification.priority === NotificationPriority.URGENT ? 10000 : 5000);
  const autoHide = notification.autoHide !== false;

  useEffect(() => {
    if (!autoHide || isPaused) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(notification.id), 300); // Allow exit animation
    }, duration);

    return () => clearTimeout(timer);
  }, [autoHide, duration, isPaused, notification.id, onClose]);

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.OVER_ALLOCATION:
        return <AlertTriangle className="text-red-500" size={20} />;
      case NotificationType.PROJECT_DEADLINE:
        return <Calendar className="text-orange-500" size={20} />;
      case NotificationType.NEW_ASSIGNMENT:
        return <UserPlus className="text-green-500" size={20} />;
      case NotificationType.APPROVAL_REQUEST:
        return <CheckCircle2 className="text-blue-500" size={20} />;
      case NotificationType.SYSTEM_ANNOUNCEMENT:
        return <Info className="text-purple-500" size={20} />;
      default:
        return <Info className="text-gray-500" size={20} />;
    }
  };

  const getThemeClasses = (priority: NotificationPriority) => {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 'border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800';
      case NotificationPriority.HIGH:
        return 'border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800';
      case NotificationPriority.LOW:
        return 'border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700';
      default:
        return 'border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800';
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  const handleAction = () => {
    if (onAction) {
      onAction(notification);
    } else if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    onClose(notification.id);
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(notification.id), 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: position.includes('right') ? 300 : -300, scale: 0.9 }}
      animate={{ 
        opacity: isVisible ? 1 : 0, 
        x: isVisible ? 0 : (position.includes('right') ? 300 : -300),
        scale: isVisible ? 1 : 0.9
      }}
      exit={{ 
        opacity: 0, 
        x: position.includes('right') ? 300 : -300, 
        scale: 0.9 
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`fixed z-50 w-80 ${getPositionClasses()}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <Card className={`p-4 shadow-lg border-l-4 ${getThemeClasses(notification.priority)}`}>
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            {getIcon(notification.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                {notification.title}
              </h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-400 hover:text-gray-600"
                onClick={handleClose}
              >
                <X size={14} />
              </Button>
            </div>

            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {notification.message}
            </p>

            {/* Action Button */}
            {(notification.actionUrl || onAction) && (
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAction}
                  className="text-xs"
                >
                  View Details
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar for Auto-hide */}
        {autoHide && !isPaused && (
          <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <motion.div
              className="h-1 rounded-full bg-current opacity-50"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: duration / 1000, ease: 'linear' }}
            />
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({
  notifications,
  onClose,
  onAction,
  position = 'top-right',
  maxToasts = 5
}) => {
  // Limit the number of visible toasts
  const visibleNotifications = notifications.slice(0, maxToasts);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence mode="popLayout">
        {visibleNotifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            layout
            initial={false}
            style={{
              // Stack toasts with slight offset
              transform: `translateY(${index * 10}px)`,
              zIndex: 50 - index
            }}
            className="pointer-events-auto"
          >
            <NotificationToast
              notification={notification}
              onClose={onClose}
              onAction={onAction}
              position={position}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Hook for managing toast notifications
export const useToastNotifications = () => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (notification: Omit<ToastNotification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastNotification = {
      id,
      ...notification
    };

    setToasts(prev => [newToast, ...prev]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  // Convenience methods for different notification types
  const notifyOverAllocation = (data: { projectName: string; resourceName: string; allocation: number }) => {
    return addToast({
      type: NotificationType.OVER_ALLOCATION,
      title: 'Resource Over-Allocation',
      message: `${data.resourceName} is over-allocated at ${data.allocation}% in ${data.projectName}`,
      priority: NotificationPriority.HIGH,
      autoHide: false
    });
  };

  const notifyDeadline = (data: { projectName: string; daysRemaining: number }) => {
    return addToast({
      type: NotificationType.PROJECT_DEADLINE,
      title: 'Project Deadline Approaching',
      message: `${data.projectName} deadline is in ${data.daysRemaining} days`,
      priority: data.daysRemaining <= 1 ? NotificationPriority.URGENT : NotificationPriority.HIGH,
      duration: data.daysRemaining <= 1 ? 10000 : 7000
    });
  };

  const notifyNewAssignment = (data: { projectName: string; role: string }) => {
    return addToast({
      type: NotificationType.NEW_ASSIGNMENT,
      title: 'New Assignment',
      message: `You've been assigned as ${data.role} to ${data.projectName}`,
      priority: NotificationPriority.MEDIUM
    });
  };

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    // Convenience methods
    notifyOverAllocation,
    notifyDeadline,
    notifyNewAssignment
  };
};

export default NotificationToast;