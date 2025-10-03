export const __esModule: boolean;
export class AllocationTemplatesService {
    db: any;
    assignmentService: resource_assignment_service_1.ResourceAssignmentService;
    createTemplate(templateData: any, createdBy: any): Promise<any>;
    getTemplates(filters: any, userId: any, pagination: any): Promise<{
        templates: any;
        pagination: {
            currentPage: any;
            totalPages: number;
            totalItems: number;
            limit: any;
            hasNext: boolean;
            hasPrev: boolean;
        };
        total: number;
    }>;
    getTemplateById(templateId: any, userId: any): Promise<any>;
    updateTemplate(templateId: any, updateData: any, userId: any): Promise<any>;
    deleteTemplate(templateId: any, userId: any): Promise<void>;
    addTemplateRole(templateId: any, roleData: any, userId: any): Promise<any>;
    applyTemplateToProject(templateId: any, options: any, userId: any): Promise<{
        template_applied: any;
        project_id: any;
        roles_created: never[];
        assignments_created: never[];
        milestones_created: never[];
    }>;
    getPopularTemplates(limit?: number): Promise<any>;
    getTemplateCategories(): Promise<any>;
    cloneTemplate(templateId: any, newName: any, userId: any): Promise<any>;
    rateTemplate(templateId: any, projectId: any, rating: any, feedback: any, userId: any): Promise<void>;
}
import resource_assignment_service_1 = require("./resource-assignment.service");
//# sourceMappingURL=allocation-templates.service.d.ts.map