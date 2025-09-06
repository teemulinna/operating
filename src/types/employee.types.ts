export interface Employee {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  departmentId: number;
  salary: number;
  hireDate?: string;
  skills?: string[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  departmentId: number;
  salary: number;
  skills?: string[];
}

export interface UpdateEmployeeRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  position?: string;
  departmentId?: number;
  salary?: number;
  skills?: string[];
  isActive?: boolean;
}

export interface EmployeeQuery {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: number | undefined;
  position?: string;
  skills?: string;
  salaryMin?: number | undefined;
  salaryMax?: number | undefined;
  isActive?: boolean | undefined;
  sortBy?: 'firstName' | 'lastName' | 'salary' | 'hireDate';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface Department {
  id?: number;
  name: string;
  description?: string;
  managerId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Skill {
  name: string;
  count?: number;
}

export interface BulkImportResponse {
  imported: number;
  errors: Array<{
    row: number;
    error: string;
    data: any;
  }>;
  duplicates: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface ErrorResponse {
  error: string;
  message?: string;
  details?: any;
  timestamp: string;
  path: string;
}