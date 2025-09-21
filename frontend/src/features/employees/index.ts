// Export main component
export { EmployeeManagement } from './EmployeeManagement';

// Export types for external use
export type {
  Employee,
  Department,
  EmployeeFormData,
  CreateEmployeeData,
  UpdateEmployeeData,
  EmployeeOperationsResult
} from './types/employee.types';

// Export hooks for advanced use cases
export { useEmployeeOperations } from './hooks/useEmployeeOperations';

// Export individual components for custom layouts
export { default as EmployeeList } from './components/EmployeeList';
export { default as EmployeeCard } from './components/EmployeeCard';
export { default as EmployeeFormModal } from './components/EmployeeFormModal';
export { default as EmployeeDeleteDialog } from './components/EmployeeDeleteDialog';