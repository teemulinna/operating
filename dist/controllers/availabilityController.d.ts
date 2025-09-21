import { Request, Response } from 'express';
import { Pool } from 'pg';
export interface EmployeeAvailability {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    position: string;
    departmentId: string;
    departmentName: string;
    status: 'available' | 'busy' | 'unavailable';
    capacity: number;
    currentProjects: number;
    availableHours: number;
    lastUpdated: string;
    isActive: boolean;
}
export interface DepartmentUtilization {
    departmentId: string;
    departmentName: string;
    totalEmployees: number;
    availableEmployees: number;
    busyEmployees: number;
    unavailableEmployees: number;
    averageCapacity: number;
    employees: EmployeeAvailability[];
}
export declare class AvailabilityController {
    private static pool;
    static initialize(pool: Pool): void;
    static getEmployeeStatuses(req: Request, res: Response): Promise<void>;
    static updateEmployeeStatus(req: Request, res: Response): Promise<void>;
    static getDepartmentUtilization(req: Request, res: Response): Promise<void>;
    static getRealTimeConfig(_req: Request, res: Response): Promise<void>;
    static getRealTimeStatus(_req: Request, res: Response): Promise<void>;
    static bulkUpdateAvailability(req: Request, res: Response): Promise<void>;
    private static mapAvailabilityRow;
}
//# sourceMappingURL=availabilityController.d.ts.map