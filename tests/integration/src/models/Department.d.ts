export const __esModule: boolean;
export class DepartmentModel {
    static initialize(pool: any): void;
    static create(input: any): Promise<{
        id: any;
        name: any;
        description: any;
        managerId: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static findById(id: any): Promise<{
        id: any;
        name: any;
        description: any;
        managerId: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    static findByIdWithEmployees(id: any): Promise<{
        employees: any;
        manager: any;
        id: any;
        name: any;
        description: any;
        managerId: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    static findAll(filters?: {}): Promise<any>;
    static update(id: any, updates: any): Promise<{
        id: any;
        name: any;
        description: any;
        managerId: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static delete(id: any): Promise<{
        id: any;
        name: any;
        description: any;
        managerId: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static getStatistics(): Promise<{
        totalDepartments: number;
        activeDepartments: number;
        departmentsWithManagers: number;
        averageEmployeesPerDepartment: number;
    }>;
    static mapRow(row: any): {
        id: any;
        name: any;
        description: any;
        managerId: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    };
}
//# sourceMappingURL=Department.d.ts.map