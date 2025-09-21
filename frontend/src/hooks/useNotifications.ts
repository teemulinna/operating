import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { NotificationType, NotificationPriority } from '../types/notifications';

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  isRead: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}

export interface NotificationPreferences {
  id: number;
  userId: number;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  doNotDisturbStart?: string;
  doNotDisturbEnd?: string;
  typePreferences: Record<NotificationType, {
    email: boolean;
    inApp: boolean;
    priority: NotificationPriority;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListParams {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
}

// API functions
const notificationApi = {
  // Get notifications
  getNotifications: async (params: NotificationListParams = {}): Promise<NotificationListResponse> => {
    const searchParams = new URLSearchParams();
    
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());
    if (params.unreadOnly) searchParams.append('unreadOnly', 'true');
    if (params.type) searchParams.append('type', params.type);

    const response = await api.get(`/api/notifications?${searchParams.toString()}`);
    return response.data.data;
  },

  // Get notification statistics
  getStats: async (): Promise<NotificationStats> => {
    const response = await api.get('/api/notifications/stats');
    return response.data.data;
  },

  // Mark notification as read
  markAsRead: async (id: number): Promise<void> => {
    await api.patch(`/api/notifications/${id}/read`);
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<void> => {
    await api.patch('/api/notifications/read-all');
  },

  // Delete notification
  deleteNotification: async (id: number): Promise<void> => {
    await api.delete(`/api/notifications/${id}`);
  },

  // Get user preferences
  getPreferences: async (): Promise<NotificationPreferences> => {
    const response = await api.get('/api/notifications/preferences');
    return response.data.data;
  },

  // Update user preferences
  updatePreferences: async (updates: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
    const response = await api.put('/api/notifications/preferences', updates);
    return response.data.data;
  }
};

// Custom hooks
export const useNotifications = {
  // Get notifications list
  useList: (params: NotificationListParams = {}) => {
    return useQuery({
      queryKey: ['notifications', 'list', params],
      queryFn: () => notificationApi.getNotifications(params),
      staleTime: 30000, // 30 seconds
      refetchInterval: 60000, // Refetch every minute
      refetchIntervalInBackground: true,
    });
  },

  // Get notification statistics
  useStats: () => {
    return useQuery({
      queryKey: ['notifications', 'stats'],
      queryFn: notificationApi.getStats,
      staleTime: 10000, // 10 seconds
      refetchInterval: 30000, // Refetch every 30 seconds
      refetchIntervalInBackground: true,
    });
  },

  // Mark as read mutation
  useMarkAsRead: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: notificationApi.markAsRead,
      onSuccess: (_, notificationId) => {
        // Update the notifications list cache
        queryClient.setQueryData(['notifications', 'list'], (old: any) => {
          if (!old) return old;
          
          return {
            ...old,
            notifications: old.notifications.map((notification: Notification) =>
              notification.id === notificationId
                ? { ...notification, isRead: true }
                : notification
            )
          };
        });

        // Invalidate stats to refresh unread count
        queryClient.invalidateQueries({ queryKey: ['notifications', 'stats'] });
      },
    });
  },

  // Mark all as read mutation
  useMarkAllAsRead: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: notificationApi.markAllAsRead,
      onSuccess: () => {
        // Update all notifications in cache to read
        queryClient.setQueryData(['notifications', 'list'], (old: any) => {
          if (!old) return old;
          
          return {
            ...old,
            notifications: old.notifications.map((notification: Notification) => ({
              ...notification,
              isRead: true
            }))
          };
        });

        // Invalidate stats
        queryClient.invalidateQueries({ queryKey: ['notifications', 'stats'] });
      },
    });
  },

  // Delete notification mutation
  useDelete: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: notificationApi.deleteNotification,
      onSuccess: (_, notificationId) => {
        // Remove from notifications list cache
        queryClient.setQueryData(['notifications', 'list'], (old: any) => {
          if (!old) return old;
          
          return {
            ...old,
            notifications: old.notifications.filter((notification: Notification) =>
              notification.id !== notificationId
            ),
            total: old.total - 1
          };
        });

        // Invalidate stats
        queryClient.invalidateQueries({ queryKey: ['notifications', 'stats'] });
      },
    });
  },

  // Get preferences
  usePreferences: () => {
    return useQuery({
      queryKey: ['notifications', 'preferences'],
      queryFn: notificationApi.getPreferences,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  },

  // Update preferences mutation
  useUpdatePreferences: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: notificationApi.updatePreferences,
      onSuccess: (updatedPreferences) => {
        // Update preferences cache
        queryClient.setQueryData(['notifications', 'preferences'], updatedPreferences);
      },
    });
  }
};

// Utility hooks for common operations
export const useUnreadCount = () => {
  const { data: stats } = useNotifications.useStats();
  return stats?.unread || 0;
};

export const useNotificationActions = () => {
  const markAsReadMutation = useNotifications.useMarkAsRead();
  const markAllAsReadMutation = useNotifications.useMarkAllAsRead();
  const deleteMutation = useNotifications.useDelete();

  return {
    markAsRead: (id: number) => markAsReadMutation.mutateAsync(id),
    markAllAsRead: () => markAllAsReadMutation.mutateAsync(),
    deleteNotification: (id: number) => deleteMutation.mutateAsync(id),
    
    // Loading states
    isMarkingAsRead: markAsReadMutation.isLoading,
    isMarkingAllAsRead: markAllAsReadMutation.isLoading,
    isDeleting: deleteMutation.isLoading,
  };
};

// Real-time notification hook (for WebSocket integration)
export const useRealtimeNotifications = () => {
  const queryClient = useQueryClient();

  // This would be integrated with your WebSocket system
  const handleNewNotification = (notification: Notification) => {
    // Add new notification to the top of the list
    queryClient.setQueryData(['notifications', 'list'], (old: any) => {
      if (!old) return { notifications: [notification], total: 1 };
      
      return {
        notifications: [notification, ...old.notifications],
        total: old.total + 1
      };
    });

    // Update stats
    queryClient.invalidateQueries({ queryKey: ['notifications', 'stats'] });
  };

  const handleNotificationUpdate = (updatedNotification: Notification) => {
    // Update specific notification in cache
    queryClient.setQueryData(['notifications', 'list'], (old: any) => {
      if (!old) return old;
      
      return {
        ...old,
        notifications: old.notifications.map((notification: Notification) =>
          notification.id === updatedNotification.id ? updatedNotification : notification
        )
      };
    });

    // Update stats
    queryClient.invalidateQueries({ queryKey: ['notifications', 'stats'] });
  };

  return {
    handleNewNotification,
    handleNotificationUpdate
  };
};

export default useNotifications;