import { Employee, CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeQuery, PaginatedResponse, BulkImportResponse } from '../types/employee.types';
export declare class EmployeeService {
    private db;
    constructor();
    getEmployees(query: EmployeeQuery): Promise<PaginatedResponse<Employee>>;
    getEmployeeById(id: number): Promise<Employee | null>;
    getEmployeeByEmail(email: string): Promise<Employee | null>;
    createEmployee(employeeData: CreateEmployeeRequest): Promise<Employee>;
    updateEmployee(id: number, updateData: UpdateEmployeeRequest): Promise<Employee>;
    deleteEmployee(id: number): Promise<void>;
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