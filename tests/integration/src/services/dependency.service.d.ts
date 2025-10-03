export const __esModule: boolean;
export class DependencyService {
    db: any;
    createDependency(): Promise<void>;
    validateDependencies(projectId: any): Promise<{
        isValid: boolean;
        errors: never[];
        warnings: string[];
    }>;
    calculateCriticalPath(projectId: any): Promise<void>;
    updateSchedule(): Promise<void>;
    detectScheduleConflicts(projectId: any): Promise<never[]>;
    getDependencyGraph(projectId: any): Promise<{
        nodes: never[];
        edges: never[];
    }>;
}
//# sourceMappingURL=dependency.service.d.ts.map