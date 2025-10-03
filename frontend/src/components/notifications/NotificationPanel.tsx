import React, { useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  UserPlus,
  Settings,
  Bell,
  Trash2,
  Eye,
  EyeOff,
  Filter
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationType, NotificationPriority } from '../../types/notifications';
import { formatDistanceToNow } from 'date-fns';

export interface NotificationPanelProps {
  onClose?: () => void;
  maxHeight?: string;
  className?: string;
}

interface NotificationItemProps {
  notification: any;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete
}) => {
  const getIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.OVER_ALLOCATION:
        return <AlertTriangle className="text-red-500" size={20} />;
      case NotificationType.PROJECT_DEADLINE:
        return <Calendar className="text-orange-500" size={20} />;
      case NotificationType.NEW_ASSIGNMENT:
        return <UserPlus className="text-green-500" size={20} />;
      case NotificationType.APPROVAL_REQUEST:
        return <Settings className="text-blue-500" size={20} />;
      case NotificationType.SYSTEM_ANNOUNCEMENT:
        return <Bell className="text-purple-500" size={20} />;
      default:
        return <Bell className="text-gray-500" size={20} />;
    }
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 'bg-red-100 border-red-200 text-red-800';
      case NotificationPriority.HIGH:
        return 'bg-orange-100 border-orange-200 text-orange-800';
      case NotificationPriority.LOW:
        return 'bg-gray-100 border-gray-200 text-gray-600';
      default:
        return 'bg-blue-100 border-blue-200 text-blue-800';
    }
  };

  const getPriorityLabel = (priority: NotificationPriority) => {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 'Urgent';
      case NotificationPriority.HIGH:
        return 'High';
      case NotificationPriority.LOW:
        return 'Low';
      default:
        return 'Medium';
    }
  };

  return (
    <div className={`p-4 border-b transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-950' : ''}`}>
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-1">
          {getIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
              {notification.title}
            </h4>
            
            {/* Priority Badge */}
            {notification.priority !== NotificationPriority.MEDIUM && (
              <Badge 
                variant="outline" 
                className={`text-xs ${getPriorityColor(notification.priority)}`}
              >
                {getPriorityLabel(notification.priority)}
              </Badge>
            )}
          </div>

          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {notification.message}
          </p>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>

            <div className="flex items-center space-x-1">
              {/* Mark as read/unread */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onMarkAsRead(notification.id)}
                title={notification.isRead ? 'Mark as unread' : 'Mark as read'}
              >
                {notification.isRead ? <EyeOff size={12} /> : <Eye size={12} />}
              </Button>

              {/* Delete */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-400 hover:text-red-500"
                onClick={() => onDelete(notification.id)}
                title="Delete notification"
              >
                <Trash2 size={12} />
              </Button>
            </div>
          </div>

          {/* Action URL */}
          {notification.actionUrl && (
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  // Navigate to action URL
                  window.location.href = notification.actionUrl;
                }}
              >
                View Details
              </Button>
            </div>
          )}
        </div>

        {/* Unread indicator */}
        {!notification.isRead && (
          <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2" />
        )}
      </div>
    </div>
  );
};

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  maxHeight = '400px',
  className = ''
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');
  
  const {
    data: notificationsData,
    isLoading,
    refetch
  } = useNotifications.useList({
    limit: 50,
    unreadOnly: filter === 'unread',
    type: typeFilter === 'all' ? undefined : typeFilter
  });

  const markAsReadMutation = useNotifications.useMarkAsRead();
  const markAllAsReadMutation = useNotifications.useMarkAllAsRead();
  const deleteMutation = useNotifications.useDelete();

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsReadMutation.mutateAsync(id);
      refetch();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
      refetch();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      refetch();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center p-8`} style={{ maxHeight }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className={`${className} flex flex-col`} style={{ maxHeight }}>
      {/* Controls */}
      <div className="p-4 border-b bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Button
              variant={filter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </Button>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              Mark All Read
            </Button>
          )}
        </div>

        {/* Type Filter */}
        <div className="flex items-center space-x-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as NotificationType | 'all')}
            className="text-sm border rounded px-2 py-1 bg-white dark:bg-gray-700"
          >
            <option value="all">All Types</option>
            <option value={NotificationType.OVER_ALLOCATION}>Over Allocation</option>
            <option value={NotificationType.PROJECT_DEADLINE}>Project Deadline</option>
            <option value={NotificationType.NEW_ASSIGNMENT}>New Assignment</option>
            <option value={NotificationType.APPROVAL_REQUEST}>Approval Request</option>
            <option value={NotificationType.SYSTEM_ANNOUNCEMENT}>System</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Bell className="text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              No notifications
            </h3>
            <p className="text-sm text-gray-500">
              {filter === 'unread' 
                ? "You're all caught up! No unread notifications."
                : "No notifications to display."}
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t bg-gray-50 dark:bg-gray-800">
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => {
              // Navigate to notification settings
              window.location.href = '/settings/notifications';
            }}
          >
            <Settings size={14} className="mr-1" />
            Settings
          </Button>
          
          <span className="text-xs text-gray-500">
            Last updated: {formatDistanceToNow(new Date(), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;