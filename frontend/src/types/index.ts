import { Request } from 'express';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  position: string;
  departmentId: string;
  salary: number;
  hireDate: Date;
  status: 'active' | 'inactive' | 'terminated';
  skills: string[];
  managerId?: string;
  profileImage?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  managerId?: string;
  budget?: number;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  description?: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'hr' | 'manager' | 'employee';
  employeeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest extends Request {
  user?: User;
}

export interface SearchFilters {
  department?: string;
  position?: string;
  skills?: string[];
  status?: string;
  salaryMin?: number;
  salaryMax?: number;
  hireDate?: {
    from?: Date;
    to?: Date;
  };
}

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}