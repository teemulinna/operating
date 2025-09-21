// Main component
export { AllocationManagement } from './AllocationManagement';

// Components
export { AllocationForm } from './components/AllocationForm';
export { AllocationList } from './components/AllocationList';
export { AllocationGrid } from './components/AllocationGrid';
export { AllocationCalendar } from './components/AllocationCalendar';
export { AllocationExport } from './components/AllocationExport';

// Hooks
export { useAllocationOperations } from './hooks/useAllocationOperations';
export { useOverAllocationCheck } from './hooks/useOverAllocationCheck';

// Types
export type { 
  Allocation, 
  Employee, 
  Project, 
  AllocationFormData, 
  ValidationError 
} from './hooks/useAllocationOperations';

export type { 
  OverAllocationWarning 
} from './hooks/useOverAllocationCheck';