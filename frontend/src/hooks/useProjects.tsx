import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProjectService } from '@/services/projectService';
import type { 
  Project, 
  CreateProjectRequest, 
  ProjectFilters, 
  ProjectPaginationParams, 
  ProjectStats,
  ProjectTimelineEvent 
} from '@/types/project';

const PROJECT_KEYS = {
  all: ['projects'] as const,
  lists: () => [...PROJECT_KEYS.all, 'list'] as const,
  list: (filters: ProjectFilters, pagination: ProjectPaginationParams) => 
    [...PROJECT_KEYS.lists(), filters, pagination] as const,
  details: () => [...PROJECT_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PROJECT_KEYS.details(), id] as const,
  clients: () => [...PROJECT_KEYS.all, 'clients'] as const,
  tags: () => [...PROJECT_KEYS.all, 'tags'] as const,
  stats: (filters: ProjectFilters) => [...PROJECT_KEYS.all, 'stats', filters] as const,
  timeline: (id: string) => [...PROJECT_KEYS.detail(id), 'timeline'] as const,
};

/**
 * Hook to fetch projects with filtering and pagination
 */
export function useProjects(
  filters: ProjectFilters = {}, 
  pagination: ProjectPaginationParams = {}
) {
  return useQuery({
    queryKey: PROJECT_KEYS.list(filters, pagination),
    queryFn: () => ProjectService.getProjects(filters, pagination),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single project by ID
 */
export function useProject(id: string) {
  return useQuery({
    queryKey: PROJECT_KEYS.detail(id),
    queryFn: () => ProjectService.getProject(id),
    enabled: !!id,
  });
}

/**
 * Hook to create a new project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (project: CreateProjectRequest) => 
      ProjectService.createProject(project),
    onSuccess: () => {
      // Invalidate project lists to refetch data
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
      // Invalidate stats as well
      queryClient.invalidateQueries({ queryKey: [...PROJECT_KEYS.all, 'stats'] });
    },
  });
}

/**
 * Hook to update an existing project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Project> }) =>
      ProjectService.updateProject(id, updates),
    onSuccess: (updatedProject) => {
      // Update the specific project in cache
      queryClient.setQueryData(
        PROJECT_KEYS.detail(updatedProject.id), 
        updatedProject
      );
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: [...PROJECT_KEYS.all, 'stats'] });
    },
  });
}

/**
 * Hook to delete a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => ProjectService.deleteProject(id),
    onSuccess: (_, deletedId) => {
      // Remove project from cache
      queryClient.removeQueries({ queryKey: PROJECT_KEYS.detail(deletedId) });
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: [...PROJECT_KEYS.all, 'stats'] });
    },
  });
}

/**
 * Hook to fetch unique client names
 */
export function useClients() {
  return useQuery({
    queryKey: PROJECT_KEYS.clients(),
    queryFn: () => ProjectService.getClients(),
    staleTime: 10 * 60 * 1000, // 10 minutes - clients change infrequently
  });
}

/**
 * Hook to fetch unique project tags
 */
export function useTags() {
  return useQuery({
    queryKey: PROJECT_KEYS.tags(),
    queryFn: () => ProjectService.getTags(),
    staleTime: 10 * 60 * 1000, // 10 minutes - tags change infrequently
  });
}

/**
 * Hook to fetch project statistics
 */
export function useProjectStats(filters: ProjectFilters = {}) {
  return useQuery({
    queryKey: PROJECT_KEYS.stats(filters),
    queryFn: () => ProjectService.getProjectStats(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes - stats should be relatively fresh
  });
}

/**
 * Hook to fetch project timeline events
 */
export function useProjectTimeline(projectId: string) {
  return useQuery({
    queryKey: PROJECT_KEYS.timeline(projectId),
    queryFn: () => ProjectService.getProjectTimeline(projectId),
    enabled: !!projectId,
    staleTime: 1 * 60 * 1000, // 1 minute - timeline should be fresh
  });
}

/**
 * Hook to add timeline event to project
 */
export function useAddTimelineEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      projectId, 
      event 
    }: { 
      projectId: string; 
      event: Omit<ProjectTimelineEvent, 'id' | 'projectId' | 'date'> 
    }) => ProjectService.addTimelineEvent(projectId, event),
    onSuccess: (_, { projectId }) => {
      // Invalidate timeline for this project
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.timeline(projectId) });
    },
  });
}

/**
 * Hook to update project status
 */
export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Project['status'] }) =>
      ProjectService.updateProjectStatus(id, status),
    onSuccess: (updatedProject) => {
      // Update project in cache
      queryClient.setQueryData(
        PROJECT_KEYS.detail(updatedProject.id), 
        updatedProject
      );
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: [...PROJECT_KEYS.all, 'stats'] });
      // Invalidate timeline
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.timeline(updatedProject.id) });
    },
  });
}

/**
 * Hook to manage project team members
 */
export function useProjectTeam() {
  const queryClient = useQueryClient();
  
  const addMember = useMutation({
    mutationFn: ({ projectId, employeeId }: { projectId: string; employeeId: string }) =>
      ProjectService.addTeamMember(projectId, employeeId),
    onSuccess: (updatedProject) => {
      queryClient.setQueryData(PROJECT_KEYS.detail(updatedProject.id), updatedProject);
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
    },
  });

  const removeMember = useMutation({
    mutationFn: ({ projectId, employeeId }: { projectId: string; employeeId: string }) =>
      ProjectService.removeTeamMember(projectId, employeeId),
    onSuccess: (updatedProject) => {
      queryClient.setQueryData(PROJECT_KEYS.detail(updatedProject.id), updatedProject);
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
    },
  });

  return { addMember, removeMember };
}

/**
 * Hook to handle CSV import/export
 */
