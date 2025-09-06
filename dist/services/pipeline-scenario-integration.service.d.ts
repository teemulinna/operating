import { PipelineStage, ResourceDemandForecast } from '../types/pipeline';
import { Scenario } from '../../frontend/src/types/scenario';
export declare class PipelineScenarioIntegrationService {
    private db;
    private pipelineService;
    private scenarioService;
    constructor();
    createScenarioFromPipeline(request: {
        name: string;
        description?: string;
        pipelineProjectIds: string[];
        conversionRates?: Record<PipelineStage, number>;
        forecastPeriodMonths?: number;
    }): Promise<Scenario>;
    syncProjectToScenarios(projectId: string, scenarioIds?: string[]): Promise<void>;
    generateResourceForecast(options?: {
        includeActiveScenariosOnly?: boolean;
        forecastMonths?: number;
        confidenceThreshold?: number;
    }): Promise<ResourceDemandForecast[]>;
    runWhatIfAnalysis(request: {
        pipelineProjectIds: string[];
        conversionScenarios: {
            name: string;
            conversionRates: Record<PipelineStage, number>;
        }[];
        baselineScenarioId?: string;
    }): Promise<{
        scenarios: Scenario[];
        comparison: {
            totalResourceDemand: Record<string, number>;
            skillGaps: Record<string, any[]>;
            costAnalysis: Record<string, number>;
        };
    }>;
    private createScenarioAllocationsFromProject;
    private updateScenarioAllocationsFromProject;
    private calculateCombinedResourceForecast;
    private calculatePipelineDemandForPeriod;
    private calculateScenarioDemandForPeriod;
    private getCurrentSupply;
    private calculateForecastConfidence;
    private compareScenarios;
    private calculateEstimatedHours;
}
//# sourceMappingURL=pipeline-scenario-integration.service.d.ts.map