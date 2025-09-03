import axios from 'axios';
import type { 
  Employee, 
  CreateEmployeeRequest, 
  UpdateEmployeeRequest, 
  EmployeeFilters, 
  PaginationParams, 
  EmployeesResponse,
  ApiError 
} from '@/types/employee';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor for authentication (if needed in future)
apiClient.interceptors.request.use((config) => {
  // Add auth token if available
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError: ApiError = {
      message: error.response?.data?.message || error.message || 'An error occurred',
      code: error.response?.status?.toString(),
      details: error.response?.data,
    };
    return Promise.reject(apiError);
  }
);

export class EmployeeService {
  /**
   * Get all employees with optional filtering and pagination
   */
  static async getEmployees(
    filters: EmployeeFilters = {},
    pagination: PaginationParams = {}
  ): Promise<EmployeesResponse> {
    const params = new URLSearchParams();
    
    // Add filter params
    if (filters.search) params.append('search', filters.search);
    if (filters.department) params.append('department', filters.department);
    if (filters.position) params.append('position', filters.position);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.startDateFrom) params.append('startDateFrom', filters.startDateFrom);
    if (filters.startDateTo) params.append('startDateTo', filters.startDateTo);
    if (filters.salaryMin !== undefined) params.append('salaryMin', filters.salaryMin.toString());
    if (filters.salaryMax !== undefined) params.append('salaryMax', filters.salaryMax.toString());

    // Add pagination params
    if (pagination.page) params.append('page', pagination.page.toString());
    if (pagination.limit) params.append('limit', pagination.limit.toString());
    if (pagination.sortBy) params.append('sortBy', pagination.sortBy);
    if (pagination.sortOrder) params.append('sortOrder', pagination.sortOrder);

    const response = await apiClient.get<EmployeesResponse>(`/employees?${params.toString()}`);
    return response.data;
  }

  /**
   * Get a single employee by ID
   */
  static async getEmployee(id: number): Promise<Employee> {
    const response = await apiClient.get<Employee>(`/employees/${id}`);
    return response.data;
  }

  /**
   * Create a new employee
   */
  static async createEmployee(employee: CreateEmployeeRequest): Promise<Employee> {
    const response = await apiClient.post<Employee>('/employees', employee);
    return response.data;
  }

  /**
   * Update an existing employee
   */
  static async updateEmployee(id: number, updates: Omit<UpdateEmployeeRequest, 'id'>): Promise<Employee> {
    const response = await apiClient.put<Employee>(`/employees/${id}`, updates);
    return response.data;
  }

  /**
   * Delete an employee
   */
  static async deleteEmployee(id: number): Promise<void> {
    await apiClient.delete(`/employees/${id}`);
  }

  /**
   * Get unique departments
   */
  static async getDepartments(): Promise<string[]> {
    const response = await apiClient.get<string[]>('/employees/departments');
    return response.data;
  }

  /**
   * Get unique positions
   */
  static async getPositions(): Promise<string[]> {
    const response = await apiClient.get<string[]>('/employees/positions');
    return response.data;
  }

  /**
   * Export employees as CSV
   */
  static async exportCSV(filters: EmployeeFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.department) params.append('department', filters.department);
    if (filters.position) params.append('position', filters.position);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);

    const response = await apiClient.get(`/employees/export/csv?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Import employees from CSV
   */
  static async importCSV(file: File): Promise<{ imported: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<{ imported: number; errors: string[] }>(
      '/employees/import/csv',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }
}

export default EmployeeService;