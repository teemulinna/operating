import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Project, CreateProjectRequest, transformApiProject } from '@/types/project';
import { useToastManager } from '@/hooks/useToastManager';

// Export the Project type and ProjectFormData interface for use in components
export type { Project } from '@/types/project';

export interface ProjectFormData extends CreateProjectRequest {
  id?: number;
}

export function useProjectOperations() {
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastManager();

  // Fetch projects query
  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('http://localhost:3001/api/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      return (data.data || []).map(transformApiProject);
    },
    staleTime: 0, // Always fetch fresh data after mutations
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: CreateProjectRequest) => {
      const response = await fetch('http://localhost:3001/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectData.name,
          description: projectData.description,
          client_name: projectData.client_name,
          start_date: projectData.start_date,
          end_date: projectData.end_date,
          budget: projectData.budget,
          hourly_rate: projectData.hourly_rate,
          estimated_hours: projectData.estimated_hours,
          status: projectData.status || 'planning',
          priority: projectData.priority || 'medium',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      showSuccess('Project created successfully');
    },
    onError: (error: Error) => {
      showError(error.message || 'Failed to create project');
    },
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, ...projectData }: CreateProjectRequest & { id: number }) => {
      // Build request body, omitting undefined/empty optional fields
      const requestBody: any = {
        name: projectData.name,
        start_date: projectData.start_date,
        end_date: projectData.end_date,
        status: projectData.status || 'planning',
        priority: projectData.priority || 'medium',
      };

      // Only include optional fields if they have valid values
      if (projectData.description && projectData.description.trim()) {
        requestBody.description = projectData.description;
      }
      if (projectData.client_name && projectData.client_name.trim()) {
        requestBody.client_name = projectData.client_name;
      }
      if (projectData.budget !== undefined && projectData.budget !== null) {
        requestBody.budget = projectData.budget;
      }
      if (projectData.hourly_rate !== undefined && projectData.hourly_rate !== null) {
        requestBody.hourly_rate = projectData.hourly_rate;
      }
      if (projectData.estimated_hours !== undefined && projectData.estimated_hours !== null) {
        requestBody.estimated_hours = projectData.estimated_hours;
      }

      console.log('🚀 UPDATE API CALL - Project ID:', id);
      console.log('🚀 UPDATE API CALL - Request body:', requestBody);
      console.log('🚀 UPDATE API CALL - JSON stringified:', JSON.stringify(requestBody));

      const response = await fetch(`http://localhost:3001/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();
      console.log('✅ UPDATE API RESPONSE - Status:', response.status);
      console.log('✅ UPDATE API RESPONSE - Data:', responseData);

      if (!response.ok) {
        console.error('❌ UPDATE FAILED:', response.status, responseData);
        throw new Error(responseData.error || 'Failed to update project');
      }

      return responseData;
    },
    onSuccess: async (data) => {
      console.log('🎉 UPDATE SUCCESS - Response data:', data);
      // Aggressively invalidate and refetch to ensure UI updates
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      const refetchResult = await queryClient.refetchQueries({ queryKey: ['projects'] });
      console.log('🔄 REFETCH COMPLETE - Result:', refetchResult);

      // Get the updated projects from cache
      const updatedProjects = queryClient.getQueryData(['projects']);
      console.log('📊 UPDATED PROJECTS IN CACHE:', updatedProjects);

      setEditingProject(null);
      showSuccess('Project updated successfully');
    },
    onError: (error: Error) => {
      showError(error.message || 'Failed to update project');
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await fetch(`http://localhost:3001/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete project');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeletingProject(null);
      showSuccess('Project deleted successfully');
    },
    onError: (error: Error) => {
      showError(error.message || 'Failed to delete project');
    },
  });

  // Project validation
  const validateProjectData = useCallback((projectData: CreateProjectRequest): string[] => {
    const errors: string[] = [];

    if (!projectData.name?.trim()) {
      errors.push('Project name is required');
    }

    if (!projectData.start_date) {
      errors.push('Start date is required');
    }

    if (projectData.end_date && projectData.start_date) {
      const startDate = new Date(projectData.start_date);
      const endDate = new Date(projectData.end_date);
      if (endDate <= startDate) {
        errors.push('End date must be after start date');
      }
    }

    if (projectData.budget && projectData.budget < 0) {
      errors.push('Budget must be a positive number');
    }

    if (projectData.hourly_rate && projectData.hourly_rate < 0) {
      errors.push('Hourly rate must be a positive number');
    }

    if (projectData.estimated_hours && projectData.estimated_hours < 0) {
      errors.push('Estimated hours must be a positive number');
    }

    return errors;
  }, []);

  // Handler functions
  const handleCreateProject = useCallback((projectData: CreateProjectRequest) => {
    const validationErrors = validateProjectData(projectData);
    if (validationErrors.length > 0) {
      showError(validationErrors.join(', '));
      return;
    }
    createProjectMutation.mutate(projectData);
  }, [createProjectMutation, validateProjectData, showError]);

  const handleUpdateProject = useCallback((projectData: CreateProjectRequest) => {
    if (!editingProject) return;

    console.log('📝 handleUpdateProject - editingProject.id:', editingProject.id);
    console.log('📝 handleUpdateProject - projectData before mutation:', projectData);

    const validationErrors = validateProjectData(projectData);
    if (validationErrors.length > 0) {
      showError(validationErrors.join(', '));
      return;
    }

    const mutationData = { ...projectData, id: editingProject.id };
    console.log('📝 handleUpdateProject - mutationData to send:', mutationData);

    updateProjectMutation.mutate(mutationData);
  }, [editingProject, updateProjectMutation, validateProjectData, showError]);

  const handleDeleteProject = useCallback(() => {
    if (!deletingProject) return;
    deleteProjectMutation.mutate(deletingProject.id);
  }, [deletingProject, deleteProjectMutation]);

  const handleEditProject = useCallback((project: Project) => {
    setEditingProject(project);
  }, []);

  const handleDeleteProjectClick = useCallback((project: Project) => {
    setDeletingProject(project);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingProject(null);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setDeletingProject(null);
  }, []);

  return {
    // Data
    projects: projectsQuery.data || [],
    isLoading: projectsQuery.isLoading,
    editingProject,
    deletingProject,
    
    // Loading states
    isCreating: createProjectMutation.isPending,
    isUpdating: updateProjectMutation.isPending,
    isDeleting: deleteProjectMutation.isPending,
    
    // Handlers
    handleCreateProject,
    handleUpdateProject,
    handleDeleteProject,
    handleEditProject,
    handleDeleteProjectClick,
    handleCancelEdit,
    handleCancelDelete,
    
    // Utility
    validateProjectData
  };
}