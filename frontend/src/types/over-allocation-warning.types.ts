export type OverAllocationSeverity = 'none' | 'medium' | 'high' | 'critical';

export interface OverAllocationWarning {
  isOverAllocated: boolean;
  employeeId: string;
  employeeName: string;
  totalAllocatedHours: number;
  defaultHours: number;
  overAllocationHours: number;
  utilizationRate: number;
  severity: OverAllocationSeverity;
  warnings: string[];
  suggestions?: string[];
}

export interface AllocationValidation {
  employeeId: string;
  proposedHours: number;
  startDate: Date;
  endDate: Date;
}

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  severity: OverAllocationSeverity;
  suggestedActions: string[];
}

export interface OverAllocationCalculation {
  totalAllocatedHours: number;
  defaultHours: number;
  overAllocationHours: number;
  utilizationRate: number;
  isOverAllocated: boolean;
  hasOverlap?: boolean;
  maxUtilizationRate?: number;
}

export interface AllocationPeriod {
  allocatedHours: number;
  startDate: Date;
  endDate: Date;
  projectName?: string;
  projectId?: string;
}