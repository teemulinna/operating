export const __esModule: boolean;
export class EmployeeModel {
    static initialize(pool: any): void;
    static create(input: any): Promise<{
        id: any;
        firstName: any;
        lastName: any;
        email: any;
        departmentId: any;
        position: any;
        hireDate: any;
        isActive: any;
        weeklyCapacity: number;
        salary: number | undefined;
        createdAt: any;
        updatedAt: any;
    }>;
    static findById(id: any): Promise<{
        id: any;
        firstName: any;
        lastName: any;
        email: any;
        departmentId: any;
        position: any;
        hireDate: any;
        isActive: any;
        weeklyCapacity: number;
        salary: number | undefined;
        createdAt: any;
        updatedAt: any;
    } | null>;
    static findByIdWithDetails(id: any): Promise<{
        department: any;
        skills: any;
        id: any;
        firstName: any;
        lastName: any;
        email: any;
        departmentId: any;
        position: any;
        hireDate: any;
        isActive: any;
        weeklyCapacity: number;
        salary: number | undefined;
        createdAt: any;
        updatedAt: any;
    } | null>;
    static findByEmail(email: any): Promise<{
        id: any;
        firstName: any;
        lastName: any;
        email: any;
        departmentId: any;
        position: any;
        hireDate: any;
        isActive: any;
        weeklyCapacity: number;
        salary: number | undefined;
        createdAt: any;
        updatedAt: any;
    } | null>;
    static findAll(filters?: {}, page?: number, limit?: number): Promise<{
        data: any;
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    static update(id: any, updates: any): Promise<{
        id: any;
        firstName: any;
        lastName: any;
        email: any;
        departmentId: any;
        position: any;
        hireDate: any;
        isActive: any;
        weeklyCapacity: number;
        salary: number | undefined;
        createdAt: any;
        updatedAt: any;
    }>;
    static delete(id: any): Promise<{
        id: any;
        firstName: any;
        lastName: any;
        email: any;
        departmentId: any;
        position: any;
        hireDate: any;
        isActive: any;
        weeklyCapacity: number;
        salary: number | undefined;
        createdAt: any;
        updatedAt: any;
    }>;
    static search(searchTerm: any, filters?: {}, page?: number, limit?: number): Promise<{
        data: any;
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    static getStatistics(): Promise<{
        totalEmployees: number;
        activeEmployees: number;
        employeesByDepartment: any;
        averageTenure: number;
        newestEmployee: {
            id: any;
            firstName: any;
            lastName: any;
            email: any;
            departmentId: any;
            position: any;
            hireDate: any;
            isActive: any;
            weeklyCapacity: number;
            salary: number | undefined;
            createdAt: any;
            updatedAt: any;
        } | null;
    }>;
    static mapRow(row: any): {
        id: any;
        firstName: any;
        lastName: any;
        email: any;
        departmentId: any;
        position: any;
        hireDate: any;
        isActive: any;
        weeklyCapacity: number;
        salary: number | undefined;
        createdAt: any;
        updatedAt: any;
    };
}
export namespace EmployeeModel {
    let pool: any;
    let db: any;
}
//# sourceMappingURL=Employee.d.ts.map