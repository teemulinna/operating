const API_BASE_URL = 'http://localhost:3001/api';

// Real backend employee structure
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  departmentId: string;
  departmentName?: string;
  salary: string;
  hireDate: string;
  skills: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Computed properties for UI
  name?: string;
  role?: string;
  department?: string;
  capacity?: number;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  managerId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface EmployeeResponse {
  data: Employee[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class EnhancedApiService {
  private async fetchWithErrorHandling<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`API Error: ${error.message}`);
      }
      throw new Error('Unknown API error occurred');
    }
  }

  // Employee API methods - using real backend capacity data
  async getEmployees(): Promise<Employee[]> {
    const response = await this.fetchWithErrorHandling<EmployeeResponse>('/employees');
    // Transform backend data to include computed UI properties and real capacity
    const employees = response.data.map(emp => ({
      ...emp,
      name: `${emp.firstName} ${emp.lastName}`,
      role: emp.position,
      department: emp.departmentName || 'Unknown',
    }));
    
    // Get real capacity data for each employee
    for (const emp of employees) {
      try {
        const capacityData = await this.fetchWithErrorHandling<{ capacity: number }>(`/capacity/${emp.id}`);
        emp.capacity = capacityData.capacity;
      } catch (error) {
        // If no capacity data available, default to 0
        emp.capacity = 0;
      }
    }
    
    return employees;
  }

  async getEmployee(id: string): Promise<Employee> {
    const employee = await this.fetchWithErrorHandling<Employee>(`/employees/${id}`);
    let capacity = 0;
    
    try {
      const capacityData = await this.fetchWithErrorHandling<{ capacity: number }>(`/capacity/${id}`);
      capacity = capacityData.capacity;
    } catch (error) {
      // If no capacity data available, default to 0
      capacity = 0;
    }
    
    return {
      ...employee,
      name: `${employee.firstName} ${employee.lastName}`,
      role: employee.position,
      department: employee.departmentName || 'Unknown',
      capacity,
    };
  }

  async getDepartments(): Promise<Department[]> {
    return this.fetchWithErrorHandling<Department[]>('/departments');
  }

  async createEmployee(employee: CreateEmployeeRequest): Promise<Employee> {
    const created = await this.fetchWithErrorHandling<Employee>('/employees', {
      method: 'POST',
      body: JSON.stringify(employee),
    });
    
    // New employees start with 0 capacity until allocated
    return {
      ...created,
      name: `${created.firstName} ${created.lastName}`,
      role: created.position,
      department: created.departmentName || 'Unknown',
      capacity: 0,
    };
  }

  async updateEmployee(id: string, employee: UpdateEmployeeRequest): Promise<Employee> {
    const updated = await this.fetchWithErrorHandling<Employee>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employee),
    });
    
    let capacity = 0;
    try {
      const capacityData = await this.fetchWithErrorHandling<{ capacity: number }>(`/capacity/${id}`);
      capacity = capacityData.capacity;
    } catch (error) {
      capacity = 0;
    }
    
    return {
      ...updated,
      name: `${updated.firstName} ${updated.lastName}`,
      role: updated.position,
      department: updated.departmentName || 'Unknown',
      capacity,
    };
  }

  async deleteEmployee(id: string): Promise<void> {
    await this.fetchWithErrorHandling<void>(`/employees/${id}`, {
      method: 'DELETE',
    });
  }

  // Get employee capacity data from real backend
  async getEmployeeCapacity(employeeId: string }> {
    try {
      const capacityData = await this.fetchWithErrorHandling<{ 
        capacity: number; 
        allocatedHours: number; 
        totalHours: number; 
      }>(`/capacity/${employeeId}`);
      
      return capacityData;
    } catch (error) {
      // Return default values if no capacity data found
      return {
        capacity: 0,
        allocatedHours: 0,
        totalHours: 40,
      };
    }
  }

  // Analytics methods with real capacity data
  async getEmployeeCapacityAnalytics(): Promise<{
    overutilized: number;
    wellUtilized: number;
    available: number;
    averageCapacity: number;
  }> {
    const employees = await this.getEmployees();
    const overutilized = employees.filter(e => (e.capacity || 0) > 100).length;
    const available = employees.filter(e => (e.capacity || 0) < 60).length;
    const wellUtilized = employees.length - overutilized - available;
    const averageCapacity = employees.length > 0 
      ? Math.round(employees.reduce((sum, emp) => sum + (emp.capacity || 0), 0) / employees.length)
      : 0;

    return {
      overutilized,
      wellUtilized,
      available,
      averageCapacity,
    };
  }

  async getDepartmentDistribution(): Promise<Record<string, number>> {
    const employees = await this.getEmployees();
    return employees.reduce((acc, emp) => {
      const dept = emp.department || 'Unknown';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  async getSkillDistribution(): Promise<Record<string, number>> {
    const employees = await this.getEmployees();
    return employees.reduce((acc, emp) => {
      emp.skills.forEach(skill => {
        acc[skill] = (acc[skill] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
  }
}

export const enhancedApiService = new EnhancedApiService();
export default enhancedApiService;