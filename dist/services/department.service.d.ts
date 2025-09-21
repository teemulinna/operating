import { DatabaseService } from '../database/database.service';
import { Department } from '../types/employee.types';
export declare class DepartmentService {
    private db;
    constructor(db?: DatabaseService);
    static create(): Promise<DepartmentService>;
    getDepartments(): Promise<Department[]>;
    getDepartmentById(id: number): Promise<Department | null>;
    getDepartmentByName(name: string): Promise<Department | null>;
    createDepartment(departmentData: Partial<Department>): Promise<Department>;
    updateDepartment(id: number, updateData: Partial<Department>): Promise<Department>;
    deleteDepartment(id: number): Promise<void>;
    getDepartmentEmployeeCount(id: number): Promise<number>;
    getDepartmentEmployees(id: number): Promise<any[]>;
    getDepartmentAnalytics(): Promise<{
        departmentOverview: any[];
        departmentGrowth: any[];
        skillsByDepartment: any[];
    }>;
}
//# sourceMappingURL=department.service.d.ts.map