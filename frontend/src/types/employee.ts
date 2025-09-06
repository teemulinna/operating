// Capacity data that can be included with employee data
export interface EmployeeCapacityData {
  weeklyHours: number;
  availableHours: number;
  allocatedHours: number;
  status: 'available' | 'busy' | 'out-of-office';
  utilization: number;
  lastUpdated?: string;
}

// API Response Employee (matches backend exactly)
export interface ApiEmployee {
  id: string; // UUID string from backend
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  departmentId: string;
  departmentName: string;
  salary: string; // Backend returns string
  hireDate: string; // Backend uses hireDate, not startDate
  skills: string[];
  isActive: boolean; // Backend uses isActive, not status
  phone?: string;
  address?: string;
  emergencyContact?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  // Optional capacity fields from backend
  weekly_capacity_hours?: number;
  capacity?: EmployeeCapacityData;
}

// Capacity and Availability Types
export type AvailabilityStatus = 'available' | 'busy' | 'unavailable' | 'out-of-office';

export interface WeeklyCapacity {
  weeklyHours: number;
  allocatedHours: number;
  availableHours: number;
  utilizationRate: number; // Percentage
  lastUpdated: string;
}

export interface EmployeeCapacity {
  employeeId: string;
  weeklyCapacity: WeeklyCapacity;
  availabilityStatus: AvailabilityStatus;
  currentProjects: number;
  notes?: string;
}

// Frontend Employee (for display)
export interface Employee {
  id: string; // UUID string
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string; // Mapped from departmentName
  departmentId: string;
  position: string;
  salary: number; // Converted from string
  startDate: string; // Mapped from hireDate
  status: 'active' | 'inactive'; // Converted from isActive
  skills: string[];
  address?: string;
  emergencyContact?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  // Optional capacity information (for incremental enhancement)
  capacity?: EmployeeCapacity;
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  departmentId: string; // Backend expects departmentId
  position: string;
  salary: number; // Will be converted to string for API
  hireDate: string; // Backend expects hireDate
  isActive?: boolean; // Backend expects isActive
  skills?: string[];
  address?: string;
  emergencyContact?: string;
  notes?: string;
  // Optional capacity field
  weeklyCapacityHours?: number;
}

export interface UpdateEmployeeRequest extends Partial<CreateEmployeeRequest> {
  id: string; // UUID string
}

export interface EmployeeFilters {
  search?: string;
  department?: string;
  departmentId?: string; // Support filtering by departmentId
  position?: string;
  status?: 'active' | 'inactive' | 'all';
  isActive?: boolean; // Backend filtering uses isActive
  startDateFrom?: string; // Will map to hireDateFrom
  startDateTo?: string; // Will map to hireDateTo
  hireDateFrom?: string; // Backend field names
  hireDateTo?: string;
  salaryMin?: number;
  salaryMax?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: keyof Employee;
  sortOrder?: 'asc' | 'desc';
}

// API Response structure (matches backend exactly)
export interface ApiEmployeesResponse {
  data: ApiEmployee[];
  pagination: {
    currentPage: number;
    totalItems: number;
    totalPages?: number;
    limit?: number;
  };
}

// Frontend response structure
export interface EmployeesResponse {
  employees: Employee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface CSVExportOptions {
  includeInactive?: boolean;
  fields?: (keyof Employee)[];
}

// Helper function to transform API employee to frontend employee
export function transformApiEmployee(apiEmployee: ApiEmployee): Employee {
  return {
    id: apiEmployee.id,
    firstName: apiEmployee.firstName,
    lastName: apiEmployee.lastName,
    email: apiEmployee.email,
    phone: apiEmployee.phone || '',
    department: apiEmployee.departmentName,
    departmentId: apiEmployee.departmentId,
    position: apiEmployee.position,
    salary: parseFloat(apiEmployee.salary) || 0,
    startDate: apiEmployee.hireDate,
    status: apiEmployee.isActive ? 'active' : 'inactive',
    skills: apiEmployee.skills || [],
    address: apiEmployee.address,
    emergencyContact: apiEmployee.emergencyContact,
    notes: apiEmployee.notes,
    createdAt: apiEmployee.createdAt,
    updatedAt: apiEmployee.updatedAt,
  };
}

// Helper function to transform frontend employee to API format for create/update
export function transformToApiRequest(employee: CreateEmployeeRequest): any {
  return {
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    phone: employee.phone,
    departmentId: employee.departmentId,
    position: employee.position,
    salary: employee.salary.toString(), // Convert number to string
    hireDate: employee.hireDate,
    isActive: employee.isActive !== undefined ? employee.isActive : true,
    skills: employee.skills || [],
    address: employee.address,
    emergencyContact: employee.emergencyContact,
    notes: employee.notes,
  };
}