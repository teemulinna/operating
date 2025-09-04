// Database exports
export { db } from './connection';
export type { DatabaseConfig } from './connection';

// Model exports
export { BaseModel } from '../models/BaseModel';
export type { BaseEntity, QueryOptions, WhereClause, AuditFields } from '../models/BaseModel';

// Department
export { departmentModel, DepartmentModel } from '../models/Department';
export type { 
  Department, 
  DepartmentWithManager, 
  DepartmentWithEmployeeCount,
  CreateDepartmentData,
  UpdateDepartmentData 
} from '../models/Department';

// Employee
export { employeeModel, EmployeeModel } from '../models/Employee';
export type { 
  Employee, 
  EmployeeWithDepartment,
  EmployeeWithManager,
  EmployeeWithSkills,
  EmployeeDetails,
  EmploymentType,
  CreateEmployeeData,
  UpdateEmployeeData 
} from '../models/Employee';

// Skill
export { skillModel, SkillModel } from '../models/Skill';
export type { 
  Skill, 
  SkillWithEmployeeCount,
  CreateSkillData,
  UpdateSkillData 
} from '../models/Skill';

// Employee Skill
export { employeeSkillModel, EmployeeSkillModel } from '../models/EmployeeSkill';
export type { 
  EmployeeSkill, 
  EmployeeSkillWithDetails,
  ProficiencyLevel,
  SkillProficiencyDistribution,
  CreateEmployeeSkillData,
  UpdateEmployeeSkillData 
} from '../models/EmployeeSkill';

// Capacity History
export { capacityHistoryModel, CapacityHistoryModel } from '../models/CapacityHistory';
export type { 
  CapacityHistory, 
  CapacityHistoryWithEmployee,
  CapacityTrend,
  CreateCapacityHistoryData,
  UpdateCapacityHistoryData 
} from '../models/CapacityHistory';

// Database initialization and migration utilities
export async function initializeDatabase(): Promise<void> {
  const { db } = await import('./connection');
  try {
    await db.connect();
    console.log('Database connection established successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  const { db } = await import('./connection');
  try {
    await db.disconnect();
    console.log('Database connection closed successfully');
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
}

export async function checkDatabaseHealth(): Promise<{
  status: string;
  timestamp: Date;
  latency: number;
}> {
  const { db } = await import('./connection');
  return await db.healthCheck();
}