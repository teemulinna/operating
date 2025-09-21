import { useCallback } from 'react';
import { useCrudOperations } from '../../../hooks/useCrudOperations';
import { useToastManager } from '../../../hooks/useToastManager';
import { Allocation, Employee, Project, AllocationFormData, UseAllocationsHook } from '../types';

const ALLOCATIONS_ENDPOINT = 'http://localhost:3001/api/allocations';
const EMPLOYEES_ENDPOINT = 'http://localhost:3001/api/employees';
const PROJECTS_ENDPOINT = 'http://localhost:3001/api/projects';

/**
 * Custom hook for managing allocation operations
 * Encapsulates all business logic for allocations CRUD operations
 */
export function useAllocations(): UseAllocationsHook {
  const { showSuccess, showError } = useToastManager();
  
  // Separate CRUD operations for different entities
  const {
    state: { items: allocations, loading, operationLoading },
    createItem,
    updateItem,
    deleteItem,
    fetchItems: fetchAllocations
  } = useCrudOperations<Allocation>({
    onError: (error, operation) => {
      console.error(`Error during allocation ${operation}:`, error);
      showError(error.message);
    }
  });

  const {
    state: { items: employees },
    fetchItems: fetchEmployees
  } = useCrudOperations<Employee>({
    onError: (error) => {
      console.error('Error fetching employees:', error);
      showError('Failed to load employees');
    }
  });

  const {
    state: { items: projects },
    fetchItems: fetchProjects
  } = useCrudOperations<Project>({
    onError: (error) => {
      console.error('Error fetching projects:', error);
      showError('Failed to load projects');
    }
  });

  const createAllocation = useCallback(async (data: AllocationFormData) => {
    await createItem(ALLOCATIONS_ENDPOINT, data, () => {
      showSuccess('Allocation created successfully');
    });
  }, [createItem, showSuccess]);

  const updateAllocation = useCallback(async (id: string | number, data: Partial<AllocationFormData>) => {
    await updateItem(ALLOCATIONS_ENDPOINT, id, data, () => {
      showSuccess('Allocation updated successfully');
    });
  }, [updateItem, showSuccess]);

  const deleteAllocation = useCallback(async (id: string | number) => {
    await deleteItem(ALLOCATIONS_ENDPOINT, id, () => {
      showSuccess('Allocation deleted successfully');
    });
  }, [deleteItem, showSuccess]);

  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchAllocations(ALLOCATIONS_ENDPOINT),
      fetchEmployees(EMPLOYEES_ENDPOINT),
      fetchProjects(PROJECTS_ENDPOINT)
    ]);
  }, [fetchAllocations, fetchEmployees, fetchProjects]);

  const detectOverAllocation = useCallback((
    employeeId: string,
    startDate: string,
    endDate: string,
    excludeId?: string | number
  ): Allocation[] => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return allocations.filter(allocation => {
      // Skip the allocation being edited
      if (excludeId && allocation.id === excludeId) return false;
      
      // Only check allocations for the same employee
      if (allocation.employeeId !== employeeId) return false;
      
      // Only check active allocations
      if (!allocation.isActive) return false;
      
      const allocationStart = new Date(allocation.startDate);
      const allocationEnd = new Date(allocation.endDate);
      
      // Check for date overlap
      return start <= allocationEnd && end >= allocationStart;
    });
  }, [allocations]);

  return {
    allocations,
    employees,
    projects,
    loading,
    operationLoading,
    createAllocation,
    updateAllocation,
    deleteAllocation,
    refreshData,
    detectOverAllocation
  };
}