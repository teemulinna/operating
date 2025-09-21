/**
 * Employee types updated to match actual UUID database schema
 */

export interface Employee {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  departmentId: string;
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
  departmentId: string;
  salary: number;
  skills?: string[];
}

export interface UpdateEmployeeRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  position?: string;
  departmentId?: string;
  salary?: number;
  skills?: string[];
  isActive?: boolean;
}

export interface EmployeeQuery {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string | undefined;
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
  id?: string;
  name: string;
  description?: string;
  managerId?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
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