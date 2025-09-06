// Capacity Management Types
export interface CapacityEntry {
  id: string;
  employeeId: string;
  date: string; // ISO date string
  totalHours: number;
  allocatedHours: number;
  availableHours: number;
  status: AvailabilityStatus;
  projects: ProjectAllocation[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAllocation {
  id: string;
  projectId: string;
  projectName: string;
  allocatedHours: number;
  color?: string;
  priority: 'low' | 'medium' | 'high';
}

export type AvailabilityStatus = 
  | 'available' 
  | 'partially-available' 
  | 'busy' 
  | 'overbooked' 
  | 'out-of-office'
  | 'sick-leave' 
  | 'vacation';

export interface CapacitySearchParams {
  query?: string;
  minHours?: number;
  maxHours?: number;
  dateRange?: {
    start: string;
    end: string;
  };
  skillsets?: string[];
  availability?: AvailabilityStatus[];
  departments?: string[];
}

export interface WeeklyCapacityView {
  employeeId: string;
  employee: {
    firstName: string;
    lastName: string;
    position: string;
    department: string;
  };
  weekData: Array<{
    date: string;
    dayOfWeek: string;
    totalHours: number;
    allocatedHours: number;
    availableHours: number;
    status: AvailabilityStatus;
    projects: ProjectAllocation[];
  }>;
  weekSummary: {
    totalWeekHours: number;
    allocatedWeekHours: number;
    availableWeekHours: number;
    utilizationRate: number;
  };
}

export interface CapacityUpdateRequest {
  employeeId: string;
  date: string;
  totalHours: number;
  status?: AvailabilityStatus;
  notes?: string;
}