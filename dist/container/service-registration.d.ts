import { DatabaseService } from '../database/database.service';
import { DepartmentService } from '../services/department.service';
import { EmployeeService } from '../services/employee.service';
import { SkillService } from '../services/skill.service';
import { AllocationServiceWrapper } from '../services/allocation-service-wrapper';
import { DependencyService } from '../services/dependency.service';
import { ScheduleManagementService } from '../services/schedule-management.service';
import { CacheService } from '../services/cache.service';
import { WebSocketService } from '../websocket/websocket.service';
import { AvailabilityPatternService } from '../services/availability-pattern.service';
import { ScenarioPlanner } from '../services/scenario-planner.service';
import { ResourceAnalyticsService } from '../services/resource-analytics.service';
import { HeatMapService } from '../services/heat-map.service';
export declare const SERVICE_NAMES: {
    readonly DATABASE: "DatabaseService";
    readonly DEPARTMENT: "DepartmentService";
    readonly EMPLOYEE: "EmployeeService";
    readonly SKILL: "SkillService";
    readonly ALLOCATION: "AllocationService";
    readonly DEPENDENCY: "DependencyService";
    readonly SCHEDULE_MANAGEMENT: "ScheduleManagementService";
    readonly CACHE: "CacheService";
    readonly WEBSOCKET: "WebSocketService";
    readonly AVAILABILITY_PATTERN: "AvailabilityPatternService";
    readonly SCENARIO_PLANNER: "ScenarioPlanner";
    readonly RESOURCE_ANALYTICS: "ResourceAnalyticsService";
    readonly HEAT_MAP: "HeatMapService";
};
export declare function configureServices(): void;
export declare const Services: {
    database: () => DatabaseService;
    department: () => DepartmentService;
    employee: () => EmployeeService;
    skill: () => SkillService;
    allocation: () => AllocationServiceWrapper;
    dependency: () => DependencyService;
    scheduleManagement: () => ScheduleManagementService;
    cache: () => CacheService;
    websocket: () => WebSocketService;
    availabilityPattern: () => AvailabilityPatternService;
    scenarioPlanner: () => ScenarioPlanner;
    resourceAnalytics: () => ResourceAnalyticsService;
    heatMap: () => HeatMapService;
};
export declare function initializeServices(): Promise<void>;
export declare function shutdownServices(): Promise<void>;
export declare function checkServiceHealth(): Promise<{
    database: boolean;
    services: boolean;
    overall: boolean;
}>;
export declare function validateServiceInitialization(): Promise<void>;
export declare function getContainerStatus(): {
    registeredServices: string[];
    totalServices: number;
    requiredServices: ("DatabaseService" | "DepartmentService" | "EmployeeService" | "SkillService" | "AllocationService" | "DependencyService" | "ScheduleManagementService" | "CacheService" | "WebSocketService" | "AvailabilityPatternService" | "ScenarioPlanner" | "ResourceAnalyticsService" | "HeatMapService")[];
    allServicesRegistered: boolean;
};
//# sourceMappingURL=service-registration.d.ts.map