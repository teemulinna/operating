export interface DefaultTask {
  id: string;
  name: string;
  description: string;
  duration: number; // in days
  dependencies: string[];
  requiredSkills: string[];
  estimatedHours: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface DefaultMilestone {
  id: string;
  name: string;
  description: string;
  daysFromStart: number;
  criteria: string[];
  deliverables: string[];
}

export interface RequiredSkill {
  skillId: string;
  skillName: string;
  level: 'junior' | 'mid' | 'senior' | 'expert';
  quantity: number;
}

export interface TemplateMetadata {
  industry: string;
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
  methodology: 'agile' | 'waterfall' | 'hybrid' | 'lean';
  tags: string[];
  estimatedSuccessRate: number;
  averageCompletionTime: number;
}

export interface ProjectTemplate {
  templateId: string;
  name: string;
  description: string;
  category: string;
  defaultTasks: DefaultTask[];
  defaultMilestones: DefaultMilestone[];
  defaultBudget?: number;
  defaultDuration?: number;
  requiredSkills: RequiredSkill[];
  defaultTeamSize: number;
  metadata?: TemplateMetadata;
  isActive: boolean;
  isBuiltIn: boolean;
  isPublic: boolean;
  version: number;
  createdById?: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  usageCount: number;
  averageRating: number;
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTemplateFromProjectOptions {
  name: string;
  description: string;
  category: string;
  isPublic?: boolean;
  excludePersonalData?: boolean;
}

export interface ApplyTemplateOptions {
  templateId: string;
  projectName: string;
  startDate: Date;
  clientId?: string;
  customBudget?: number;
  customDuration?: number;
  teamAssignments?: { [taskId: string]: string[] };
  customizations?: {
    includeTasks?: string[];
    excludeTasks?: string[];
    includeMilestones?: string[];
    excludeMilestones?: string[];
    modifyTasks?: { [taskId: string]: Partial<DefaultTask> };
    modifyMilestones?: { [milestoneId: string]: Partial<DefaultMilestone> };
  };
}

export interface TemplateSearchFilters {
  category?: string;
  industry?: string;
  complexity?: string;
  methodology?: string;
  tags?: string[];
  minRating?: number;
  isPublic?: boolean;
  createdById?: string;
}

export interface TemplateCategory {
  category: string;
  count: number;
}

export interface TemplateExportData {
  version: string;
  exportDate: string;
  template: {
    name: string;
    description: string;
    category: string;
    defaultTasks: DefaultTask[];
    defaultMilestones: DefaultMilestone[];
    defaultBudget?: number;
    defaultDuration?: number;
    requiredSkills: RequiredSkill[];
    defaultTeamSize: number;
    metadata?: TemplateMetadata;
    customFields?: Record<string, any>;
  };
}

export interface TemplateCustomizations {
  includeTasks?: string[];
  excludeTasks?: string[];
  includeMilestones?: string[];
  excludeMilestones?: string[];
  modifyTasks?: { [taskId: string]: Partial<DefaultTask> };
  modifyMilestones?: { [milestoneId: string]: Partial<DefaultMilestone> };
  customBudget?: number;
  customDuration?: number;
  teamAssignments?: { [taskId: string]: string[] };
}

export interface TemplatePreview {
  template: ProjectTemplate;
  estimatedDuration: number;
  estimatedBudget: number;
  taskCount: number;
  milestoneCount: number;
  requiredSkillsCount: number;
  complexityScore: number;
}

// Built-in template categories
export const TEMPLATE_CATEGORIES = {
  SOFTWARE_DEVELOPMENT: 'Software Development',
  MARKETING: 'Marketing',
  PRODUCT_LAUNCH: 'Product Launch',
  CONSULTING: 'Consulting',
  CONSTRUCTION: 'Construction',
  RESEARCH: 'Research',
  EVENT_MANAGEMENT: 'Event Management',
  CONTENT_CREATION: 'Content Creation',
  TRAINING: 'Training',
  COMPLIANCE: 'Compliance'
} as const;

// Built-in industries
export const TEMPLATE_INDUSTRIES = {
  TECHNOLOGY: 'Technology',
  HEALTHCARE: 'Healthcare',
  FINANCE: 'Finance',
  EDUCATION: 'Education',
  MANUFACTURING: 'Manufacturing',
  RETAIL: 'Retail',
  CONSULTING: 'Consulting',
  CONSTRUCTION: 'Construction',
  MEDIA: 'Media',
  NONPROFIT: 'Nonprofit'
} as const;

// Complexity levels
export const COMPLEXITY_LEVELS = {
  SIMPLE: 'simple',
  MODERATE: 'moderate',
  COMPLEX: 'complex',
  ENTERPRISE: 'enterprise'
} as const;

// Methodologies
export const METHODOLOGIES = {
  AGILE: 'agile',
  WATERFALL: 'waterfall',
  HYBRID: 'hybrid',
  LEAN: 'lean'
} as const;

// Priority levels
export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

// Skill levels
export const SKILL_LEVELS = {
  JUNIOR: 'junior',
  MID: 'mid',
  SENIOR: 'senior',
  EXPERT: 'expert'
} as const;