import { Pool } from 'pg';
import { Scenario, ScenarioAllocation, ScenarioComparison, CreateScenarioRequest, UpdateScenarioRequest, CreateScenarioAllocationRequest, UpdateScenarioAllocationRequest, TimelineConflict, SkillGap, AllocationType, ScenarioStatus, ScenarioType } from '../types/scenario';
export declare class ScenarioPlanningService {
    private db;
    constructor(db: Pool);
    createScenario(request: CreateScenarioRequest): Promise<Scenario>;
    getScenario(id: string): Promise<Scenario | null>;
    listScenarios(filters?: {
        type?: ScenarioType;
        status?: ScenarioStatus;
        isTemplate?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<{
        scenarios: Scenario[];
        total: number;
    }>;
    updateScenario(request: UpdateScenarioRequest): Promise<Scenario>;
    deleteScenario(id: string): Promise<boolean>;
    createScenarioAllocation(request: CreateScenarioAllocationRequest): Promise<ScenarioAllocation>;
    getScenarioAllocations(scenarioId: string, filters?: {
        projectId?: string;
        employeeId?: string;
        allocationType?: AllocationType;
    }): Promise<ScenarioAllocation[]>;
    updateScenarioAllocation(request: UpdateScenarioAllocationRequest): Promise<ScenarioAllocation>;
    deleteScenarioAllocation(id: string): Promise<boolean>;
    compareScenarios(scenarioAId: string, scenarioBId: string): Promise<ScenarioComparison>;
    detectResourceConflicts(scenarioId: string): Promise<TimelineConflict[]>;
    analyzeSkillGaps(scenarioId: string): Promise<SkillGap[]>;
    duplicateScenario(scenarioId: string, newName: string): Promise<Scenario>;
    private validateAllocationCapacity;
    private getScenarioAllocationById;
    private generateComparisonMetrics;
    private transformScenario;
    private transformScenarioAllocation;
    private transformScenarioAllocationWithJoins;
    private transformScenarioComparison;
}
//# sourceMappingURL=scenario-planning.service.d.ts.map