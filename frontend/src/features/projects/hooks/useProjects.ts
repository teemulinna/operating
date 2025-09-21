import { useCallback } from 'react';
import { useCrudOperations } from '../../../hooks/useCrudOperations';
import { useToastManager } from '../../../hooks/useToastManager';
import { Project, CreateProjectRequest, UseProjectsHook } from '../types';

const PROJECTS_ENDPOINT = 'http://localhost:3001/api/projects';

/**
 * Custom hook for managing project operations
 * Encapsulates all business logic for projects CRUD operations
 */
export function useProjects(): UseProjectsHook {
  const { showSuccess, showError } = useToastManager();
  
  const {
    state: { items: projects, loading, operationLoading },
    createItem,
    updateItem,
    deleteItem,
    fetchItems
  } = useCrudOperations<Project>({
    onError: (error, operation) => {
      console.error(`Error during project ${operation}:`, error);
      showError(error.message);
    }
  });

  const createProject = useCallback(async (data: CreateProjectRequest) => {
    await createItem(PROJECTS_ENDPOINT, data, () => {
      showSuccess('Project created successfully');
    });
  }, [createItem, showSuccess]);

  const updateProject = useCallback(async (id: string | number, data: Partial<CreateProjectRequest>) => {
    await updateItem(PROJECTS_ENDPOINT, id, data, () => {
      showSuccess('Project updated successfully');
    });
  }, [updateItem, showSuccess]);

  const deleteProject = useCallback(async (id: string | number) => {
    await deleteItem(PROJECTS_ENDPOINT, id, () => {
      showSuccess('Project deleted successfully');
    });
  }, [deleteItem, showSuccess]);

  const refreshProjects = useCallback(async () => {
    await fetchItems(PROJECTS_ENDPOINT);
  }, [fetchItems]);

  return {
    projects,
    loading,
    operationLoading,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects
  };
}
