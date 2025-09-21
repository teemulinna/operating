import axios from 'axios';

export interface Department {
  id: string;
  name: string;
  description: string;
  managerId: string | null;
  managerName: string;
  employeeCount: string | number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentData {
  name: string;
  description?: string;
  managerId?: string;
}

export interface UpdateDepartmentData {
  name?: string;
  description?: string;
  managerId?: string;
}

export interface DepartmentEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  salary: number;
  hireDate: string;
  skills: string[];
  isActive: boolean;
}

export interface DepartmentAnalytics {
  departmentOverview: Array<{
    id: string;
    name: string;
    employee_count: number;
    avg_salary: number;
    min_salary: number;
    max_salary: number;
  }>;
  departmentGrowth: Array<{
    department: string;
    month: string;
    new_hires: number;
  }>;
  skillsByDepartment: Array<{
    department: string;
    skill: string;
    skill_count: number;
  }>;
}

class DepartmentService {
  private baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api') + '/departments';

  /**
   * Get all departments
   */
  async getDepartments(): Promise<Department[]> {
    try {
      const response = await axios.get(this.baseUrl);
      return response.data;
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
  }

  /**
   * Get department by ID
   */
  async getDepartmentById(id: string): Promise<Department> {
    try {
      const response = await axios.get(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching department ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create new department
   */
  async createDepartment(departmentData: CreateDepartmentData): Promise<Department> {
    try {
      const response = await axios.post(this.baseUrl, departmentData);
      return response.data;
    } catch (error) {
      console.error('Error creating department:', error);
      throw error;
    }
  }

  /**
   * Update department
   */
  async updateDepartment(id: string, updateData: UpdateDepartmentData): Promise<Department> {
    try {
      const response = await axios.put(`${this.baseUrl}/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error(`Error updating department ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete department
   */
  async deleteDepartment(id: string): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/${id}`);
    } catch (error) {
      console.error(`Error deleting department ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get department employees
   */
  async getDepartmentEmployees(id: string): Promise<DepartmentEmployee[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/${id}/employees`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching department ${id} employees:`, error);
      throw error;
    }
  }

  /**
   * Get department analytics (requires admin/hr role)
   */
  async getDepartmentAnalytics(): Promise<DepartmentAnalytics> {
    try {
      const response = await axios.get(`${this.baseUrl}/analytics`);
      return response.data;
    } catch (error) {
      console.error('Error fetching department analytics:', error);
      throw error;
    }
  }

  /**
   * Get departments formatted for select options
   */
  async getDepartmentOptions(): Promise<Array<{ value: string; label: string }>> {
    try {
      const departments = await this.getDepartments();
      return departments.map(dept => ({
        value: dept.id,
        label: dept.name
      }));
    } catch (error) {
      console.error('Error fetching department options:', error);
      throw error;
    }
  }
}

export default new DepartmentService();
export { DepartmentService };