export const __esModule: boolean;
export class CapacityHistoryModel {
    static initialize(pool: any): void;
    static create(input: any): Promise<{
        id: any;
        employeeId: any;
        date: any;
        availableHours: number;
        allocatedHours: number;
        utilizationRate: number;
        notes: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static findById(id: any): Promise<{
        id: any;
        employeeId: any;
        date: any;
        availableHours: number;
        allocatedHours: number;
        utilizationRate: number;
        notes: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    static findByEmployee(employeeId: any, dateFrom: any, dateTo: any): Promise<any>;
    static findByEmployeeAndDate(employeeId: any, date: any): Promise<{
        id: any;
        employeeId: any;
        date: any;
        availableHours: number;
        allocatedHours: number;
        utilizationRate: number;
        notes: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    static findAll(filters?: {}): Promise<any>;
    static update(id: any, updates: any): Promise<{
        id: any;
        employeeId: any;
        date: any;
        availableHours: number;
        allocatedHours: number;
        utilizationRate: number;
        notes: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static delete(id: any): Promise<{
        id: any;
        employeeId: any;
        date: any;
        availableHours: number;
        allocatedHours: number;
        utilizationRate: number;
        notes: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static bulkCreate(entries: any): Promise<{
        id: any;
        employeeId: any;
        date: any;
        availableHours: number;
        allocatedHours: number;
        utilizationRate: number;
        notes: any;
        createdAt: any;
        updatedAt: any;
    }[]>;
    static getUtilizationSummary(employeeId: any, dateFrom: any, dateTo: any): Promise<{
        averageUtilization: number;
        totalAvailableHours: number;
        totalAllocatedHours: number;
        peakUtilization: number;
        lowUtilization: number;
        entriesCount: number;
    }>;
    static getTeamCapacityTrends(departmentId: any, dateFrom: any, dateTo: any): Promise<any>;
    static getOverutilizedEmployees(threshold: number | undefined, dateFrom: any, dateTo: any): Promise<any>;
    static getDepartmentCapacityByName(departmentName: any, dateFrom: any, dateTo: any): Promise<any>;
    static getCapacityWithEmployeeDetails(filters: {} | undefined, departmentId: any): Promise<any>;
    static mapRow(row: any): {
        id: any;
        employeeId: any;
        date: any;
        availableHours: number;
        allocatedHours: number;
        utilizationRate: number;
        notes: any;
        createdAt: any;
        updatedAt: any;
    };
}
//# sourceMappingURL=CapacityHistory.d.ts.map