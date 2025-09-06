import { apiClient } from './api';

export interface AllocationTemplate {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  tags: string[];
  visibility: VisibilityLevel;
  status: TemplateStatus;
  created_by: string;
  creator_name: string;
  creator_email: string;
  organization_id?: string;
  default_duration_weeks?: number;
  default_budget_range?: [number, number];
  default_priority: string;
  usage_count: number;
  last_used_at?: string;
  version: number;
  parent_template_id?: string;
  created_at: string;
  updated_at: string;
  total_roles: number;
  total_milestones: number;
  roles: TemplateRole[];
  milestones: TemplateMilestone[];
  usage_stats: {
    total_uses: number;
    average_rating: number;
    positive_ratings: number;
    last_used?: string;
  };
}

export interface TemplateRole {
  id: string;
  template_id: string;
  role_name: string;
  description?: string;
  required_skills: string[];
  minimum_experience_level: ExperienceLevel;
  preferred_skills: string[];
  planned_allocation_percentage: number;
  estimated_hours_per_week?: number;
  duration_weeks?: number;
  hourly_rate_range?: [number, number];
  max_assignments: number;
  is_critical: boolean;
  can_be_remote: boolean;
  display_order: number;
  created_at: string;
  skills_details?: Array<{
    id: string;
    name: string;
    category: string;
  }>;
  preferred_skills_details?: Array<{
    id: string;
    name: string;
    category: string;
  }>;
}

export interface TemplateMilestone {
  id: string;
  template_id: string;
  name: string;
  description?: string;
  week_offset: number;
  duration_weeks: number;
  required_roles: string[];
  deliverables: string[];
  depends_on: string[];
  is_critical: boolean;
  display_order: number;
  created_at: string;
}

export interface CreateTemplateRequest {
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

export interface CreateTemplateRoleRequest {
  role_name: string;
  description?: string;
  required_skills?: string[];
  minimum_experience_level?: ExperienceLevel;
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

export interface TemplateFilters {
  category?: string;
  visibility?: string;
  status?: string;
  tags?: string[];
  search?: string;
  created_by?: string;
  organization_id?: string;
  page?: number;
  limit?: number;
}

export interface ApplyTemplateRequest {
  project_id: number;
  start_date: string;
  scale_duration?: number;
  budget_override?: number;
  skip_roles?: string[];
  customizations?: TemplateCustomizations;
}

export interface TemplateCustomizations {
  role_modifications?: Record<string, Partial<TemplateRole>>;
  milestone_modifications?: Record<string, Partial<TemplateMilestone>>;
  metadata_modifications?: Record<string, any>;
}

export interface TemplateApplyResult {
  template_applied: string;
  project_id: number;
  roles_created: any[];
  assignments_created: any[];
  milestones_created: any[];
}

export interface RateTemplateRequest {
  project_id: number;
  rating: number;
  feedback?: string;
}

export interface PaginatedTemplateResponse {
  templates: AllocationTemplate[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  total: number;
}

export type TemplateCategory = 
  | 'web_development' 
  | 'mobile_app' 
  | 'consulting' 
  | 'research' 
  | 'data_analytics' 
  | 'devops' 
  | 'design' 
  | 'marketing' 
  | 'custom';

export type VisibilityLevel = 'private' | 'organization' | 'public';
export type TemplateStatus = 'draft' | 'active' | 'deprecated' | 'archived';
export type ExperienceLevel = 'junior' | 'mid' | 'senior' | 'lead';

class AllocationTemplatesService {
  private baseURL = '/api/allocation-templates';

  // Template CRUD Operations
  async getTemplates(filters?: TemplateFilters): Promise<PaginatedTemplateResponse> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });
    }

