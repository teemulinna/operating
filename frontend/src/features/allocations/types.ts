import { ApiResponse } from '../../types/api';

export type AllocationStatus = 'planned' | 'active' | 'completed' | 'cancelled';

export interface Employee {
  id: string | number;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
}

export interface Project {
  id: string | number;
  name: string;
  status: string;
}

export interface Allocation {
  id: string | number;
  employeeId: string;
  projectId: string | number;
  startDate: string;
  endDate: string;
  allocatedHours: number;
  roleOnProject: string;
  status: AllocationStatus;
  notes?: string;
  isActive: boolean;
}

export interface AllocationFormData {
  employeeId: string;
  projectId: string | number;
  startDate: string;
  endDate: string;
  allocatedHours: number;
  roleOnProject: string;
  status: AllocationStatus;
  notes?: string;
  isActive: boolean;
}

export interface AllocationCardProps {
  allocation: Allocation;
  employee?: Employee;
  project?: Project;
  onEdit: (allocation: Allocation) => void;
  onDelete: (allocation: Allocation) => void;
}

export interface AllocationFormProps {
  allocation?: Allocation | null;
  employees: Employee[];
  projects: Project[];
  onSubmit: (data: AllocationFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface AllocationDeleteDialogProps {
  allocation: Allocation | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface AllocationListProps {
  allocations: Allocation[];
  employees: Employee[];
  projects: Project[];
  onEdit: (allocation: Allocation) => void;
  onDelete: (allocation: Allocation) => void;
  loading?: boolean;
}

export interface OverAllocationWarningProps {
  employeeId: string;
  conflictingAllocations: Allocation[];
  totalHours: number;
  maxHours?: number;
}

export interface UseAllocationsHook {
  allocations: Allocation[];
  employees: Employee[];
  projects: Project[];
  loading: boolean;
  operationLoading: boolean;
  createAllocation: (data: AllocationFormData) => Promise<void>;
  updateAllocation: (id: string | number, data: Partial<AllocationFormData>) => Promise<void>;
  deleteAllocation: (id: string | number) => Promise<void>;
  refreshData: () => Promise<void>;
  detectOverAllocation: (employeeId: string) => Allocation[];
}

// API Response types for allocations
export interface AllocationApiResponse extends ApiResponse<Allocation[]> {
  data: Allocation[];
}

export interface CreateAllocationRequest extends Omit<AllocationFormData, 'id'> {}
export interface UpdateAllocationRequest extends Partial<CreateAllocationRequest> {
  id: string | number;
}