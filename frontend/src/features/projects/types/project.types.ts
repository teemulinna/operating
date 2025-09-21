export interface Project {
  id: string;
  name: string;
  description?: string;
  client_name?: string;
  status: 'planning' | 'active' | 'completed' | 'on-hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  start_date: string;
  end_date?: string | null;
  budget?: number | null;
  hourly_rate?: number | null;
  estimated_hours?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectFormData {
  name: string;
  description?: string;
  client_name?: string;
  status: string;
  priority: string;
  start_date: string;
  end_date?: string | null;
  budget?: number | null;
  hourly_rate?: number | null;
  estimated_hours?: number | null;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ProjectOperationsHook {
  projects: Project[];
  loading: boolean;
  operationLoading: boolean;
  validationErrors: ValidationError[];
  fetchProjects: () => Promise<void>;
  createProject: (data: ProjectFormData) => Promise<Project>;
  updateProject: (id: string, data: ProjectFormData) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  clearValidationErrors: () => void;
}