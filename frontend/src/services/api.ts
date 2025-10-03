import { BaseService, PaginatedResponse, ServiceError } from './base.service';
import axios from 'axios';

// Backend response types (matching actual database and API structure)
export interface BackendEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  departmentId: string;
  departmentName?: string;
  salary: string | number;
  hireDate?: string;
  skills: string[];
  isActive: boolean;
  weeklyCapacity?: string | number;
  createdAt: string;
  updatedAt: string;
}

export interface BackendProject {
  id: number;
  name: string;
  description: string;
  client_name?: string;
  status: 'active' | 'inactive' | 'completed' | 'planning';
  start_date: string;
  end_date: string;
  budget?: string | number;
  hourly_rate?: string | number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimated_hours?: number;
  actual_hours?: string | number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface BackendAllocation {
  id: number;
  employeeId: string;
  projectId: number;
  hours: number;
  date: string;
  week?: string;
  status: 'active' | 'inactive' | 'completed' | 'pending' | 'planned' | 'cancelled';
  billableRate?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Frontend types (normalized for UI consumption)
export interface Employee {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  role?: string; // Alias for position
  department: string;
  departmentId: string;
  salary: number;
  skills: string[];
  capacity?: number;
  weeklyCapacity?: number;
  status: 'active' | 'inactive';
  startDate?: string;
  hireDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'completed' | 'planning';
  startDate: string;
  endDate: string;
  budget?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  manager?: string;
  clientName?: string;
  progress?: number;
  estimatedHours?: number;
  actualHours?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Allocation {
  id: string | number; // Support both backend number and frontend string
  employeeId: string;
  projectId: string | number; // Support both string and number projectIds
  hours: number;
  allocatedHours?: number; // Some APIs return this instead of hours
  date?: string;
  startDate?: string;
  endDate?: string;
  week?: string;
  status?: 'active' | 'inactive' | 'completed' | 'pending' | 'planned' | 'cancelled';
  isActive?: boolean; // Some APIs return this instead of status
  billableRate?: number;
  notes?: string;
  roleOnProject?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateAllocationData = Omit<Allocation, 'id' | 'createdAt' | 'updatedAt'>;

// Data transformation utilities
export class DataTransformer {
  static toEmployee(backend: BackendEmployee): Employee {
    return {
      id: backend.id,
      name: `${backend.firstName} ${backend.lastName}`,
      firstName: backend.firstName,
      lastName: backend.lastName,
      email: backend.email,
      position: backend.position,
      role: backend.position, // Alias for compatibility
      department: backend.departmentName || '',
      departmentId: backend.departmentId,
      salary: typeof backend.salary === 'string' ? parseFloat(backend.salary) : backend.salary,
      skills: backend.skills || [],
      weeklyCapacity: backend.weeklyCapacity !== undefined ? Number(backend.weeklyCapacity) : undefined,
      capacity: backend.weeklyCapacity !== undefined ? Number(backend.weeklyCapacity) : 100,
      status: backend.isActive ? 'active' : 'inactive',
      startDate: backend.hireDate,
      hireDate: backend.hireDate,
      createdAt: backend.createdAt,
      updatedAt: backend.updatedAt,
    };
  }

  static fromEmployee(frontend: Partial<Employee>): Partial<BackendEmployee> {
    const backend: Partial<BackendEmployee> = {};
    
    if (frontend.firstName !== undefined) backend.firstName = frontend.firstName;
    if (frontend.lastName !== undefined) backend.lastName = frontend.lastName;
    if (frontend.email !== undefined) backend.email = frontend.email;
    if (frontend.position !== undefined) backend.position = frontend.position;
    if (frontend.role !== undefined) backend.position = frontend.role; // Map role to position
    if (frontend.departmentId !== undefined) backend.departmentId = frontend.departmentId;
    if (frontend.salary !== undefined) backend.salary = frontend.salary;
    if (frontend.skills !== undefined) backend.skills = frontend.skills;
    if (frontend.status !== undefined) backend.isActive = frontend.status === 'active';
    if (frontend.hireDate !== undefined) backend.hireDate = frontend.hireDate;
    if (frontend.startDate !== undefined) backend.hireDate = frontend.startDate;
    if (frontend.weeklyCapacity !== undefined) backend.weeklyCapacity = frontend.weeklyCapacity;
    
    return backend;
  }

  static toProject(backend: BackendProject): Project {
    return {
      id: backend.id,
      name: backend.name,
      description: backend.description,
      status: backend.status,
      startDate: backend.start_date,
      endDate: backend.end_date,
      budget: backend.budget ? 
        (typeof backend.budget === 'string' ? parseFloat(backend.budget) : backend.budget) : 
        undefined,
      priority: backend.priority,
      clientName: backend.client_name,
      estimatedHours: backend.estimated_hours,
      actualHours: backend.actual_hours ? 
        (typeof backend.actual_hours === 'string' ? parseFloat(backend.actual_hours) : backend.actual_hours) : 
        undefined,
      createdAt: backend.created_at,
      updatedAt: backend.updated_at,
    };
  }

  static fromProject(frontend: Partial<Project>): any {
    const backend: any = {};
    
    if (frontend.name !== undefined) backend.name = frontend.name;
    if (frontend.description !== undefined) backend.description = frontend.description;
    if (frontend.status !== undefined) backend.status = frontend.status;
    if (frontend.startDate !== undefined) backend.start_date = frontend.startDate;
    if (frontend.endDate !== undefined) backend.end_date = frontend.endDate;
    if (frontend.budget !== undefined) backend.budget = frontend.budget;
    if (frontend.priority !== undefined) backend.priority = frontend.priority;
    if (frontend.clientName !== undefined) backend.client_name = frontend.clientName;
    if (frontend.estimatedHours !== undefined) backend.estimated_hours = frontend.estimatedHours;
    
    return backend;
  }

  static toAllocation(backend: BackendAllocation): Allocation {
    return {
      ...backend,
      id: backend.id.toString(), // Convert number ID to string for frontend consistency
    };
  }

  static fromAllocation(frontend: Partial<Allocation>): Partial<BackendAllocation> {
    const backend: Partial<BackendAllocation> = {};

    // Convert string ID back to number for backend
    if (frontend.id !== undefined) {
      backend.id = typeof frontend.id === 'string' ? parseInt(frontend.id, 10) : frontend.id as number;
    }
    if (frontend.projectId !== undefined) {
      backend.projectId = typeof frontend.projectId === 'string' ? parseInt(frontend.projectId, 10) : frontend.projectId as number;
    }
    if (frontend.employeeId !== undefined) backend.employeeId = frontend.employeeId;
    if (frontend.hours !== undefined) backend.hours = frontend.hours;
    if (frontend.date !== undefined) backend.date = frontend.date;
    if (frontend.status !== undefined) backend.status = frontend.status;
    if (frontend.notes !== undefined) backend.notes = frontend.notes;

    return backend;
  }
}

// Service implementations
export class EmployeeService extends BaseService {
  constructor() {
    super('/employees');
  }

  async getAllEmployees(params?: any): Promise<PaginatedResponse<Employee>> {
    const response = await super.getAll<BackendEmployee>(params);
    return {
      data: response.data.map(DataTransformer.toEmployee),
      pagination: response.pagination,
    };
  }

  async getEmployeeById(id: string): Promise<Employee> {
    const response = await super.getById<BackendEmployee>(id);
    return DataTransformer.toEmployee(response);
  }

  async createEmployee(data: Partial<Employee>): Promise<Employee> {
    const backendData = DataTransformer.fromEmployee(data);
    const response = await super.create<BackendEmployee>(backendData);
    return DataTransformer.toEmployee(response);
  }

  async updateEmployee(id: string, data: Partial<Employee>): Promise<Employee> {
    const backendData = DataTransformer.fromEmployee(data);
    const response = await super.update<BackendEmployee>(id, backendData);
    return DataTransformer.toEmployee(response);
  }

  async getByEmail(email: string): Promise<Employee | null> {
    try {
      const response = await this.request<BackendEmployee>({
        method: 'GET',
        url: `${this.resourcePath}/by-email/${email}`,
      });
      return DataTransformer.toEmployee(response);
    } catch (error) {
      if (error instanceof ServiceError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async bulkCreate(employees: Partial<Employee>[]): Promise<Employee[]> {
    const backendData = employees.map(DataTransformer.fromEmployee);
    const response = await this.request<BackendEmployee[]>({
      method: 'POST',
      url: `${this.resourcePath}/bulk`,
      data: backendData,
    });
    return response.map(DataTransformer.toEmployee);
  }
}

export class ProjectService extends BaseService {
  constructor() {
    super('/projects');
  }

  override async getAll<T = BackendProject>(params?: any): Promise<PaginatedResponse<T>> {
    const response = await this.request<any>({
      method: 'GET',
      url: this.resourcePath,
      params,
    });

    // Handle the backend response format
    const projects = response.data ?
      response.data.map(DataTransformer.toProject) :
      [];

    return {
      data: projects as T[],
      pagination: response.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalItems: projects.length,
        limit: params?.limit || 20,
        hasNext: false,
        hasPrev: false,
      },
    } as PaginatedResponse<T>;
  }

  async getProjectById(id: number): Promise<Project> {
    const response = await this.request<any>({
      method: 'GET',
      url: `${this.resourcePath}/${id}`,
    });

    // Handle wrapped response
    const projectData = response.data || response;
    return DataTransformer.toProject(projectData);
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    const backendData = DataTransformer.fromProject(data);
    const response = await this.request<any>({
      method: 'POST',
      url: this.resourcePath,
      data: backendData,
    });

    // Handle wrapped response
    const projectData = response.data || response;
    return DataTransformer.toProject(projectData);
  }

  async updateProject(id: number, data: Partial<Project>): Promise<Project> {
    const backendData = DataTransformer.fromProject(data);
    const response = await this.request<any>({
      method: 'PUT',
      url: `${this.resourcePath}/${id}`,
      data: backendData,
    });

    // Handle wrapped response
    const projectData = response.data || response;
    return DataTransformer.toProject(projectData);
  }

  async assignResources(projectId: number, resourceIds: string[]): Promise<void> {
    await this.request<void>({
      method: 'POST',
      url: `${this.resourcePath}/${projectId}/resources`,
      data: { resourceIds },
    });
  }
}

export class AllocationService extends BaseService {
  constructor() {
    super('/allocations');
  }

  async getAllAllocations(params?: any): Promise<PaginatedResponse<Allocation>> {
    const response = await super.getAll<BackendAllocation>(params);
    return {
      data: response.data.map(DataTransformer.toAllocation),
      pagination: response.pagination,
    };
  }

  async getAllocationById(id: number): Promise<Allocation> {
    const response = await super.getById<BackendAllocation>(id);
    return DataTransformer.toAllocation(response);
  }

  async createAllocation(data: Partial<Allocation>): Promise<Allocation> {
    const backendData = DataTransformer.fromAllocation(data);
    const response = await super.create<BackendAllocation>(backendData);
    return DataTransformer.toAllocation(response);
  }

  async updateAllocation(id: number, data: Partial<Allocation>): Promise<Allocation> {
    const backendData = DataTransformer.fromAllocation(data);
    const response = await super.update<BackendAllocation>(id, backendData);
    return DataTransformer.toAllocation(response);
  }

  async getByEmployee(employeeId: string): Promise<Allocation[]> {
    const response = await this.request<BackendAllocation[]>({
      method: 'GET',
      url: `${this.resourcePath}/employee/${employeeId}`,
    });
    return response.map(DataTransformer.toAllocation);
  }

  async getByProject(projectId: number): Promise<Allocation[]> {
    const response = await this.request<BackendAllocation[]>({
      method: 'GET',
      url: `${this.resourcePath}/project/${projectId}`,
    });
    return response.map(DataTransformer.toAllocation);
  }
}

// Analytics service
export class AnalyticsService extends BaseService {
  constructor() {
    super('/analytics');
  }

  async getDashboardStats(): Promise<{
    employeeCount: number;
    projectCount: number;
    utilizationRate: number;
    allocationCount: number;
  }> {
    return this.request({
      method: 'GET',
      url: `${this.resourcePath}/stats`,
    });
  }

  async getCapacityAnalysis(): Promise<any> {
    return this.request({
      method: 'GET',
      url: `${this.resourcePath}/capacity`,
    });
  }

  async getProjectAnalytics(projectId?: number): Promise<any> {
    return this.request({
      method: 'GET',
      url: projectId ? 
        `${this.resourcePath}/projects/${projectId}` :
        `${this.resourcePath}/projects`,
    });
  }

  async getEmployeeAnalytics(employeeId?: string): Promise<any> {
    return this.request({
      method: 'GET',
      url: employeeId ? 
        `${this.resourcePath}/employees/${employeeId}` :
        `${this.resourcePath}/employees`,
    });
  }
}

// Service factory for creating service instances
export class ServiceFactory {
  private static employeeService: EmployeeService | null = null;
  private static projectService: ProjectService | null = null;
  private static allocationService: AllocationService | null = null;
  private static analyticsService: AnalyticsService | null = null;

  static getEmployeeService(): EmployeeService {
    if (!this.employeeService) {
      this.employeeService = new EmployeeService();
    }
    return this.employeeService;
  }

  static getProjectService(): ProjectService {
    if (!this.projectService) {
      this.projectService = new ProjectService();
    }
    return this.projectService;
  }

  static getAllocationService(): AllocationService {
    if (!this.allocationService) {
      this.allocationService = new AllocationService();
    }
    return this.allocationService;
  }

  static getAnalyticsService(): AnalyticsService {
    if (!this.analyticsService) {
      this.analyticsService = new AnalyticsService();
    }
    return this.analyticsService;
  }

  static resetAll(): void {
    this.employeeService = null;
    this.projectService = null;
    this.allocationService = null;
    this.analyticsService = null;
  }
}

// Create a simple axios client for backward compatibility
const createApiClient = () => {
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  
  const client = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    }
  });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return client;
};

export const apiClient = createApiClient();

// Export convenience functions for backward compatibility
export const apiService = {
  // Employee operations
  async getEmployees(): Promise<Employee[]> {
    const service = ServiceFactory.getEmployeeService();
    const response = await service.getAllEmployees();
    return response.data;
  },
  
  async getEmployee(id: string) {
    const service = ServiceFactory.getEmployeeService();
    try {
      return await service.getById(id);
    } catch (error) {
      if (error instanceof ServiceError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  },
  
  async createEmployee(data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) {
    const service = ServiceFactory.getEmployeeService();
    return service.create(data);
  },
  
  async updateEmployee(id: string, data: Partial<Employee>) {
    const service = ServiceFactory.getEmployeeService();
    try {
      return await service.update(id, data);
    } catch (error) {
      if (error instanceof ServiceError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  },
  
  async deleteEmployee(id: string) {
    const service = ServiceFactory.getEmployeeService();
    try {
      await service.delete(id);
      return true;
    } catch (error) {
      if (error instanceof ServiceError && error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  },
  
  // Project operations
  async getProjects(): Promise<Project[]> {
    const service = ServiceFactory.getProjectService();
    const response = await service.getAll();
    return response.data.map(DataTransformer.toProject);
  },
  
  async getProject(id: number) {
    const service = ServiceFactory.getProjectService();
    try {
      return await service.getById(id);
    } catch (error) {
      if (error instanceof ServiceError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  },
  
  async createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) {
    const service = ServiceFactory.getProjectService();
    return service.create(data);
  },
  
  async updateProject(id: number, data: Partial<Project>) {
    const service = ServiceFactory.getProjectService();
    try {
      return await service.update(id, data);
    } catch (error) {
      if (error instanceof ServiceError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  },
  
  async deleteProject(id: number) {
    const service = ServiceFactory.getProjectService();
    try {
      await service.delete(id);
      return true;
    } catch (error) {
      if (error instanceof ServiceError && error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  },
  
  // Allocation operations
  async getAllocations(): Promise<Allocation[]> {
    const service = ServiceFactory.getAllocationService();
    const response = await service.getAllAllocations();
    return response.data;
  },
  
  async getAllocation(id: number) {
    const service = ServiceFactory.getAllocationService();
    try {
      return await service.getById(id);
    } catch (error) {
      if (error instanceof ServiceError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  },
  
  async createAllocation(data: CreateAllocationData) {
    const service = ServiceFactory.getAllocationService();
    return service.createAllocation(data);
  },
  
  async updateAllocation(id: number, data: Partial<Allocation>) {
    const service = ServiceFactory.getAllocationService();
    try {
      return await service.update(id, data);
    } catch (error) {
      if (error instanceof ServiceError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  },
  
  async deleteAllocation(id: number) {
    const service = ServiceFactory.getAllocationService();
    try {
      await service.delete(id);
      return true;
    } catch (error) {
      if (error instanceof ServiceError && error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  },
  
  // Analytics operations
  async getAnalytics() {
    const service = ServiceFactory.getAnalyticsService();
    return service.getCapacityAnalysis();
  },
  
  async getDashboardStats() {
    const service = ServiceFactory.getAnalyticsService();
    return service.getDashboardStats();
  },
};

// Export service instances for direct use
export const employeeService = ServiceFactory.getEmployeeService();
export const projectService = ServiceFactory.getProjectService();
export const allocationService = ServiceFactory.getAllocationService();
export const analyticsService = ServiceFactory.getAnalyticsService();

// Export types and utilities
export { ServiceError };
export type { PaginatedResponse };