    const response = await apiClient.get(`${this.baseURL}?${params.toString()}`);
    return response.data;
  }

  async getTemplateById(id: string): Promise<AllocationTemplate> {
    const response = await apiClient.get(`${this.baseURL}/${id}`);
    return response.data;
  }

  async createTemplate(data: CreateTemplateRequest): Promise<AllocationTemplate> {
    const response = await apiClient.post(this.baseURL, data);
    return response.data;
  }

  async updateTemplate(id: string, data: Partial<CreateTemplateRequest>): Promise<AllocationTemplate> {
    const response = await apiClient.put(`${this.baseURL}/${id}`, data);
    return response.data;
  }

  async deleteTemplate(id: string): Promise<void> {
    await apiClient.delete(`${this.baseURL}/${id}`);
  }

  // Template Role Management
  async addTemplateRole(templateId: string, data: CreateTemplateRoleRequest): Promise<TemplateRole> {
    const response = await apiClient.post(`${this.baseURL}/${templateId}/roles`, data);
    return response.data;
  }

  async updateTemplateRole(templateId: string, roleId: string, data: Partial<CreateTemplateRoleRequest>): Promise<TemplateRole> {
    const response = await apiClient.put(`${this.baseURL}/${templateId}/roles/${roleId}`, data);
    return response.data;
  }

  async deleteTemplateRole(templateId: string, roleId: string): Promise<void> {
    await apiClient.delete(`${this.baseURL}/${templateId}/roles/${roleId}`);
  }

  // Template Application
  async applyTemplateToProject(templateId: string, data: ApplyTemplateRequest): Promise<TemplateApplyResult> {
    const response = await apiClient.post(`${this.baseURL}/${templateId}/apply`, data);
    return response.data;
  }

  async cloneTemplate(templateId: string, newName: string): Promise<AllocationTemplate> {
    const response = await apiClient.post(`${this.baseURL}/${templateId}/clone`, { name: newName });
    return response.data;
  }

  async rateTemplate(templateId: string, data: RateTemplateRequest): Promise<void> {
    await apiClient.post(`${this.baseURL}/${templateId}/rate`, data);
  }

  // Template Library Features
  async getPopularTemplates(limit: number = 10): Promise<AllocationTemplate[]> {
    const response = await apiClient.get(`${this.baseURL}/popular?limit=${limit}`);
    return response.data;
  }

  async getTemplateCategories(): Promise<Array<{
    category: string;
    template_count: number;
    avg_usage: number;
  }>> {
    const response = await apiClient.get(`${this.baseURL}/categories`);
    return response.data;
  }

  // Utility methods
  getCategoryDisplayName(category: TemplateCategory): string {
    const categoryMap: Record<TemplateCategory, string> = {
      web_development: 'Web Development',
      mobile_app: 'Mobile App',
      consulting: 'Consulting',
      research: 'Research',
      data_analytics: 'Data Analytics',
      devops: 'DevOps',
      design: 'Design',
      marketing: 'Marketing',
      custom: 'Custom'
    };
    return categoryMap[category] || category;
  }

  getCategoryIcon(category: TemplateCategory): string {
    const iconMap: Record<TemplateCategory, string> = {
      web_development: '🌐',
      mobile_app: '📱',
      consulting: '💼',
      research: '🔬',
      data_analytics: '📊',
      devops: '⚙️',
      design: '🎨',
      marketing: '📢',
      custom: '🔧'
    };
    return iconMap[category] || '📋';
  }

  getVisibilityDisplayName(visibility: VisibilityLevel): string {
    const visibilityMap: Record<VisibilityLevel, string> = {
      private: 'Private',
      organization: 'Organization',
      public: 'Public'
    };
    return visibilityMap[visibility];
  }

  getExperienceLevelDisplayName(level: ExperienceLevel): string {
    const levelMap: Record<ExperienceLevel, string> = {
      junior: 'Junior',
      mid: 'Mid-level',
      senior: 'Senior',
      lead: 'Lead'
    };
    return levelMap[level];
  }

  calculateTemplateCost(template: AllocationTemplate): { min: number; max: number } | null {
    if (!template.roles || template.roles.length === 0) {
      return null;
    }

    let minCost = 0;
    let maxCost = 0;

    template.roles.forEach(role => {
      if (role.hourly_rate_range && role.estimated_hours_per_week && role.duration_weeks) {
        const totalHours = role.estimated_hours_per_week * role.duration_weeks;
        minCost += totalHours * role.hourly_rate_range[0];
        maxCost += totalHours * role.hourly_rate_range[1];
      }
    });

    return minCost > 0 ? { min: minCost, max: maxCost } : null;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  validateTemplateData(data: CreateTemplateRequest): string[] {
    const errors: string[] = [];

    if (!data.name || data.name.length < 3) {
      errors.push('Template name must be at least 3 characters long');
    }

    if (!data.category) {
      errors.push('Template category is required');
    }

    if (data.default_duration_weeks && data.default_duration_weeks <= 0) {
      errors.push('Duration must be a positive number');
    }

    if (data.default_budget_range) {
      if (!Array.isArray(data.default_budget_range) || data.default_budget_range.length !== 2) {
        errors.push('Budget range must be an array with exactly 2 numbers');
      } else if (data.default_budget_range[0] > data.default_budget_range[1]) {
        errors.push('Budget range minimum cannot be greater than maximum');
      }
    }

    return errors;
  }

  validateRoleData(data: CreateTemplateRoleRequest): string[] {
    const errors: string[] = [];

    if (!data.role_name) {
      errors.push('Role name is required');
    }

    if (!data.planned_allocation_percentage || data.planned_allocation_percentage <= 0 || data.planned_allocation_percentage > 100) {
      errors.push('Planned allocation percentage must be between 0.01 and 100');
    }

    if (data.duration_weeks && data.duration_weeks <= 0) {
      errors.push('Duration must be a positive number');
    }

    if (data.estimated_hours_per_week && data.estimated_hours_per_week < 0) {
      errors.push('Estimated hours per week cannot be negative');
    }

    if (data.hourly_rate_range) {
      if (!Array.isArray(data.hourly_rate_range) || data.hourly_rate_range.length !== 2) {
        errors.push('Hourly rate range must be an array with exactly 2 numbers');
      } else if (data.hourly_rate_range[0] > data.hourly_rate_range[1]) {
        errors.push('Hourly rate range minimum cannot be greater than maximum');
      }
    }

    if (data.max_assignments && (data.max_assignments < 1 || data.max_assignments > 10)) {
      errors.push('Max assignments must be between 1 and 10');
    }

    return errors;
  }
}

export const allocationTemplatesService = new AllocationTemplatesService();