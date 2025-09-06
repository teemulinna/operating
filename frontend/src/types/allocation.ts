// Resource Allocation Types

export type AllocationStatus = 'active' | 'planned' | 'completed' | 'cancelled';
export type ConflictType = 'time_overlap' | 'overallocation' | 'availability' | 'skill_mismatch';

// API Response Allocation (matches backend)
export interface ApiAllocation {
  id: string; // UUID string from backend
  employeeId: string;
  projectId: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  allocatedHours: number; // Hours per week
  role?: string; // Role in the project
  status: AllocationStatus;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Related data from joins
  employeeName?: string;
  projectName?: string;
  clientName?: string;
}

// Frontend Allocation (for display)
export interface Allocation {
  id: string;
  employeeId: string;
  projectId: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  allocatedHours: number; // Hours per week
  role?: string;
  status: AllocationStatus;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Denormalized display fields
  employeeName?: string;
  projectName?: string;
  clientName?: string;
  // Calculated fields
  duration?: number; // Duration in days
  totalHours?: number; // Total hours across duration
  isOverdue?: boolean;
  isUpcoming?: boolean;
}

// Allocation conflict information
export interface AllocationConflict {
  id: string;
  type: ConflictType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedAllocations: string[]; // Allocation IDs
  suggestedResolution?: string;
  canAutoResolve: boolean;
}

// Employee utilization data
export interface EmployeeUtilization {
  employeeId: string;
  employeeName: string;
  weeklyCapacity: number; // Total available hours per week
  allocatedHours: number; // Currently allocated hours per week
  availableHours: number; // Available hours per week
  utilizationRate: number; // Percentage (0-100)
  overallocated: boolean;
  conflicts: AllocationConflict[];
  allocations: Allocation[];
}

// Project team allocation
export interface ProjectTeamAllocation {
  projectId: string;
  projectName: string;
  clientName: string;
  totalAllocatedHours: number;
  teamMembers: {
    employeeId: string;
    employeeName: string;
    role: string;
    allocatedHours: number;
    allocation: Allocation;
  }[];
  requiredSkills: string[];
  missingSkills: string[];
}

export interface CreateAllocationRequest {
  employeeId: string;
  projectId: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  allocatedHours: number;
  role?: string;
  status?: AllocationStatus;
  notes?: string;
  isActive?: boolean;
  // Conflict checking options
  checkConflicts?: boolean;
  forceCreate?: boolean; // Create even if conflicts exist
}

export interface UpdateAllocationRequest extends Partial<CreateAllocationRequest> {
  id: string;
}

export interface AllocationFilters {
  search?: string;
  employeeId?: string;
  projectId?: string;
  status?: AllocationStatus | 'all';
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  allocatedHoursMin?: number;
  allocatedHoursMax?: number;
  role?: string;
  isActive?: boolean;
  hasConflicts?: boolean;
  isOverallocated?: boolean;
}

export interface AllocationPaginationParams {
  page?: number;
  limit?: number;
  sortBy?: keyof Allocation;
  sortOrder?: 'asc' | 'desc';
}

// API Response structure (matches backend)
export interface ApiAllocationsResponse {
  data: ApiAllocation[];
  pagination: {
    currentPage: number;
    totalItems: number;
    totalPages?: number;
    limit?: number;
  };
  conflicts?: AllocationConflict[];
}

// Frontend response structure
export interface AllocationsResponse {
  allocations: Allocation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  conflicts?: AllocationConflict[];
}

// Calendar view types
export interface CalendarWeek {
  weekStart: Date;
  days: CalendarDay[];
}

export interface CalendarDay {
  date: Date;
  isToday: boolean;
  isWeekend: boolean;
  allocations: Allocation[];
}

export interface DragDropAllocation {
  allocationId: string;
  employeeId: string;
  projectId: string;
  originalStartDate: string;
  originalEndDate: string;
  newStartDate: string;
  newEndDate: string;
  allocatedHours: number;
}

// Timeline view types
export interface TimelineEntry {
  id: string;
  type: 'allocation' | 'milestone' | 'vacation' | 'holiday';
  title: string;
  startDate: string;
  endDate?: string;
  color: string;
  allocation?: Allocation;
  metadata?: Record<string, unknown>;
}

// Conflict resolution types
export interface ConflictResolution {
  conflictId: string;
  resolutionType: 'reschedule' | 'reduce_hours' | 'reassign' | 'split_allocation' | 'ignore';
  parameters?: {
    newStartDate?: string;
    newEndDate?: string;
    newAllocatedHours?: number;
    newEmployeeId?: string;
    splitDate?: string;
  };
  reason?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

// Helper functions
export function transformApiAllocation(apiAllocation: ApiAllocation): Allocation {
  const startDate = new Date(apiAllocation.startDate);
  const endDate = new Date(apiAllocation.endDate);
  const now = new Date();
  
  // Calculate derived fields
  const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const totalHours = (duration / 7) * apiAllocation.allocatedHours; // Approximate total hours
  const isOverdue = endDate < now && apiAllocation.status === 'active';
  const isUpcoming = startDate > now;

  return {
    id: apiAllocation.id,
    employeeId: apiAllocation.employeeId,
    projectId: apiAllocation.projectId,
    startDate: apiAllocation.startDate,
    endDate: apiAllocation.endDate,
    allocatedHours: apiAllocation.allocatedHours,
    role: apiAllocation.role,
    status: apiAllocation.status,
    notes: apiAllocation.notes,
    isActive: apiAllocation.isActive,
    createdAt: apiAllocation.createdAt,
    updatedAt: apiAllocation.updatedAt,
    employeeName: apiAllocation.employeeName,
    projectName: apiAllocation.projectName,
    clientName: apiAllocation.clientName,
    duration,
    totalHours: Math.round(totalHours),
    isOverdue,
    isUpcoming,
  };
}

export function transformToApiRequest(allocation: CreateAllocationRequest): any {
  return {
    employeeId: allocation.employeeId,
    projectId: allocation.projectId,
    startDate: allocation.startDate,
    endDate: allocation.endDate,
    allocatedHours: allocation.allocatedHours,
    role: allocation.role,
    status: allocation.status || 'planned',
    notes: allocation.notes,
    isActive: allocation.isActive !== undefined ? allocation.isActive : true,
  };
}

// Status badge color mappings
export const ALLOCATION_STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  planned: 'bg-blue-100 text-blue-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
} as const;

// Conflict severity color mappings
export const CONFLICT_SEVERITY_COLORS = {
  low: 'bg-yellow-100 text-yellow-800',
  medium: 'bg-orange-100 text-orange-800',
  high: 'bg-red-100 text-red-800',
  critical: 'bg-purple-100 text-purple-800',
} as const;