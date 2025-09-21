import React from 'react';

export interface Allocation {
  id: string;
  employeeId: string;
  projectId: string;
  startDate: string;
  endDate: string;
  allocatedHours: number;
  roleOnProject?: string;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  notes?: string;
  isActive: boolean;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  workingHours: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
}

export interface AllocationFormData {
  employeeId: string;
  projectId: string;
  startDate: string;
  endDate: string;
  allocatedHours: number;
  roleOnProject?: string;
  status: string;
  notes?: string;
  isActive: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

interface UseAllocationOperationsReturn {
  allocations: Allocation[];
  employees: Employee[];
  projects: Project[];
  loading: boolean;
  operationLoading: boolean;
  validationErrors: ValidationError[];
  fetchData: () => Promise<void>;
  createAllocation: (data: AllocationFormData) => Promise<void>;
  updateAllocation: (id: string, data: AllocationFormData) => Promise<void>;
  deleteAllocation: (id: string) => Promise<void>;
  validateAllocation: (data: AllocationFormData) => ValidationError[];
}

export const useAllocationOperations = (): UseAllocationOperationsReturn => {
  const [allocations, setAllocations] = React.useState<Allocation[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [operationLoading, setOperationLoading] = React.useState(false);
  const [validationErrors, setValidationErrors] = React.useState<ValidationError[]>([]);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [allocationsRes, employeesRes, projectsRes] = await Promise.all([
        fetch('http://localhost:3001/api/allocations'),
        fetch('http://localhost:3001/api/employees'),
        fetch('http://localhost:3001/api/projects')
      ]);

      const allocationsData = await allocationsRes.json();
      const employeesData = await employeesRes.json();
      const projectsData = await projectsRes.json();

      setAllocations(allocationsData.data || []);
      setEmployees(employeesData.data || []);
      setProjects(projectsData.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      throw new Error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const validateAllocation = (data: AllocationFormData): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Required field validation
    if (!data.employeeId) {
      errors.push({ field: 'employeeId', message: 'Employee is required' });
    }
    if (!data.projectId) {
      errors.push({ field: 'projectId', message: 'Project is required' });
    }
    if (!data.startDate) {
      errors.push({ field: 'startDate', message: 'Start date is required' });
    }
    if (!data.endDate) {
      errors.push({ field: 'endDate', message: 'End date is required' });
    }
    if (!data.allocatedHours) {
      errors.push({ field: 'allocatedHours', message: 'Allocated hours is required' });
    }

    // Date validation
    if (data.startDate && data.endDate) {
      if (new Date(data.endDate) <= new Date(data.startDate)) {
        errors.push({ field: 'endDate', message: 'End date must be after start date' });
      }
    }

    // Hours validation
    if (data.allocatedHours && (data.allocatedHours <= 0 || data.allocatedHours > 80)) {
      errors.push({ field: 'allocatedHours', message: 'Allocated hours must be between 1 and 80' });
    }

    return errors;
  };

  const createAllocation = async (data: AllocationFormData) => {
    setOperationLoading(true);
    setValidationErrors([]);

    try {
      // Validate data
      const errors = validateAllocation(data);
      if (errors.length > 0) {
        setValidationErrors(errors);
        throw new Error('Validation failed');
      }

      const response = await fetch('http://localhost:3001/api/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create allocation');
      }

      // Refresh the data
      await fetchData();
    } catch (error) {
      console.error('Error creating allocation:', error);
      throw error;
    } finally {
      setOperationLoading(false);
    }
  };

  const updateAllocation = async (id: string, data: AllocationFormData) => {
    setOperationLoading(true);
    setValidationErrors([]);

    try {
      // Validate data
      const errors = validateAllocation(data);
      if (errors.length > 0) {
        setValidationErrors(errors);
        throw new Error('Validation failed');
      }

      const response = await fetch(`http://localhost:3001/api/allocations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update allocation');
      }

      // Refresh the data
      await fetchData();
    } catch (error) {
      console.error('Error updating allocation:', error);
      throw error;
    } finally {
      setOperationLoading(false);
    }
  };

  const deleteAllocation = async (id: string) => {
    setOperationLoading(true);

    try {
      const response = await fetch(`http://localhost:3001/api/allocations/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete allocation');
      }

      // Refresh the data
      await fetchData();
    } catch (error) {
      console.error('Error deleting allocation:', error);
      throw error;
    } finally {
      setOperationLoading(false);
    }
  };

  return {
    allocations,
    employees,
    projects,
    loading,
    operationLoading,
    validationErrors,
    fetchData,
    createAllocation,
    updateAllocation,
    deleteAllocation,
    validateAllocation
  };
};