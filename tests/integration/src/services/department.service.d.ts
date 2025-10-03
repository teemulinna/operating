export const __esModule: boolean;
export class DepartmentService {
    static create(): Promise<DepartmentService>;
    constructor(db: any);
    db: any;
    getDepartments(): Promise<any>;
    getDepartmentById(id: any): Promise<any>;
    getDepartmentByName(name: any): Promise<any>;
    createDepartment(departmentData: any): Promise<any>;
    updateDepartment(id: any, updateData: any): Promise<any>;
    deleteDepartment(id: any): Promise<void>;
    getDepartmentEmployeeCount(id: any): Promise<number>;
    getDepartmentEmployees(id: any): Promise<any>;
    getDepartmentAnalytics(): Promise<{
        departmentOverview: any;
        departmentGrowth: any;
        skillsByDepartment: any;
    }>;
}
//# sourceMappingURL=department.service.d.ts.map