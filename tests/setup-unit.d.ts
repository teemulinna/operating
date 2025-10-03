import { DatabaseService } from '../src/database/database.service';
import { Department, Employee, Skill, CreateDepartmentInput, CreateEmployeeInput, CreateSkillInput } from '../src/types';
export declare const createTestDepartment: (input?: Partial<CreateDepartmentInput>) => Promise<Department>;
export declare const createTestSkill: (input?: Partial<CreateSkillInput>) => Promise<Skill>;
export declare const createTestEmployee: (departmentId: string, input?: Partial<CreateEmployeeInput>) => Promise<Employee>;
export declare const cleanupTestData: (patterns?: string[]) => Promise<void>;
export declare const getTestDatabase: () => DatabaseService;
export declare const resetTestSequences: () => Promise<void>;
export declare const ensureTestTables: () => Promise<void>;
//# sourceMappingURL=setup-unit.d.ts.map