export function useProjectCSV() {
  const queryClient = useQueryClient();
  
  const importCSV = useMutation({
    mutationFn: (file: File) => ProjectService.importCSV(file),
    onSuccess: () => {
      // Invalidate all project queries after import
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
    },
  });

  const exportCSV = useMutation({
    mutationFn: (filters: ProjectFilters = {}) => ProjectService.exportCSV(filters),
  });

  return { importCSV, exportCSV };
}

/**
 * Hook to archive/restore projects
 */
export function useProjectArchive() {
  const queryClient = useQueryClient();
  
  const archive = useMutation({
    mutationFn: (id: string) => ProjectService.archiveProject(id),
    onSuccess: (updatedProject) => {
      queryClient.setQueryData(PROJECT_KEYS.detail(updatedProject.id), updatedProject);
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: [...PROJECT_KEYS.all, 'stats'] });
    },
  });

  const restore = useMutation({
    mutationFn: (id: string) => ProjectService.restoreProject(id),
    onSuccess: (updatedProject) => {
      queryClient.setQueryData(PROJECT_KEYS.detail(updatedProject.id), updatedProject);
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: [...PROJECT_KEYS.all, 'stats'] });
    },
  });

  return { archive, restore };
}

/**
 * Hook to clone a project
 */
export function useCloneProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, newName }: { id: string; newName?: string }) =>
      ProjectService.cloneProject(id, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: [...PROJECT_KEYS.all, 'stats'] });
    },
  });
}

/**
 * Hook to fetch project assignments for a specific project
 */
export function useProjectAssignments(projectId: string) {
  return useQuery({
    queryKey: [...PROJECT_KEYS.detail(projectId), 'assignments'],
    queryFn: () => ProjectService.getProjectAssignments(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch project roles for a specific project
 */
export function useProjectRoles(projectId: string) {
  return useQuery({
    queryKey: [...PROJECT_KEYS.detail(projectId), 'roles'],
    queryFn: () => ProjectService.getProjectRoles(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create a new project role
 */
export function useCreateProjectRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (roleData: import('@/types/project').CreateProjectRoleRequest) =>
      ProjectService.createProjectRole(roleData),
    onSuccess: (newRole) => {
      // Invalidate project roles query
      queryClient.invalidateQueries({ 
        queryKey: [...PROJECT_KEYS.detail(newRole.projectId), 'roles'] 
      });
      // Also invalidate project details to update role counts
      queryClient.invalidateQueries({ 
        queryKey: PROJECT_KEYS.detail(newRole.projectId) 
      });
    },
  });
}

/**
 * Hook to update an existing project role
 */
export function useUpdateProjectRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { 
      id: string; 
      updates: Partial<import('@/types/project').CreateProjectRoleRequest> 
    }) => ProjectService.updateProjectRole(id, updates),
    onSuccess: (updatedRole) => {
      // Update the specific role in cache if possible
      queryClient.setQueryData(
        [...PROJECT_KEYS.detail(updatedRole.projectId), 'roles'],
        (oldRoles: any[]) => {
          if (!oldRoles) return [updatedRole];
          return oldRoles.map(role => 
            role.id === updatedRole.id ? updatedRole : role
          );
        }
      );
      // Invalidate project roles query to ensure fresh data
      queryClient.invalidateQueries({ 
        queryKey: [...PROJECT_KEYS.detail(updatedRole.projectId), 'roles'] 
      });
    },
  });
}

/**
 * Hook to delete a project role
 */
export function useDeleteProjectRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (roleId: string) => ProjectService.deleteProjectRole(roleId),
    onSuccess: (_, deletedRoleId, context) => {
      // Remove from all project role queries
      queryClient.invalidateQueries({ 
        queryKey: [...PROJECT_KEYS.all, 'roles'] 
      });
      // Also invalidate related project queries
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.details() });
    },
  });
}

/**
 * Hook to create a project role assignment
 */
export function useCreateProjectRoleAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (assignmentData: import('@/types/project').CreateProjectRoleAssignmentRequest) =>
      ProjectService.createProjectRoleAssignment(assignmentData),
    onSuccess: (newAssignment) => {
      // Invalidate assignments for the project
      queryClient.invalidateQueries({ 
        queryKey: [...PROJECT_KEYS.detail(newAssignment.projectId), 'assignments'] 
      });
      // Invalidate roles to update assignment counts
      queryClient.invalidateQueries({ 
        queryKey: [...PROJECT_KEYS.detail(newAssignment.projectId), 'roles'] 
      });
    },
  });
}

/**
 * Hook to update a project role assignment
 */
export function useUpdateProjectRoleAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { 
      id: string; 
      updates: Partial<import('@/types/project').CreateProjectRoleAssignmentRequest> 
    }) => ProjectService.updateProjectRoleAssignment(id, updates),
    onSuccess: (updatedAssignment) => {
      // Invalidate assignments for the project
      queryClient.invalidateQueries({ 
        queryKey: [...PROJECT_KEYS.detail(updatedAssignment.projectId), 'assignments'] 
      });
    },
  });
}

/**
 * Hook to delete a project role assignment
 */
export function useDeleteProjectRoleAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (assignmentId: string) => ProjectService.deleteProjectRoleAssignment(assignmentId),
    onSuccess: (deletedAssignment) => {
      // Invalidate assignments for the project
      queryClient.invalidateQueries({ 
        queryKey: [...PROJECT_KEYS.detail(deletedAssignment.projectId), 'assignments'] 
      });
      // Invalidate roles to update assignment counts
      queryClient.invalidateQueries({ 
        queryKey: [...PROJECT_KEYS.detail(deletedAssignment.projectId), 'roles'] 
      });
    },
  });
}

// Export query keys for external use
export const projectKeys = PROJECT_KEYS;