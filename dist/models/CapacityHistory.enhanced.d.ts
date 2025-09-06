import { Pool } from 'pg';
import { CapacityHistory, CreateCapacityHistoryInput, UpdateCapacityHistoryInput, CapacityFilters } from '../types';
export declare class CapacityHistoryModel {
    private static pool;
    static initialize(pool: Pool): void;
    static create(input: CreateCapacityHistoryInput): Promise<CapacityHistory>;
    static findById(id: string): Promise<CapacityHistory | null>;
    static findByEmployee(employeeId: string, dateFrom?: Date, dateTo?: Date): Promise<CapacityHistory[]>;
    static findByEmployeeAndDate(employeeId: string, date: Date): Promise<CapacityHistory | null>;
    static findAll(filters?: CapacityFilters): Promise<CapacityHistory[]>;
    static update(id: string, updates: UpdateCapacityHistoryInput): Promise<CapacityHistory>;
    static delete(id: string): Promise<CapacityHistory>;
    static bulkCreate(entries: CreateCapacityHistoryInput[]): Promise<CapacityHistory[]>;
    static getUtilizationSummary(employeeId?: string, dateFrom?: Date, dateTo?: Date): Promise<{
        averageUtilization: number;
        totalAvailableHours: number;
        totalAllocatedHours: number;
        peakUtilization: number;
        lowUtilization: number;
        entriesCount: number;
    }>;
    static getTeamCapacityTrends(departmentId?: string, dateFrom?: Date, dateTo?: Date): Promise<Array<{
        date: Date;
        averageUtilization: number;
        totalAvailableHours: number;
        totalAllocatedHours: number;
        employeeCount: number;
    }>>;
    static getOverutilizedEmployees(threshold?: number, dateFrom?: Date, dateTo?: Date): Promise<Array<{
        employeeId: string;
        employeeName: string;
        averageUtilization: number;
        peakUtilization: number;
        daysOverThreshold: number;
    }>>;
    static getDepartmentCapacityByName(departmentName: string, dateFrom?: Date, dateTo?: Date): Promise<Array<{
        date: Date;
        departmentName: string;
        averageUtilization: number;
        totalAvailableHours: number;
        totalAllocatedHours: number;
        employeeCount: number;
    }>>;
    static getCapacityWithEmployeeDetails(filters?: CapacityFilters, departmentId?: string): Promise<Array<{
        employeeId: string;
        employeeName: string;
        departmentName: string;
        date: Date;
        availableHours: number;
        allocatedHours: number;
        utilizationRate: number;
        notes: string;
        createdAt: Date;
    }>>;
    private static mapRow;
}
//# sourceMappingURL=CapacityHistory.enhanced.d.ts.map