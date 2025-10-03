export const __esModule: boolean;
export class ScheduleManagementService {
    dependencyService: dependency_service_1.DependencyService;
    optimizeSchedule(projectId: any, constraints: any, transaction: any): Promise<void>;
    rebalanceResources(projectId: any, options: {} | undefined, transaction: any): Promise<void>;
    generateScheduleRecommendations(projectId: any, transaction: any): Promise<void>;
    optimizeTaskSchedule(task: any, allTasks: any, constraints: any, t: any): Promise<any>;
    calculateOptimalResourceAllocation(): {};
    findOptimalSchedule(): {};
    validateScheduleConstraints(): boolean;
}
import dependency_service_1 = require("./dependency.service");
//# sourceMappingURL=schedule-management.service.d.ts.map