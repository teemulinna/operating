import { DataTypes, QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  // Create notifications table
  await queryInterface.createTable('notifications', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'employees',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    type: {
      type: DataTypes.ENUM(
        'over_allocation',
        'project_deadline',
        'budget_warning',
        'new_assignment',
        'approval_request',
        'system_announcement',
        'capacity_warning',
        'project_milestone',
        'resource_conflict'
      ),
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
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium'
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_read'
    },
    actionUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'action_url'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    scheduledFor: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'scheduled_for'
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'sent_at'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  });

  // Add indexes for better performance
  await queryInterface.addIndex('notifications', ['user_id']);
  await queryInterface.addIndex('notifications', ['type']);
  await queryInterface.addIndex('notifications', ['priority']);
  await queryInterface.addIndex('notifications', ['is_read']);
  await queryInterface.addIndex('notifications', ['scheduled_for']);
  await queryInterface.addIndex('notifications', ['created_at']);

  // Create user notification preferences table
  await queryInterface.createTable('user_notification_preferences', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: 'user_id',
      references: {
        model: 'employees',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    emailEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'email_enabled'
    },
    inAppEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'in_app_enabled'
    },
    frequency: {
      type: DataTypes.ENUM('immediate', 'daily', 'weekly'),
      allowNull: false,
      defaultValue: 'immediate'
    },
    doNotDisturbStart: {
      type: DataTypes.STRING(5), // HH:mm
      allowNull: true,
      field: 'do_not_disturb_start'
    },
    doNotDisturbEnd: {
      type: DataTypes.STRING(5), // HH:mm
      allowNull: true,
      field: 'do_not_disturb_end'
    },
    typePreferences: {
      type: DataTypes.JSON,
      allowNull: false,
      field: 'type_preferences',
      defaultValue: {
        over_allocation: { email: true, inApp: true, priority: 'medium' },
        project_deadline: { email: true, inApp: true, priority: 'medium' },
        budget_warning: { email: true, inApp: true, priority: 'medium' },
        new_assignment: { email: true, inApp: true, priority: 'medium' },
        approval_request: { email: true, inApp: true, priority: 'medium' },
        system_announcement: { email: true, inApp: true, priority: 'medium' },
        capacity_warning: { email: true, inApp: true, priority: 'medium' },
        project_milestone: { email: true, inApp: true, priority: 'medium' },
        resource_conflict: { email: true, inApp: true, priority: 'medium' }
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  });

  // Add index on userId for preferences
  await queryInterface.addIndex('user_notification_preferences', ['user_id']);
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('user_notification_preferences');
  await queryInterface.dropTable('notifications');
};