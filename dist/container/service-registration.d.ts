import { DatabaseService } from '../database/database.service';
import { DepartmentService } from '../services/department.service';
import { EmployeeService } from '../services/employee.service';
import { SkillService } from '../services/skill.service';
import { AllocationService } from '../services/allocation.service';
export declare const SERVICE_NAMES: {
    readonly DATABASE: "DatabaseService";
    readonly DEPARTMENT: "DepartmentService";
    readonly EMPLOYEE: "EmployeeService";
    readonly SKILL: "SkillService";
    readonly ALLOCATION: "AllocationService";
};
export declare function configureServices(): void;
export declare const Services: {
    database: () => DatabaseService;
    department: () => DepartmentService;
    employee: () => EmployeeService;
    skill: () => SkillService;
    allocation: () => AllocationService;
};
export declare function initializeServices(): Promise<void>;
export declare function shutdownServices(): Promise<void>;
export declare function checkServiceHealth(): Promise<{
    database: boolean;
    services: boolean;
    overall: boolean;
}>;
export declare function getContainerStatus(): {
    registeredServices: string[];
    totalServices: number;
    requiredServices: ("DatabaseService" | "DepartmentService" | "EmployeeService" | "SkillService" | "AllocationService")[];
    allServicesRegistered: boolean;
};
//# sourceMappingURL=service-registration.d.ts.map