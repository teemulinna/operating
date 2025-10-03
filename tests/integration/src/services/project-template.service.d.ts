export const __esModule: boolean;
export class ProjectTemplateService {
    db: any;
    createTemplate(options: any, createdById: any): Promise<void>;
    createTemplateFromProject(projectId: any, templateName: any, createdById: any): Promise<void>;
    cloneProject(projectId: any, newName: any, createdById: any): Promise<void>;
    searchTemplates(filters: any, page: any, limit: any): Promise<{
        templates: never[];
        total: number;
    }>;
    getPopularTemplates(limit: any): Promise<never[]>;
    getTemplateCategories(): Promise<never[]>;
    rateTemplate(templateId: any, rating: any, userId: any): Promise<void>;
    exportTemplate(templateId: any): Promise<void>;
    importTemplate(templateData: any, createdById: any): Promise<void>;
    createFromProject(projectId: any, templateName: any, createdById: any): Promise<void>;
    applyTemplate(options: any, createdById: any): Promise<void>;
    getTemplates(categoryFilter: any): Promise<never[]>;
    getTemplateById(templateId: any): Promise<void>;
    updateTemplate(templateId: any, updates: any): Promise<void>;
    deleteTemplate(templateId: any): Promise<void>;
    assessComplexity(taskCount: any, duration: any): "low" | "medium" | "high";
}
//# sourceMappingURL=project-template.service.d.ts.map