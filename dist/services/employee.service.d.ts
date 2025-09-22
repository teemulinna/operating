import { DatabaseService } from '../database/database.service';
import { Employee, CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeQuery, PaginatedResponse, BulkImportResponse } from '../types/employee.types';
export declare class EmployeeService {
    private db;
    constructor(db?: DatabaseService);
    static create(): Promise<EmployeeService>;
    getEmployees(query: EmployeeQuery): Promise<PaginatedResponse<Employee>>;
    getEmployeeById(id: string): Promise<Employee | null>;
    getEmployeeByEmail(email: string): Promise<Employee | null>;
    createEmployee(employeeData: CreateEmployeeRequest): Promise<Employee>;
    updateEmployee(id: string, updateData: UpdateEmployeeRequest): Promise<Employee>;
    checkEmployeeDeletionConstraints(id: string): Promise<{
        canDelete: boolean;
        blockers: string[];
        warnings: string[];
    }>;
    deleteEmployee(id: string): Promise<void>;
    bulkImportEmployees(employees: CreateEmployeeRequest[]): Promise<BulkImportResponse>;
    getEmployeeAnalytics(): Promise<{
        totalEmployees: number;
        employeesByDepartment: any[];
        averageSalaryByDepartment: any[];
        topSkills: any[];
        hiringTrends: any[];
    }>;
}
//# sourceMappingURL=employee.service.d.ts.map