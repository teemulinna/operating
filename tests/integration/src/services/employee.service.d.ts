export const __esModule: boolean;
export class EmployeeService {
    static create(): Promise<EmployeeService>;
    constructor(db: any);
    db: any;
    getEmployees(query: any): Promise<{
        data: any;
        pagination: {
            currentPage: any;
            totalPages: number;
            totalItems: number;
            limit: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getEmployeeById(id: any): Promise<any>;
    getEmployeeByEmail(email: any): Promise<any>;
    createEmployee(employeeData: any): Promise<any>;
    updateEmployee(id: any, updateData: any): Promise<any>;
    checkEmployeeDeletionConstraints(id: any): Promise<{
        canDelete: boolean;
        blockers: string[];
        warnings: string[];
    }>;
    deleteEmployee(id: any): Promise<void>;
    bulkImportEmployees(employees: any): Promise<{
        imported: number;
        errors: never[];
        duplicates: number;
    }>;
    getEmployeeAnalytics(): Promise<{
        totalEmployees: number;
        employeesByDepartment: any;
        averageSalaryByDepartment: any;
        topSkills: any;
        hiringTrends: any;
    }>;
}
//# sourceMappingURL=employee.service.d.ts.map