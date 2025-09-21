import { CRMSystemConfig } from '../../types/pipeline';

export interface CRMProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  assignees?: string[];
  labels?: string[];
  priority?: string;
  dueDate?: string;
}

export interface CRMConnectionTest {
  success: boolean;
  message: string;
  details?: {
    responseTime: number;
    version?: string;
    userInfo?: any;
    error?: any;
  };
}

export abstract class BaseCRMAdapter {
  protected config: CRMSystemConfig;

  constructor(config: CRMSystemConfig) {
    this.config = config;
  }

  /**
   * Test connection to the CRM system
   */
  abstract testConnection(): Promise<CRMConnectionTest>;

  /**
   * Create a new project/issue/task in the CRM
   */
  abstract createProject(project: {
    name: string;
    description?: string;
    assignees?: string[];
    labels?: string[];
    priority?: string;
    dueDate?: string;
  }): Promise<CRMProject>;

  /**
   * Update an existing project/issue/task in the CRM
   */
  abstract updateProject(id: string, updates: Partial<CRMProject>): Promise<CRMProject>;

  /**
   * Get a project/issue/task from the CRM
   */
  abstract getProject(id: string): Promise<CRMProject | null>;

  /**
   * List projects/issues/tasks from the CRM
   */
  abstract listProjects(filters?: {
    status?: string[];
    assignee?: string;
    labels?: string[];
    limit?: number;
    offset?: number;
  }): Promise<CRMProject[]>;

  /**
   * Delete a project/issue/task from the CRM
   */
  abstract deleteProject(id: string): Promise<boolean>;

  /**
   * Get the CRM system type
   */
  getType(): string {
    return this.config.type;
  }

  /**
   * Get the CRM system name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Check if the adapter is properly configured
   */
  abstract isConfigured(): boolean;
}