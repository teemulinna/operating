import { DatabaseService } from '../../src/database/database.service';
import { EmployeeService } from '../../src/services/employee.service';
import { DepartmentService } from '../../src/services/department.service';
import { ProjectService } from '../../src/services/project.service';
import { AllocationService } from '../../src/services/allocation.service';
import { CreateEmployeeRequest, Department } from '../../src/types/employee.types';
import { CreateProjectInput } from '../../src/types';
export interface TestDatabaseConnection {
    db: DatabaseService;
    employeeService: EmployeeService;
    departmentService: DepartmentService;
    projectService: ProjectService;
    allocationService: AllocationService;
}
export declare function initializeTestDatabase(): Promise<TestDatabaseConnection>;
export declare function cleanupTestDatabase(db: DatabaseService): Promise<void>;
export declare function verifyEmployeeExists(db: DatabaseService, employeeId: string): Promise<boolean>;
export declare function verifyEmployeeData(db: DatabaseService, employeeId: string, expectedData: Partial<CreateEmployeeRequest>): Promise<void>;
export declare function createTestDepartment(departmentService: DepartmentService, overrides?: Partial<Department>): Promise<any>;
export declare function createTestProject(projectService: ProjectService, overrides?: Partial<CreateProjectInput>): Promise<any>;
export declare function createTestEmployee(employeeService: EmployeeService, departmentId: string, overrides?: Partial<CreateEmployeeRequest>): Promise<any>;
export declare function verifyDataPersistsAcrossRestart(recordId: number, tableName: string, idColumn?: string): Promise<void>;
export declare function testConcurrentFormSubmissions<T>(formDataArray: T[], submitFunction: (data: T) => Promise<any>): Promise<any[]>;
export declare function verifyReferentialIntegrity(db: DatabaseService, childTable: string, parentTable: string, foreignKeyColumn: string, parentIdColumn?: string): Promise<void>;
export declare function testTransactionRollback(db: DatabaseService, testOperations: (client: any) => Promise<void>): Promise<void>;
export declare function measureFormSubmissionPerformance<T>(formData: T, submitFunction: (data: T) => Promise<any>, maxExecutionTimeMs?: number): Promise<{
    result: any;
    executionTime: number;
}>;
export declare function verifyConstraintEnforcement(db: DatabaseService, tableName: string, invalidData: Record<string, any>, expectedErrorMessage?: string): Promise<void>;
export declare function countRecords(db: DatabaseService, tableName: string, whereClause?: string, params?: any[]): Promise<number>;
export declare function verifyAuditTrail(db: DatabaseService, tableName: string, recordId: number, idColumn?: string): Promise<void>;
export declare function testDatabaseValidation(db: DatabaseService, tableName: string, validData: Record<string, any>, invalidTestCases: Array<{
    name: string;
    data: Record<string, any>;
    expectedError?: string;
}>): Promise<void>;
export declare function testBulkOperationPerformance<T>(items: T[], batchSize: number, operationFunction: (batch: T[]) => Promise<void>, maxTotalTimeMs?: number): Promise<{
    totalTime: number;
    batches: number;
}>;
//# sourceMappingURL=database-test-helpers.d.ts.map