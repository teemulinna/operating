import { PipelineProject, CreatePipelineProjectRequest, UpdatePipelineProjectRequest, PipelineFilters, PipelineAnalytics } from '../types/pipeline';
export declare class PipelineManagementService {
    private db;
    constructor();
    createPipelineProject(data: CreatePipelineProjectRequest): Promise<PipelineProject>;
    getPipelineProjects(filters: PipelineFilters): Promise<{
        projects: PipelineProject[];
        total: number;
    }>;
    getPipelineProject(id: string): Promise<PipelineProject | null>;
    updatePipelineProject(data: UpdatePipelineProjectRequest): Promise<PipelineProject>;
    deletePipelineProject(id: string): Promise<void>;
    getPipelineAnalytics(filters: Partial<PipelineFilters>): Promise<PipelineAnalytics>;
    private mapRowToPipelineProject;
    private camelToSnake;
}
//# sourceMappingURL=pipeline-management.service.d.ts.map