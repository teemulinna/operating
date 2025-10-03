import { Request, Response, NextFunction } from 'express';
import { DatabaseService } from '../database/database.service';
import { DepartmentService } from '../services/department.service';
import { EmployeeService } from '../services/employee.service';
import { SkillService } from '../services/skill.service';
import { AllocationServiceWrapper } from '../services/allocation-service-wrapper';
import { CacheService } from '../services/cache.service';
import { WebSocketService } from '../websocket/websocket.service';
import { AvailabilityPatternService } from '../services/availability-pattern.service';
import { ScenarioPlanner } from '../services/scenario-planner.service';
import { ResourceAnalyticsService } from '../services/resource-analytics.service';
import { HeatMapService } from '../services/heat-map.service';
export interface RequestWithServices extends Request {
    services: {
        database: DatabaseService;
        department: DepartmentService;
        employee: EmployeeService;
        skill: SkillService;
        allocation: AllocationServiceWrapper;
        cache: CacheService;
        websocket: WebSocketService;
        availabilityPattern: AvailabilityPatternService;
        scenarioPlanner: ScenarioPlanner;
        resourceAnalytics: ResourceAnalyticsService;
        heatMap: HeatMapService;
        db?: any;
        cacheService?: CacheService;
        wsService?: WebSocketService;
        availabilityService?: AvailabilityPatternService;
    };
}
export declare const serviceInjectionMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const serviceHealthCheckMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const transactionMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const serviceMonitoringMiddleware: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=service-injection.middleware.d.ts.map