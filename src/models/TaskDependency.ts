// Using PostgreSQL directly instead of Sequelize for consistency
import { Pool } from 'pg';
import { ProjectTask } from './ProjectTask';
import { DatabaseService } from '../database/database.service';

export enum DependencyType {
  FINISH_TO_START = 'FS', // Task B cannot start until Task A finishes
  START_TO_START = 'SS',   // Task B cannot start until Task A starts
  FINISH_TO_FINISH = 'FF', // Task B cannot finish until Task A finishes
  START_TO_FINISH = 'SF'   // Task B cannot finish until Task A starts
}

export interface TaskDependencyAttributes {
  id: string;
  predecessorId: string; // Task that must complete first
  successorId: string;   // Task that depends on predecessor
  dependencyType: DependencyType;
  lagTime: number; // in days (can be negative for lead time)
  isActive: boolean;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TaskDependencyCreationAttributes extends Omit<TaskDependencyAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class TaskDependency implements TaskDependencyAttributes {
  public id!: string;
  public predecessorId!: string;
  public successorId!: string;
  public dependencyType!: DependencyType;
  public lagTime!: number;
  public isActive!: boolean;
  public description?: string;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public readonly predecessor?: ProjectTask;
  public readonly successor?: ProjectTask;

  // Associations are handled via service layer

  // Helper methods
  public get hasLag(): boolean {
    return this.lagTime > 0;
  }

  public get hasLead(): boolean {
    return this.lagTime < 0;
  }

  public get lagDescription(): string {
    if (this.lagTime === 0) return 'No lag/lead time';
    if (this.lagTime > 0) return `${this.lagTime} day(s) lag`;
    return `${Math.abs(this.lagTime)} day(s) lead`;
  }

  public get typeDescription(): string {
    switch (this.dependencyType) {
      case DependencyType.FINISH_TO_START:
        return 'Finish-to-Start (FS)';
      case DependencyType.START_TO_START:
        return 'Start-to-Start (SS)';
      case DependencyType.FINISH_TO_FINISH:
        return 'Finish-to-Finish (FF)';
      case DependencyType.START_TO_FINISH:
        return 'Start-to-Finish (SF)';
      default:
        return 'Unknown';
    }
  }

  /**
   * Calculate the earliest possible date for the successor task
   * based on the predecessor task and dependency type
   */
  public calculateSuccessorConstraint(predecessorStartDate: Date, predecessorEndDate: Date): Date {
    let constraintDate: Date;

    switch (this.dependencyType) {
      case DependencyType.FINISH_TO_START:
        constraintDate = new Date(predecessorEndDate);
        break;
      case DependencyType.START_TO_START:
        constraintDate = new Date(predecessorStartDate);
        break;
      case DependencyType.FINISH_TO_FINISH:
        constraintDate = new Date(predecessorEndDate);
        break;
      case DependencyType.START_TO_FINISH:
        constraintDate = new Date(predecessorStartDate);
        break;
      default:
        constraintDate = new Date(predecessorEndDate);
    }

    // Apply lag/lead time
    if (this.lagTime !== 0) {
      constraintDate.setDate(constraintDate.getDate() + this.lagTime);
    }

    return constraintDate;
  }

  /**
   * Validate that this dependency doesn't create a circular reference
   */
  public static async validateNoCycle(predecessorId: string, successorId: string): Promise<boolean> {
    if (predecessorId === successorId) {
      return false; // Direct self-dependency
    }

    // Check for cycles using breadth-first search
    const db = DatabaseService.getInstance();
    const visited = new Set<string>();
    const queue = [successorId];

    while (queue.length > 0) {
      const currentTaskId = queue.shift()!;
      
      if (visited.has(currentTaskId)) {
        continue;
      }
      
      visited.add(currentTaskId);

      // If we reach the predecessor, we have a cycle
      if (currentTaskId === predecessorId) {
        return false;
      }

      // Get all successors of the current task
      const query = `
        SELECT successor_id FROM task_dependencies 
        WHERE predecessor_id = $1 AND is_active = true
      `;
      const result = await db.query(query, [currentTaskId]);

      for (const row of result.rows) {
        if (!visited.has(row.successor_id)) {
          queue.push(row.successor_id);
        }
      }
    }

    return true; // No cycle detected
  }
}

// Note: Database operations handled via service layer using PostgreSQL pool
// TaskDependency model initialization is managed through database migrations