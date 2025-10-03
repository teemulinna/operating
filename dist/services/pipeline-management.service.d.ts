import { PipelineProject, CreatePipelineProjectRequest, PipelineFilters, PipelineAnalytics } from '../types/pipeline';
export declare class PipelineManagementService {
    private db;
    constructor();
    createPipelineProject(data: CreatePipelineProjectRequest): Promise<PipelineProject>;
    getPipelineProjects(filters: PipelineFilters): Promise<{
        projects: PipelineProject[];
        total: number;
    }>;
    getPipelineProject(id: string): Promise<PipelineProject | null>;
    updatePipelineProject(id: string, updateData: Partial<CreatePipelineProjectRequest>): Promise<PipelineProject>;
    deletePipelineProject(id: string): Promise<void>;
    getPipelineAnalytics(filters: Partial<PipelineFilters>): Promise<PipelineAnalytics & {
        averageProbability: number;
        projectsByStage: Record<string, number>;
        winRate: number;
        averageCycleTime: number;
        topClients: Array<{
            name: string;
            value: number;
            count: number;
        }>;
    }>;
    private mapRowToPipelineProject;
    getWinLossRates(filters?: Partial<PipelineFilters>): Promise<{
        winRate: number;
        lossRate: number;
        totalDeals: number;
    }>;
    getPipelineHistory(startDate: Date, endDate: Date): Promise<Array<{
        date: Date;
        stage: string;
        count: number;
        value: number;
    }>>;
    getPipelineMetrics(): Promise<{
        totalProjects: number;
        totalValue: number;
        avgProbability: number;
        stageDistribution: Record<string, number>;
    }>;
    private camelToSnake;
    private calculateAverageCycleTime;
}
//# sourceMappingURL=pipeline-management.service.d.ts.map