import { DataTypes, Model, Optional } from 'sequelize';
// NOTE: This model requires Sequelize setup. For PostgreSQL-only setup, this should be replaced with appropriate database models.
// Commenting out sequelize import until proper database connection is established
// import { sequelize } from '../database/connection';

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

export interface NotificationCreationAttributes 
  extends Optional<NotificationAttributes, 'id' | 'isRead' | 'createdAt' | 'updatedAt' | 'sentAt'> {}

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

export class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> 
  implements NotificationAttributes {
  public id!: number;
  public userId!: number;
  public type!: NotificationType;
  public title!: string;
  public message!: string;
  public priority!: NotificationPriority;
  public isRead!: boolean;
  public actionUrl?: string;
  public metadata?: Record<string, any>;
  public scheduledFor?: Date;
  public sentAt?: Date;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// NOTE: Sequelize initialization commented out until proper sequelize connection is established
// This model is prepared for Sequelize but requires database setup
/*
Notification.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM(...Object.values(NotificationType)),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM(...Object.values(NotificationPriority)),
    allowNull: false,
    defaultValue: NotificationPriority.MEDIUM
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  actionUrl: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  scheduledFor: {
    type: DataTypes.DATE,
    allowNull: true
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Notification',
  tableName: 'notifications',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['type'] },
    { fields: ['priority'] },
    { fields: ['isRead'] },
    { fields: ['scheduledFor'] },
    { fields: ['createdAt'] }
  ]
});
*/

export class UserNotificationPreference extends Model implements UserNotificationPreferences {
  public id!: number;
  public userId!: number;
  public emailEnabled!: boolean;
  public inAppEnabled!: boolean;
  public frequency!: 'immediate' | 'daily' | 'weekly';
  public doNotDisturbStart?: string;
  public doNotDisturbEnd?: string;
  public typePreferences!: Record<NotificationType, {
    email: boolean;
    inApp: boolean;
    priority: NotificationPriority;
  }>;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// NOTE: Sequelize initialization commented out until proper sequelize connection is established
/*
UserNotificationPreference.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  emailEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  inAppEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  frequency: {
    type: DataTypes.ENUM('immediate', 'daily', 'weekly'),
    allowNull: false,
    defaultValue: 'immediate'
  },
  doNotDisturbStart: {
    type: DataTypes.STRING(5), // HH:mm
    allowNull: true
  },
  doNotDisturbEnd: {
    type: DataTypes.STRING(5), // HH:mm
    allowNull: true
  },
  typePreferences: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: Object.values(NotificationType).reduce((acc, type) => {
      acc[type] = {
        email: true,
        inApp: true,
        priority: NotificationPriority.MEDIUM
      };
      return acc;
    }, {} as Record<NotificationType, any>)
  }
}, {
  sequelize,
  modelName: 'UserNotificationPreference',
  tableName: 'user_notification_preferences',
  timestamps: true
});
*/

export default Notification;