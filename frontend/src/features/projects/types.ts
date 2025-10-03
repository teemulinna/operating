import { Project, CreateProjectRequest } from '../../types/project';

// Generic API Response type
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface ProjectFormData {
  name: string;
  description?: string;
  client_name?: string;
  status: 'planning' | 'active' | 'completed' | 'on-hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  start_date: string;
  end_date?: string;
  budget?: number;
  hourly_rate?: number;
  estimated_hours?: number;
}

export interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export interface ProjectFormProps {
  project?: Project | null;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export interface ProjectDeleteDialogProps {
  project: Project | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface ProjectListProps {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  loading?: boolean;
}

export interface UseProjectsHook {
  projects: Project[];
  loading: boolean;
  operationLoading: boolean;
  createProject: (data: CreateProjectRequest) => Promise<void>;
  updateProject: (id: string | number, data: Partial<CreateProjectRequest>) => Promise<void>;
  deleteProject: (id: string | number) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

// API Response types for projects
export interface ProjectApiResponse extends ApiResponse<Project[]> {
  data: Project[];
}

export type { Project, CreateProjectRequest } from '../../types/project';
