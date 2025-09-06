import { Pool } from 'pg';
import { DepartmentModel } from './Department';
import { SkillModel } from './Skill';
import { EmployeeModel } from './Employee';
import { EmployeeSkillModel } from './EmployeeSkill';
import { CapacityHistoryModel } from './CapacityHistory';
export { DepartmentModel, SkillModel, EmployeeModel, EmployeeSkillModel, CapacityHistoryModel };
export declare function initializeModels(pool: Pool): void;
export * from '../types';
//# sourceMappingURL=index.d.ts.map