import { Pool } from 'pg';
import { Department, CreateDepartmentInput, UpdateDepartmentInput, DepartmentWithEmployees } from '../types';
export declare class DepartmentModel {
    private static pool;
    static initialize(pool: Pool): void;
    static create(input: CreateDepartmentInput): Promise<Department>;
    static findById(id: string): Promise<Department | null>;
    static findByIdWithEmployees(id: string): Promise<DepartmentWithEmployees | null>;
    static findAll(filters?: {
        isActive?: boolean;
    }): Promise<Department[]>;
    static update(id: string, updates: UpdateDepartmentInput): Promise<Department>;
    static delete(id: string): Promise<Department>;
    static getStatistics(): Promise<{
        totalDepartments: number;
        activeDepartments: number;
        departmentsWithManagers: number;
        averageEmployeesPerDepartment: number;
    }>;
    private static mapRow;
}
//# sourceMappingURL=Department.d.ts.map