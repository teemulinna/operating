interface AllocationTemplateData {
    name: string;
    description?: string;
    category: TemplateCategory;
    tags?: string[];
    visibility?: VisibilityLevel;
    default_duration_weeks?: number;
    default_budget_range?: [number, number];
    default_priority?: string;
    organization_id?: string;
}
interface TemplateRoleData {
    role_name: string;
    description?: string;
    required_skills?: string[];
    minimum_experience_level?: string;
    preferred_skills?: string[];
    planned_allocation_percentage: number;
    estimated_hours_per_week?: number;
    duration_weeks?: number;
    hourly_rate_range?: [number, number];
    max_assignments?: number;
    is_critical?: boolean;
    can_be_remote?: boolean;
    display_order?: number;
}
interface TemplateMilestoneData {
    name: string;
    description?: string;
    week_offset: number;
    duration_weeks?: number;
    required_roles?: string[];
    deliverables?: string[];
    depends_on?: string[];
    is_critical?: boolean;
    display_order?: number;
}
interface TemplateFilters {
    category?: string;
    visibility?: string;
    status?: string;
    tags?: string[];
    search?: string;
    created_by?: string;
    organization_id?: string;
}
interface TemplateApplyOptions {
    project_id: number;
    customizations?: TemplateCustomizations;
    start_date: string;
    scale_duration?: number;
    budget_override?: number;
    skip_roles?: string[];
}
interface TemplateCustomizations {
    role_modifications?: Record<string, Partial<TemplateRoleData>>;
    milestone_modifications?: Record<string, Partial<TemplateMilestoneData>>;
    metadata_modifications?: Record<string, any>;
}
type TemplateCategory = 'web_development' | 'mobile_app' | 'consulting' | 'research' | 'data_analytics' | 'devops' | 'design' | 'marketing' | 'custom';
type VisibilityLevel = 'private' | 'organization' | 'public';
export declare class AllocationTemplatesService {
    private db;
    private assignmentService;
    constructor();
    createTemplate(templateData: AllocationTemplateData, createdBy: string): Promise<any>;
    getTemplates(filters: TemplateFilters, userId: string, pagination: any): Promise<any>;
    getTemplateById(templateId: string, userId: string): Promise<any>;
    updateTemplate(templateId: string, updateData: Partial<AllocationTemplateData>, userId: string): Promise<any>;
    deleteTemplate(templateId: string, userId: string): Promise<void>;
    addTemplateRole(templateId: string, roleData: TemplateRoleData, userId: string): Promise<any>;
    applyTemplateToProject(templateId: string, options: TemplateApplyOptions, userId: string): Promise<any>;
    getPopularTemplates(limit?: number): Promise<any[]>;
    getTemplateCategories(): Promise<any[]>;
    cloneTemplate(templateId: string, newName: string, userId: string): Promise<any>;
    rateTemplate(templateId: string, projectId: number, rating: number, feedback: string, userId: string): Promise<void>;
}
export {};
//# sourceMappingURL=allocation-templates.service.d.ts.map