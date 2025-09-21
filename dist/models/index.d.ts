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
import { BudgetModel } from './Budget';
import { ResourceCostModel } from './ResourceCost';
export { DepartmentModel, SkillModel, EmployeeModel, EmployeeSkillModel, CapacityHistoryModel, ProjectModel, ResourceAllocationModel, WorkingAllocationModel, SkillRequirementModel, ProjectTask, TaskDependency, BudgetModel, ResourceCostModel };
export declare function initializeModels(pool: Pool): void;
export * from '../types';
export * from '../types/task-dependency.types';
//# sourceMappingURL=index.d.ts.map