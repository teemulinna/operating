import { QueryInterface, DataTypes, Sequelize } from 'sequelize';
import { TaskType, TaskStatus, TaskPriority } from '../models/ProjectTask';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('project_tasks', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    taskType: {
      type: DataTypes.ENUM(...Object.values(TaskType)),
      allowNull: false,
      defaultValue: TaskType.TASK,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(TaskStatus)),
      allowNull: false,
      defaultValue: TaskStatus.NOT_STARTED,
    },
    priority: {
      type: DataTypes.ENUM(...Object.values(TaskPriority)),
      allowNull: false,
      defaultValue: TaskPriority.MEDIUM,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    plannedStartDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    plannedEndDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    actualStartDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    actualEndDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    progress: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    effort: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    assignedTo: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'employees',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    parentTaskId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'project_tasks',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isCriticalPath: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    slackTime: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    earlyStart: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    earlyFinish: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lateStart: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lateFinish: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    budgetAllocated: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    resourceRequirements: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  // Add indexes
  await queryInterface.addIndex('project_tasks', ['projectId'], {
    name: 'idx_project_tasks_project_id'
  });

  await queryInterface.addIndex('project_tasks', ['assignedTo'], {
    name: 'idx_project_tasks_assigned_to'
  });

  await queryInterface.addIndex('project_tasks', ['parentTaskId'], {
    name: 'idx_project_tasks_parent_task_id'
  });

  await queryInterface.addIndex('project_tasks', ['status'], {
    name: 'idx_project_tasks_status'
  });

  await queryInterface.addIndex('project_tasks', ['taskType'], {
    name: 'idx_project_tasks_task_type'
  });

  await queryInterface.addIndex('project_tasks', ['priority'], {
    name: 'idx_project_tasks_priority'
  });

  await queryInterface.addIndex('project_tasks', ['isCriticalPath'], {
    name: 'idx_project_tasks_critical_path'
  });

  await queryInterface.addIndex('project_tasks', ['startDate', 'endDate'], {
    name: 'idx_project_tasks_dates'
  });

  await queryInterface.addIndex('project_tasks', ['sortOrder'], {
    name: 'idx_project_tasks_sort_order'
  });

  // Add composite indexes for common queries
  await queryInterface.addIndex('project_tasks', ['projectId', 'status'], {
    name: 'idx_project_tasks_project_status'
  });

  await queryInterface.addIndex('project_tasks', ['projectId', 'assignedTo'], {
    name: 'idx_project_tasks_project_assigned'
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('project_tasks');
}