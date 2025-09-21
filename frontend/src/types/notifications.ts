export enum NotificationType {
  OVER_ALLOCATION = 'over_allocation',
  PROJECT_DEADLINE = 'project_deadline',
  BUDGET_WARNING = 'budget_warning',
  NEW_ASSIGNMENT = 'new_assignment',
  APPROVAL_REQUEST = 'approval_request',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  CAPACITY_WARNING = 'capacity_warning',
  PROJECT_MILESTONE = 'project_milestone',
  RESOURCE_CONFLICT = 'resource_conflict'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface NotificationAttributes {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  isRead: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  scheduledFor?: Date;
  sentAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserNotificationPreferences {
  id: number;
  userId: number;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  doNotDisturbStart?: string; // HH:mm format
  doNotDisturbEnd?: string; // HH:mm format
  typePreferences: Record<NotificationType, {
    email: boolean;
    inApp: boolean;
    priority: NotificationPriority;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NotificationContext {
  projectName?: string;
  employeeName?: string;
  resourceName?: string;
  currentAllocation?: number;
  startDate?: string;
  endDate?: string;
  deadline?: string;
  daysRemaining?: number;
  progress?: number;
  role?: string;
  allocation?: number;
  description?: string;
  actionUrl?: string;
  [key: string]: any;
}

export interface BulkNotificationOptions {
  userIds: number[];
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  context?: NotificationContext;
  scheduledFor?: Date;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}

// Frontend specific types
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

export interface WebSocketNotificationEvent {
  type: 'NEW_NOTIFICATION' | 'NOTIFICATION_UPDATE' | 'NOTIFICATION_DELETE';
  data: NotificationAttributes;
}

export interface NotificationListParams {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
}

export interface NotificationListResponse {
  notifications: NotificationAttributes[];
  total: number;
}