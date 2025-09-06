import { Pool } from 'pg';
import { DepartmentModel } from './Department';
import { SkillModel } from './Skill';
import { EmployeeModel } from './Employee';
import { EmployeeSkillModel } from './EmployeeSkill';
import { CapacityHistoryModel } from './CapacityHistory';
import { ProjectModel } from './project.model';
import { ResourceAllocationModel } from './ResourceAllocation';
import { SkillRequirementModel } from './SkillRequirement';

export { 
  DepartmentModel, 
  SkillModel, 
  EmployeeModel, 
  EmployeeSkillModel, 
  CapacityHistoryModel,
  ProjectModel,
  ResourceAllocationModel,
  SkillRequirementModel
};

export function initializeModels(pool: Pool): void {
  DepartmentModel.initialize(pool);
  SkillModel.initialize(pool);
  EmployeeModel.initialize(pool);
  EmployeeSkillModel.initialize(pool);
  CapacityHistoryModel.initialize(pool);
  ProjectModel.initialize(pool);
  ResourceAllocationModel.initialize(pool);
  SkillRequirementModel.initialize(pool);
}

// Re-export types for convenience
export * from '../types';
