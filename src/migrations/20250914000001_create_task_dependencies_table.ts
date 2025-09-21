import { QueryInterface, DataTypes, Sequelize } from 'sequelize';
import { DependencyType } from '../models/TaskDependency';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('task_dependencies', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    predecessorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'project_tasks',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    successorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'project_tasks',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    dependencyType: {
      type: DataTypes.ENUM(...Object.values(DependencyType)),
      allowNull: false,
      defaultValue: DependencyType.FINISH_TO_START,
    },
    lagTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Lag time in days (positive for lag, negative for lead)',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    description: {
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
  await queryInterface.addIndex('task_dependencies', ['predecessorId'], {
    name: 'idx_task_dependencies_predecessor_id'
  });

  await queryInterface.addIndex('task_dependencies', ['successorId'], {
    name: 'idx_task_dependencies_successor_id'
  });

  await queryInterface.addIndex('task_dependencies', ['dependencyType'], {
    name: 'idx_task_dependencies_type'
  });

  await queryInterface.addIndex('task_dependencies', ['isActive'], {
    name: 'idx_task_dependencies_active'
  });

  // Unique constraint to prevent duplicate dependencies between same tasks
  await queryInterface.addIndex('task_dependencies', ['predecessorId', 'successorId'], {
    unique: true,
    name: 'unique_task_dependency'
  });

  // Composite indexes for common queries
  await queryInterface.addIndex('task_dependencies', ['predecessorId', 'isActive'], {
    name: 'idx_task_dependencies_predecessor_active'
  });

  await queryInterface.addIndex('task_dependencies', ['successorId', 'isActive'], {
    name: 'idx_task_dependencies_successor_active'
  });

  // Add constraint to prevent self-referencing dependencies
  await queryInterface.addConstraint('task_dependencies', {
    fields: ['predecessorId', 'successorId'],
    type: 'check',
    name: 'check_no_self_dependency',
    where: Sequelize.literal('predecessor_id != successor_id')
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('task_dependencies');
}