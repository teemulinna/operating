import { Request, Response, NextFunction } from 'express';
import { Department, ApiResponse } from '../types';
import { AppError, catchAsync } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

// Mock data store
let departments: Department[] = [
  {
    id: '1',
    name: 'Engineering',
    description: 'Software development and engineering team',
    managerId: '2',
    budget: 500000,
    location: 'New York',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Human Resources',
    description: 'HR and people operations',
    budget: 200000,
    location: 'New York',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    name: 'Marketing',
    description: 'Marketing and communications',
    budget: 300000,
    location: 'San Francisco',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const getAllDepartments = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  let filteredDepartments = [...departments];

  // Apply search filter
  if (req.query.search) {
    const search = (req.query.search as string).toLowerCase();
    filteredDepartments = filteredDepartments.filter(dept => 
      dept.name.toLowerCase().includes(search) || 
      dept.description?.toLowerCase().includes(search)
    );
  }

  // Apply location filter
  if (req.query.location) {
    filteredDepartments = filteredDepartments.filter(dept => 
      dept.location?.toLowerCase() === (req.query.location as string).toLowerCase()
    );
  }

  const total = filteredDepartments.length;
  const paginatedDepartments = filteredDepartments.slice(skip, skip + limit);

  const response: ApiResponse<Department[]> = {
    success: true,
    data: paginatedDepartments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };

  logger.info('Departments retrieved', { count: paginatedDepartments.length, total });
  res.status(200).json(response);
});

export const getDepartmentById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const department = departments.find(dept => dept.id === id);

  if (!department) {
    return next(new AppError('Department not found', 404));
  }

  const response: ApiResponse<Department> = {
    success: true,
    data: department
  };

  logger.info('Department retrieved', { departmentId: id });
  res.status(200).json(response);
});

export const createDepartment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // Check if department with name already exists
  const existingDepartment = departments.find(dept => 
    dept.name.toLowerCase() === req.body.name.toLowerCase()
  );
  if (existingDepartment) {
    return next(new AppError('Department with this name already exists', 400));
  }

  const newDepartment: Department = {
    id: String(departments.length + 1),
    ...req.body,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  departments.push(newDepartment);

  const response: ApiResponse<Department> = {
    success: true,
    data: newDepartment,
    message: 'Department created successfully'
  };

  logger.info('Department created', { 
    departmentId: newDepartment.id, 
    name: newDepartment.name
  });

  res.status(201).json(response);
});

export const updateDepartment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const departmentIndex = departments.findIndex(dept => dept.id === id);

  if (departmentIndex === -1) {
    return next(new AppError('Department not found', 404));
  }

  // Check if name is being updated and already exists
  if (req.body.name && req.body.name.toLowerCase() !== departments[departmentIndex].name.toLowerCase()) {
    const existingDepartment = departments.find(dept => 
      dept.name.toLowerCase() === req.body.name.toLowerCase() && dept.id !== id
    );
    if (existingDepartment) {
      return next(new AppError('Department with this name already exists', 400));
    }
  }

  const updatedDepartment: Department = {
    ...departments[departmentIndex],
    ...req.body,
    updatedAt: new Date()
  };

  departments[departmentIndex] = updatedDepartment;

  const response: ApiResponse<Department> = {
    success: true,
    data: updatedDepartment,
    message: 'Department updated successfully'
  };

  logger.info('Department updated', { 
    departmentId: id, 
    updatedFields: Object.keys(req.body)
  });

  res.status(200).json(response);
});

export const deleteDepartment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const departmentIndex = departments.findIndex(dept => dept.id === id);

  if (departmentIndex === -1) {
    return next(new AppError('Department not found', 404));
  }

  // TODO: Check if department has employees (in real implementation)
  // For now, we'll allow deletion

  const deletedDepartment = departments[departmentIndex];
  departments.splice(departmentIndex, 1);

  const response: ApiResponse<null> = {
    success: true,
    message: 'Department deleted successfully'
  };

  logger.info('Department deleted', { 
    departmentId: id,
    name: deletedDepartment.name
  });

  res.status(200).json(response);
});

export const getDepartmentStats = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const stats = {
    total: departments.length,
    totalBudget: departments.reduce((sum, dept) => sum + (dept.budget || 0), 0),
    averageBudget: departments.reduce((sum, dept) => sum + (dept.budget || 0), 0) / departments.length || 0,
    locationsCount: [...new Set(departments.map(dept => dept.location).filter(Boolean))].length,
    locations: departments.reduce((acc, dept) => {
      if (dept.location) {
        acc[dept.location] = (acc[dept.location] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>)
  };

  const response: ApiResponse<typeof stats> = {
    success: true,
    data: stats
  };

  logger.info('Department statistics retrieved');
  res.status(200).json(response);
});