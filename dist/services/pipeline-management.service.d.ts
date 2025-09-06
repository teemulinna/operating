import { PipelineProject, CreatePipelineProjectRequest, UpdatePipelineProjectRequest, PipelineFilters, PipelineAnalytics } from '../types/pipeline';
export declare class PipelineManagementService {
    private db;
    constructor();
    createPipelineProject(request: CreatePipelineProjectRequest): Promise<PipelineProject>;
    getPipelineProject(id: string): Promise<PipelineProject>;
    getPipelineProjects(filters?: PipelineFilters): Promise<{
        projects: PipelineProject[];
        total: number;
    }>;
    updatePipelineProject(request: UpdatePipelineProjectRequest): Promise<PipelineProject>;
    deletePipelineProject(id: string): Promise<void>;
    getPipelineAnalytics(filters?: PipelineFilters): Promise<PipelineAnalytics>;
    private getResourceDemandForecast;
    private getWinLossAnalysis;
    private getPipelineTrends;
    private transformPipelineProject;
    private transformPipelineProjectSummary;
}
//# sourceMappingURL=pipeline-management.service.d.ts.map