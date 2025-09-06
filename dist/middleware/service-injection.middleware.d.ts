import { Request, Response, NextFunction } from 'express';
import { DatabaseService } from '../database/database.service';
import { DepartmentService } from '../services/department.service';
import { EmployeeService } from '../services/employee.service';
import { SkillService } from '../services/skill.service';
import { AllocationService } from '../services/allocation.service';
export interface RequestWithServices extends Request {
    services: {
        database: DatabaseService;
        department: DepartmentService;
        employee: EmployeeService;
        skill: SkillService;
        allocation: AllocationService;
    };
}
export declare const serviceInjectionMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const serviceHealthCheckMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const transactionMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const serviceMonitoringMiddleware: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=service-injection.middleware.d.ts.map