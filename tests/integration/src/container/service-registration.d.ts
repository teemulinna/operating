export const __esModule: boolean;
export namespace SERVICE_NAMES {
    let DATABASE: string;
    let DEPARTMENT: string;
    let EMPLOYEE: string;
    let SKILL: string;
    let ALLOCATION: string;
    let DEPENDENCY: string;
    let SCHEDULE_MANAGEMENT: string;
    let CACHE: string;
    let WEBSOCKET: string;
    let AVAILABILITY_PATTERN: string;
    let SCENARIO_PLANNER: string;
    let RESOURCE_ANALYTICS: string;
    let HEAT_MAP: string;
}
export namespace Services {
    function database(): any;
    function department(): any;
    function employee(): any;
    function skill(): any;
    function allocation(): any;
    function dependency(): any;
    function scheduleManagement(): any;
    function cache(): any;
    function websocket(): any;
    function availabilityPattern(): any;
    function scenarioPlanner(): any;
    function resourceAnalytics(): any;
    function heatMap(): any;
}
export function configureServices(): void;
export function initializeServices(): Promise<void>;
export function shutdownServices(): Promise<void>;
export function checkServiceHealth(): Promise<{
    database: any;
    services: boolean;
    overall: any;
}>;
export function validateServiceInitialization(): Promise<void>;
export function getContainerStatus(): {
    registeredServices: any;
    totalServices: any;
    requiredServices: string[];
    allServicesRegistered: boolean;
};
//# sourceMappingURL=service-registration.d.ts.map