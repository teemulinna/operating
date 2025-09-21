// Using PostgreSQL directly instead of Sequelize for consistency
import { ProjectModel } from './Project';
import { EmployeeModel } from './Employee';
import { TaskDependency } from './TaskDependency';
import { Project, Employee } from '../types';

export enum TaskType {
  TASK = 'task',
  MILESTONE = 'milestone',
  PHASE = 'phase'
}

export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold',
  CANCELLED = 'cancelled'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ProjectTaskAttributes {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  taskType: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: Date;
  endDate?: Date;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  progress: number; // 0-100
  duration: number; // in days
  effort: number; // in hours
  assignedTo?: string; // Employee ID
  parentTaskId?: string; // For hierarchical tasks
  sortOrder: number;
  isCriticalPath: boolean;
  slackTime: number; // in days
  earlyStart?: Date;
  earlyFinish?: Date;
  lateStart?: Date;
  lateFinish?: Date;
  cost?: number;
  budgetAllocated?: number;
  resourceRequirements?: string; // JSON string
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProjectTaskCreationAttributes extends Omit<ProjectTaskAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class ProjectTask implements ProjectTaskAttributes {
  public id!: string;
  public projectId!: string;
  public name!: string;
  public description?: string;
  public taskType!: TaskType;
  public status!: TaskStatus;
  public priority!: TaskPriority;
  public startDate?: Date;
  public endDate?: Date;
  public plannedStartDate?: Date;
  public plannedEndDate?: Date;
  public actualStartDate?: Date;
  public actualEndDate?: Date;
  public progress!: number;
  public duration!: number;
  public effort!: number;
  public assignedTo?: string;
  public parentTaskId?: string;
  public sortOrder!: number;
  public isCriticalPath!: boolean;
  public slackTime!: number;
  public earlyStart?: Date;
  public earlyFinish?: Date;
  public lateStart?: Date;
  public lateFinish?: Date;
  public cost?: number;
  public budgetAllocated?: number;
  public resourceRequirements?: string;
  public notes?: string;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public readonly project?: Project;
  public readonly assignedEmployee?: Employee;
  public readonly parentTask?: ProjectTask;
  public readonly childTasks?: ProjectTask[];
  public readonly predecessorDependencies?: TaskDependency[];
  public readonly successorDependencies?: TaskDependency[];

  // Relationships handled via service layer

  // Helper methods
  public get isOverdue(): boolean {
    if (!this.endDate || this.status === TaskStatus.COMPLETED) return false;
    return new Date() > this.endDate;
  }

  public get daysRemaining(): number | null {
    if (!this.endDate || this.status === TaskStatus.COMPLETED) return null;
    const today = new Date();
    const timeDiff = this.endDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  public get progressStatus(): 'on_track' | 'at_risk' | 'behind' {
    if (this.status === TaskStatus.COMPLETED) return 'on_track';
    
    const today = new Date();
    if (!this.startDate || !this.endDate) return 'on_track';
    
    const totalDuration = this.endDate.getTime() - this.startDate.getTime();
    const elapsed = today.getTime() - this.startDate.getTime();
    const expectedProgress = Math.min(100, (elapsed / totalDuration) * 100);
    
    if (this.progress >= expectedProgress) return 'on_track';
    if (this.progress >= expectedProgress * 0.8) return 'at_risk';
    return 'behind';
  }

  public calculateResourceRequirements(): any {
    try {
      return this.resourceRequirements ? JSON.parse(this.resourceRequirements) : {};
    } catch {
      return {};
    }
  }

  public setResourceRequirements(requirements: any): void {
    this.resourceRequirements = JSON.stringify(requirements);
  }
}

// Note: Database operations handled via service layer using PostgreSQL pool