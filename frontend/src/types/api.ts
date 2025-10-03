// API Error Types
export interface ApiErrorType {
  message: string;
  code: string;
  statusCode?: number;
  details?: any;
  timestamp: string;
}

// API Response Types
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

export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Employee Type
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  weeklyCapacity: number;
  capacity?: number; // Alias for weeklyCapacity
  skills: string[];
  role: string;
  department: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Project Type
export interface Project {
  id: string;
  name: string;
  clientName: string;
  status: 'active' | 'planned' | 'completed' | 'on-hold';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  startDate: string;
  endDate: string;
  budget: number;
  description: string;
  requiredSkills: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}