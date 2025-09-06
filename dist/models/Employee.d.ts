import { Pool } from 'pg';
import { Employee, CreateEmployeeInput, UpdateEmployeeInput, EmployeeWithSkills, EmployeeFilters, PaginatedResponse } from '../types';
export declare class EmployeeModel {
    private static pool;
    static initialize(pool: Pool): void;
    static create(input: CreateEmployeeInput): Promise<Employee>;
    static findById(id: string): Promise<Employee | null>;
    static findByIdWithDetails(id: string): Promise<EmployeeWithSkills | null>;
    static findByEmail(email: string): Promise<Employee | null>;
    static findAll(filters?: EmployeeFilters, page?: number, limit?: number): Promise<PaginatedResponse<Employee>>;
    static update(id: string, updates: UpdateEmployeeInput): Promise<Employee>;
    static delete(id: string): Promise<Employee>;
    static search(searchTerm: string, filters?: EmployeeFilters, page?: number, limit?: number): Promise<PaginatedResponse<Employee>>;
    static getStatistics(): Promise<{
        totalEmployees: number;
        activeEmployees: number;
        employeesByDepartment: Array<{
            departmentName: string;
            count: number;
        }>;
        averageTenure: number;
        newestEmployee: Employee | null;
    }>;
    private static mapRow;
}
//# sourceMappingURL=Employee.d.ts.map