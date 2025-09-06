import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProjectService } from '@/services/projectService';
import type { 
  Project, 
  CreateProjectRequest, 
  UpdateProjectRequest,
  ProjectFilters, 
  ProjectPaginationParams,
  ProjectsResponse 
} from '@/types/project';

const PROJECT_KEYS = {
  all: ['projects'] as const,
  lists: () => [...PROJECT_KEYS.all, 'list'] as const,
  list: (filters: ProjectFilters, pagination: ProjectPaginationParams) => 
    [...PROJECT_KEYS.lists(), filters, pagination] as const,
  details: () => [...PROJECT_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PROJECT_KEYS.details(), id] as const,
  stats: () => [...PROJECT_KEYS.all, 'stats'] as const,
  timeline: (id: string) => [...PROJECT_KEYS.all, 'timeline', id] as const,
} as const;

export function useProjects(
  filters: ProjectFilters = {}, 
  pagination: ProjectPaginationParams = { page: 1, limit: 10 }
) {
  return useQuery({
    queryKey: PROJECT_KEYS.list(filters, pagination),
    queryFn: () => ProjectService.getProjects(filters, pagination),
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: PROJECT_KEYS.detail(id),
    queryFn: () => ProjectService.getProject(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useProjectStats() {
  return useQuery({
    queryKey: PROJECT_KEYS.stats(),
    queryFn: () => ProjectService.getProjectStats(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useProjectTimeline(projectId: string) {
  return useQuery({
    queryKey: PROJECT_KEYS.timeline(projectId),
    queryFn: () => ProjectService.getProjectTimeline(projectId),
    enabled: !!projectId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (project: CreateProjectRequest) => 
      ProjectService.createProject(project),
    onSuccess: (newProject) => {
      // Invalidate project lists to refetch data
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.stats() });
      
      // Optimistically add to cache
      queryClient.setQueryData(
        PROJECT_KEYS.detail(newProject.id), 
        newProject
      );
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<UpdateProjectRequest> }) =>
      ProjectService.updateProject(id, updates),
    onSuccess: (updatedProject) => {
      // Update the specific project in cache
      queryClient.setQueryData(
        PROJECT_KEYS.detail(updatedProject.id), 
        updatedProject
      );
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.stats() });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => ProjectService.deleteProject(id),
    onSuccess: (_, deletedId) => {
      // Remove project from cache
      queryClient.removeQueries({ queryKey: PROJECT_KEYS.detail(deletedId) });
      queryClient.removeQueries({ queryKey: PROJECT_KEYS.timeline(deletedId) });
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.stats() });
    },
  });
}

export function useProjectCSVExport() {
  return useMutation({
    mutationFn: (filters: ProjectFilters = {}) => 
      ProjectService.exportProjectsCSV(filters),
  });
}

export function useProjectCSVImport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (file: File) => ProjectService.importProjectsCSV(file),
    onSuccess: () => {
      // Invalidate all project queries after import
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
    },
  });
}

// Resource allocation hooks
export function useProjectAssignments(projectId: string) {
  return useQuery({
    queryKey: [...PROJECT_KEYS.all, 'assignments', projectId],
    queryFn: () => ProjectService.getProjectAssignments(projectId),
    enabled: !!projectId,
  });
}

export function useCreateProjectAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (assignment: {
      projectId: string;
      employeeId: string;
      role: string;
      utilizationPercentage: number;
      startDate: string;
      endDate?: string;
    }) => ProjectService.createProjectAssignment(assignment),
    onSuccess: (_, variables) => {
      // Invalidate project assignments
      queryClient.invalidateQueries({ 
        queryKey: [...PROJECT_KEYS.all, 'assignments', variables.projectId] 
      });
      // Invalidate employee capacity data
      queryClient.invalidateQueries({ 
        queryKey: ['employees', 'capacity', variables.employeeId] 
      });
    },
  });
}

export function useUpdateProjectAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { 
      id: string; 
      updates: {
        role?: string;
        utilizationPercentage?: number;
        startDate?: string;
        endDate?: string;
      } 
    }) => ProjectService.updateProjectAssignment(id, updates),
    onSuccess: (assignment) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: [...PROJECT_KEYS.all, 'assignments', assignment.projectId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['employees', 'capacity', assignment.employeeId] 
      });
    },
  });
}

export function useDeleteProjectAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => ProjectService.deleteProjectAssignment(id),
    onSuccess: (assignment) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: [...PROJECT_KEYS.all, 'assignments', assignment.projectId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['employees', 'capacity', assignment.employeeId] 
      });
    },
  });
}

// Export query keys for external use
export const projectKeys = PROJECT_KEYS;