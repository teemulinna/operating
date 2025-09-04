import { Request, Response, NextFunction } from 'express';
import { Employee, ApiResponse } from '../types';
import { AppError, catchAsync } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

// Mock data store (replace with actual database operations)
let employees: Employee[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    phoneNumber: '+1234567890',
    position: 'Software Engineer',
    departmentId: '1',
    salary: 75000,
    hireDate: new Date('2022-01-15'),
    status: 'active',
    skills: ['JavaScript', 'React', 'Node.js'],
    managerId: '2',
    address: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@company.com',
    position: 'Senior Software Engineer',
    departmentId: '1',
    salary: 95000,
    hireDate: new Date('2020-05-10'),
    status: 'active',
    skills: ['JavaScript', 'Python', 'AWS', 'Docker'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Get all employees with pagination and filtering
export const getAllEmployees = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  // Apply filters
  let filteredEmployees = [...employees];

  if (req.query.department) {
    filteredEmployees = filteredEmployees.filter(emp => emp.departmentId === req.query.department);
  }

  if (req.query.status) {
    filteredEmployees = filteredEmployees.filter(emp => emp.status === req.query.status);
  }

  if (req.query.position) {
    const position = (req.query.position as string).toLowerCase();
    filteredEmployees = filteredEmployees.filter(emp => 
      emp.position.toLowerCase().includes(position)
    );
  }

  if (req.query.skills) {
    const skills = (req.query.skills as string).split(',');
    filteredEmployees = filteredEmployees.filter(emp => 
      skills.some(skill => emp.skills.includes(skill.trim()))
    );
  }

  const total = filteredEmployees.length;
  const paginatedEmployees = filteredEmployees.slice(skip, skip + limit);

  const response: ApiResponse<Employee[]> = {
    success: true,
    data: paginatedEmployees,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };

  logger.info('Employees retrieved', { count: paginatedEmployees.length, total });
  res.status(200).json(response);
});

// Get employee by ID
export const getEmployeeById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const employee = employees.find(emp => emp.id === id);

  if (!employee) {
    return next(new AppError('Employee not found', 404));
  }

  const response: ApiResponse<Employee> = {
    success: true,
    data: employee
  };

  logger.info('Employee retrieved', { employeeId: id });
  res.status(200).json(response);
});

// Create new employee
export const createEmployee = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // Check if employee with email already exists
  const existingEmployee = employees.find(emp => emp.email === req.body.email);
  if (existingEmployee) {
    return next(new AppError('Employee with this email already exists', 400));
  }

  const newEmployee: Employee = {
    id: String(employees.length + 1),
    ...req.body,
    hireDate: new Date(req.body.hireDate),
    skills: req.body.skills || [],
    status: req.body.status || 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  employees.push(newEmployee);

  const response: ApiResponse<Employee> = {
    success: true,
    data: newEmployee,
    message: 'Employee created successfully'
  };

  logger.info('Employee created', { 
    employeeId: newEmployee.id, 
    email: newEmployee.email,
    name: `${newEmployee.firstName} ${newEmployee.lastName}`
  });

  res.status(201).json(response);
});

// Update employee
export const updateEmployee = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const employeeIndex = employees.findIndex(emp => emp.id === id);

  if (employeeIndex === -1) {
    return next(new AppError('Employee not found', 404));
  }

  // Check if email is being updated and already exists
  if (req.body.email && req.body.email !== employees[employeeIndex].email) {
    const existingEmployee = employees.find(emp => emp.email === req.body.email && emp.id !== id);
    if (existingEmployee) {
      return next(new AppError('Employee with this email already exists', 400));
    }
  }

  // Update employee
  const updatedEmployee: Employee = {
    ...employees[employeeIndex],
    ...req.body,
    updatedAt: new Date()
  };

  employees[employeeIndex] = updatedEmployee;

  const response: ApiResponse<Employee> = {
    success: true,
    data: updatedEmployee,
    message: 'Employee updated successfully'
  };

  logger.info('Employee updated', { 
    employeeId: id, 
    updatedFields: Object.keys(req.body)
  });

  res.status(200).json(response);
});

// Delete employee
export const deleteEmployee = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const employeeIndex = employees.findIndex(emp => emp.id === id);

  if (employeeIndex === -1) {
    return next(new AppError('Employee not found', 404));
  }

  const deletedEmployee = employees[employeeIndex];
  employees.splice(employeeIndex, 1);

  const response: ApiResponse<null> = {
    success: true,
    message: 'Employee deleted successfully'
  };

  logger.info('Employee deleted', { 
    employeeId: id,
    name: `${deletedEmployee.firstName} ${deletedEmployee.lastName}`
  });

  res.status(200).json(response);
});

// Get employees by department
export const getEmployeesByDepartment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { departmentId } = req.params;
  const departmentEmployees = employees.filter(emp => emp.departmentId === departmentId);

  const response: ApiResponse<Employee[]> = {
    success: true,
    data: departmentEmployees
  };

  logger.info('Department employees retrieved', { 
    departmentId, 
    count: departmentEmployees.length 
  });

  res.status(200).json(response);
});

// Get employee statistics
export const getEmployeeStats = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const stats = {
    total: employees.length,
    active: employees.filter(emp => emp.status === 'active').length,
    inactive: employees.filter(emp => emp.status === 'inactive').length,
    terminated: employees.filter(emp => emp.status === 'terminated').length,
    averageSalary: employees.reduce((sum, emp) => sum + emp.salary, 0) / employees.length || 0,
    departmentDistribution: employees.reduce((acc, emp) => {
      acc[emp.departmentId] = (acc[emp.departmentId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  const response: ApiResponse<typeof stats> = {
    success: true,
    data: stats
  };

  logger.info('Employee statistics retrieved');
  res.status(200).json(response);
});