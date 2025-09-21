import { Pool } from 'pg';
import { DepartmentModel } from './Department';
import { SkillModel } from './Skill';
import { EmployeeModel } from './Employee';
import { EmployeeSkillModel } from './EmployeeSkill';
import { CapacityHistoryModel } from './CapacityHistory';
import { ProjectModel } from './project.model';
import { ResourceAllocationModel } from './ResourceAllocation';
import { WorkingAllocationModel } from './working-allocation.model';
import { SkillRequirementModel } from './SkillRequirement';
import { ProjectTask } from './ProjectTask';
import { TaskDependency } from './TaskDependency';
import { ProjectTemplateModel } from './ProjectTemplateModel';
import { BudgetModel } from './Budget';
import { ResourceCostModel } from './ResourceCost';

// Import services that need initialization
import { AnalyticsService } from '../services/analytics.service';
import { SkillService } from '../services/skill.service';

export { 
  DepartmentModel, 
  SkillModel, 
  EmployeeModel, 
  EmployeeSkillModel, 
  CapacityHistoryModel,
  ProjectModel,
  ResourceAllocationModel,
  WorkingAllocationModel,
  SkillRequirementModel,
  ProjectTask,
  TaskDependency,
  BudgetModel,
  ResourceCostModel
};

export function initializeModels(pool: Pool): void {
  // Initialize models
  DepartmentModel.initialize(pool);
  SkillModel.initialize(pool);
  EmployeeModel.initialize(pool);
  EmployeeSkillModel.initialize(pool);
  CapacityHistoryModel.initialize(pool);
  ProjectModel.initialize(pool);
  ResourceAllocationModel.initialize(pool);
  WorkingAllocationModel.initialize();
  SkillRequirementModel.initialize(pool);
  ProjectTemplateModel.initialize(pool);
  
  // Note: ProjectTask and TaskDependency models use PostgreSQL directly
  // No additional initialization needed as they use the same pool
  console.log('🔧 ProjectTask and TaskDependency models are ready (PostgreSQL direct)');
  
  // Initialize new budget models
  BudgetModel.initialize(pool);
  ResourceCostModel.initialize(pool);
  
  // Initialize services
  AnalyticsService.initialize(pool);
  SkillService.initialize(pool);
}

// Re-export types for convenience
export * from '../types';
export * from '../types/task-dependency.types';
