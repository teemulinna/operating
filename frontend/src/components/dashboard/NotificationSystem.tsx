import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealTimeNotifications } from '../../hooks/useWebSocket';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { 
  BellIcon, 
  XMarkIcon, 
  CogIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

interface NotificationAction {
  label: string;
  action: string;
  data: any;
}

interface Notification {
  id: string;
  type: 'resource_allocation' | 'conflict' | 'user_joined' | 'user_left' | 'system' | 'warning';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actions?: NotificationAction[];
  userId?: string;
  metadata?: any;
}

interface NotificationPreferences {
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  desktopBadgesEnabled: boolean;
  toastDuration: number;
  priorityFilters: {
    low: boolean;
    medium: boolean;
    high: boolean;
    critical: boolean;
  };
}

interface NotificationSystemProps {
  notifications: Notification[];
  onNotificationAction: (action: string, data: any, notificationId: string) => void;
  onMarkAsRead: (notificationId: string) => void;
  onClearAll: () => void;
  soundEnabled?: boolean;
  browserNotificationsEnabled?: boolean;
  toastDuration?: number;
  className?: string;
}

interface ToastNotification extends Notification {
  toastId: string;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  soundEnabled: true,
  browserNotificationsEnabled: true,
  desktopBadgesEnabled: true,
  toastDuration: 5000,
  priorityFilters: {
    low: true,
    medium: true,
    high: true,
    critical: true
  }
};

export const NotificationSystem: React.FC<NotificationSystemProps> = ({
  notifications,
  onNotificationAction,
  onMarkAsRead,
  onClearAll,
  soundEnabled = true,
  browserNotificationsEnabled = true,
  toastDuration = 5000,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [toastNotifications, setToastNotifications] = useState<ToastNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  
  const audioRef = useRef<HTMLAudioElement>();
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('notification-preferences');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      } catch (error) {
        console.error('Failed to parse notification preferences:', error);
      }
    }
  }, []);

  // Save preferences to localStorage
  const updatePreferences = useCallback((newPreferences: Partial<NotificationPreferences>) => {
    const updated = { ...preferences, ...newPreferences };
    setPreferences(updated);
    localStorage.setItem('notification-preferences', JSON.stringify(updated));
  }, [preferences]);

  // Initialize audio for sound alerts
  useEffect(() => {
    if (preferences.soundEnabled) {
      audioRef.current = new Audio('/sounds/notification.mp3');
      audioRef.current.volume = 0.5;
    }
  }, [preferences.soundEnabled]);

  // Request browser notification permission
  useEffect(() => {
    if (preferences.browserNotificationsEnabled && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [preferences.browserNotificationsEnabled]);

  // Play notification sound
  const playNotificationSound = useCallback((priority: string) => {
    if (preferences.soundEnabled && audioRef.current && (priority === 'high' || priority === 'critical')) {
      audioRef.current.play().catch(error => {
        console.warn('Failed to play notification sound:', error);
      });
    }
  }, [preferences.soundEnabled]);

  // Show browser notification
  const showBrowserNotification = useCallback((notification: Notification) => {
    if (
      preferences.browserNotificationsEnabled &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      });
    }
  }, [preferences.browserNotificationsEnabled]);

  // Handle real-time notifications
  const handleRealTimeNotification = useCallback((notification: Notification) => {
    const toastNotification: ToastNotification = {
      ...notification,
      toastId: `toast-${notification.id}-${Date.now()}`
    };

    // Add to toast notifications
    setToastNotifications(prev => [...prev, toastNotification]);

    // Play sound for high priority notifications
    playNotificationSound(notification.priority);

    // Show browser notification
    showBrowserNotification(notification);

    // Auto-dismiss toast after duration
    const timeout = setTimeout(() => {
      setToastNotifications(prev => prev.filter(t => t.toastId !== toastNotification.toastId));
    }, preferences.toastDuration);

    timeoutRefs.current.set(toastNotification.toastId, timeout);
  }, [playNotificationSound, showBrowserNotification, preferences.toastDuration]);

  // Listen for real-time notifications
  useRealTimeNotifications(handleRealTimeNotification);

  // Listen for real-time notification events
  useEffect(() => {
    const handleRealtimeNotification = (event: CustomEvent) => {
      handleRealTimeNotification(event.detail);
    };

    window.addEventListener('realtime-notification', handleRealtimeNotification);
    
    return () => {
      window.removeEventListener('realtime-notification', handleRealtimeNotification);
    };
  }, [handleRealTimeNotification]);

  // Dismiss toast notification
  const dismissToast = useCallback((toastId: string) => {
    setToastNotifications(prev => prev.filter(t => t.toastId !== toastId));
    
    const timeout = timeoutRefs.current.get(toastId);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(toastId);
    }
  }, []);

  // Format timestamp
  const formatTimestamp = useCallback((timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffMs = now.getTime() - notificationTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    
    return notificationTime.toLocaleDateString();
  }, []);

  // Get notification icon
  const getNotificationIcon = useCallback((type: string, priority: string) => {
    switch (type) {
      case 'conflict':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'resource_allocation':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'user_joined':
      case 'user_left':
        return <UsersIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  }, []);

  // Get priority styles
  const getPriorityStyles = useCallback((priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'medium':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className={`notification-system ${className}`}>
      {/* Notification Toggle Button */}
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          data-testid="notification-toggle"
          className="relative"
        >
          <BellIcon className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>

        {/* Notification Panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-12 w-96 z-50"
            >
              <Card className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-xl max-h-96 overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">Notifications</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPreferences(!showPreferences)}
                      >
                        <CogIcon className="w-4 h-4" />
                        Preferences
                      </Button>
                      {notifications.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onClearAll}
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {showPreferences ? (
                    /* Preferences Panel */
                    <div className="p-4 border-t border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-3">Notification Preferences</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label htmlFor="sound-alerts" className="text-sm text-gray-700">
                            Sound Alerts
                          </label>
                          <Switch
                            id="sound-alerts"
                            checked={preferences.soundEnabled}
                            onCheckedChange={(checked) => updatePreferences({ soundEnabled: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label htmlFor="browser-notifications" className="text-sm text-gray-700">
                            Browser Notifications
                          </label>
                          <Switch
                            id="browser-notifications"
                            checked={preferences.browserNotificationsEnabled}
                            onCheckedChange={(checked) => updatePreferences({ browserNotificationsEnabled: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label htmlFor="desktop-badges" className="text-sm text-gray-700">
                            Desktop Badges
                          </label>
                          <Switch
                            id="desktop-badges"
                            checked={preferences.desktopBadgesEnabled}
                            onCheckedChange={(checked) => updatePreferences({ desktopBadgesEnabled: checked })}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Notifications List */
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <BellIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p>No notifications yet</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {notifications.map((notification) => (
                            <motion.div
                              key={notification.id}
                              data-testid={`notification-${notification.id}`}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                                !notification.isRead ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                              }`}
                              onClick={() => onMarkAsRead(notification.id)}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-1">
                                  {getNotificationIcon(notification.type, notification.priority)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <h4 className="text-sm font-medium text-gray-900 truncate">
                                      {notification.title}
                                    </h4>
                                    <span className="text-xs text-gray-500">
                                      {formatTimestamp(notification.timestamp)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                                  {notification.actions && notification.actions.length > 0 && (
                                    <div className="flex gap-2">
                                      {notification.actions.map((action, index) => (
                                        <Button
                                          key={index}
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onNotificationAction(action.action, action.data, notification.id);
                                          }}
                                        >
                                          {action.label}
                                        </Button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2">
        <AnimatePresence mode="popLayout">
          {toastNotifications.map((toast) => (
            <motion.div
              key={toast.toastId}
              initial={{ opacity: 0, y: -100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -100, scale: 0.9 }}
              className={`max-w-md w-full rounded-lg border-l-4 p-4 shadow-lg bg-white ${getPriorityStyles(toast.priority)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getNotificationIcon(toast.type, toast.priority)}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{toast.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{toast.message}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissToast(toast.toastId)}
                  className="flex-shrink-0 -mt-1 -mr-1"
                  aria-label="Dismiss notification"
                >
                  <XMarkIcon className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};