import { Request, Response, NextFunction } from 'express';
import { Employee, SearchFilters, ApiResponse } from '../types';
import { catchAsync } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

// Mock data - in real app, this would come from database
const employees: Employee[] = [
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
  },
  {
    id: '3',
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob.johnson@company.com',
    position: 'Marketing Manager',
    departmentId: '3',
    salary: 85000,
    hireDate: new Date('2021-03-20'),
    status: 'active',
    skills: ['Marketing', 'Analytics', 'SEO'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const searchEmployees = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  let filteredEmployees = [...employees];

  // Text search across multiple fields
  if (req.query.q) {
    const searchTerm = (req.query.q as string).toLowerCase();
    filteredEmployees = filteredEmployees.filter(emp => 
      emp.firstName.toLowerCase().includes(searchTerm) ||
      emp.lastName.toLowerCase().includes(searchTerm) ||
      emp.email.toLowerCase().includes(searchTerm) ||
      emp.position.toLowerCase().includes(searchTerm) ||
      emp.skills.some(skill => skill.toLowerCase().includes(searchTerm))
    );
  }

  // Department filter
  if (req.query.department) {
    filteredEmployees = filteredEmployees.filter(emp => emp.departmentId === req.query.department);
  }

  // Status filter
  if (req.query.status) {
    filteredEmployees = filteredEmployees.filter(emp => emp.status === req.query.status);
  }

  // Position filter
  if (req.query.position) {
    const position = (req.query.position as string).toLowerCase();
    filteredEmployees = filteredEmployees.filter(emp => 
      emp.position.toLowerCase().includes(position)
    );
  }

  // Skills filter (AND operation - employee must have all specified skills)
  if (req.query.skills) {
    const skills = (req.query.skills as string).split(',').map(s => s.trim());
    filteredEmployees = filteredEmployees.filter(emp => 
      skills.every(skill => emp.skills.some(empSkill => 
        empSkill.toLowerCase().includes(skill.toLowerCase())
      ))
    );
  }

  // Salary range filter
  if (req.query.salaryMin) {
    const minSalary = parseFloat(req.query.salaryMin as string);
    filteredEmployees = filteredEmployees.filter(emp => emp.salary >= minSalary);
  }

  if (req.query.salaryMax) {
    const maxSalary = parseFloat(req.query.salaryMax as string);
    filteredEmployees = filteredEmployees.filter(emp => emp.salary <= maxSalary);
  }

  // Hire date range filter
  if (req.query.hireDateFrom) {
    const fromDate = new Date(req.query.hireDateFrom as string);
    filteredEmployees = filteredEmployees.filter(emp => emp.hireDate >= fromDate);
  }

  if (req.query.hireDateTo) {
    const toDate = new Date(req.query.hireDateTo as string);
    filteredEmployees = filteredEmployees.filter(emp => emp.hireDate <= toDate);
  }

  // Sort options
  if (req.query.sortBy) {
    const sortBy = req.query.sortBy as string;
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    filteredEmployees.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`;
          bValue = `${b.firstName} ${b.lastName}`;
          break;
        case 'salary':
          aValue = a.salary;
          bValue = b.salary;
          break;
        case 'hireDate':
          aValue = a.hireDate.getTime();
          bValue = b.hireDate.getTime();
          break;
        default:
          aValue = (a as any)[sortBy] || '';
          bValue = (b as any)[sortBy] || '';
      }

      if (aValue < bValue) return -1 * sortOrder;
      if (aValue > bValue) return 1 * sortOrder;
      return 0;
    });
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

  logger.info('Employee search completed', { 
    query: req.query.q,
    filters: Object.keys(req.query).filter(key => key !== 'q' && key !== 'page' && key !== 'limit'),
    resultCount: paginatedEmployees.length,
    total
  });

  res.status(200).json(response);
});

export const advancedSearch = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const filters: SearchFilters = req.body;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  let filteredEmployees = [...employees];

  // Apply advanced filters
  if (filters.department) {
    filteredEmployees = filteredEmployees.filter(emp => emp.departmentId === filters.department);
  }

  if (filters.position) {
    filteredEmployees = filteredEmployees.filter(emp => 
      emp.position.toLowerCase().includes(filters.position!.toLowerCase())
    );
  }

  if (filters.skills && filters.skills.length > 0) {
    filteredEmployees = filteredEmployees.filter(emp => 
      filters.skills!.some(skill => emp.skills.includes(skill))
    );
  }

  if (filters.status) {
    filteredEmployees = filteredEmployees.filter(emp => emp.status === filters.status);
  }

  if (filters.salaryMin !== undefined) {
    filteredEmployees = filteredEmployees.filter(emp => emp.salary >= filters.salaryMin!);
  }

  if (filters.salaryMax !== undefined) {
    filteredEmployees = filteredEmployees.filter(emp => emp.salary <= filters.salaryMax!);
  }

  if (filters.hireDate?.from) {
    filteredEmployees = filteredEmployees.filter(emp => emp.hireDate >= filters.hireDate!.from!);
  }

  if (filters.hireDate?.to) {
    filteredEmployees = filteredEmployees.filter(emp => emp.hireDate <= filters.hireDate!.to!);
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

  logger.info('Advanced search completed', { 
    filters,
    resultCount: paginatedEmployees.length,
    total
  });

  res.status(200).json(response);
});

export const getSearchSuggestions = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { type, query } = req.query;

  let suggestions: string[] = [];

  switch (type) {
    case 'skills':
      const allSkills = [...new Set(employees.flatMap(emp => emp.skills))];
      suggestions = allSkills.filter(skill => 
        skill.toLowerCase().includes((query as string || '').toLowerCase())
      ).slice(0, 10);
      break;

    case 'positions':
      const allPositions = [...new Set(employees.map(emp => emp.position))];
      suggestions = allPositions.filter(position => 
        position.toLowerCase().includes((query as string || '').toLowerCase())
      ).slice(0, 10);
      break;

    case 'employees':
      suggestions = employees
        .filter(emp => 
          emp.firstName.toLowerCase().includes((query as string || '').toLowerCase()) ||
          emp.lastName.toLowerCase().includes((query as string || '').toLowerCase())
        )
        .map(emp => `${emp.firstName} ${emp.lastName}`)
        .slice(0, 10);
      break;

    default:
      suggestions = [];
  }

  const response: ApiResponse<string[]> = {
    success: true,
    data: suggestions
  };

  res.status(200).json(response);
});

export const getFacets = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const facets = {
    departments: [...new Set(employees.map(emp => emp.departmentId))],
    positions: [...new Set(employees.map(emp => emp.position))],
    skills: [...new Set(employees.flatMap(emp => emp.skills))],
    statuses: [...new Set(employees.map(emp => emp.status))],
    salaryRanges: [
      { label: '< $50k', min: 0, max: 50000, count: employees.filter(emp => emp.salary < 50000).length },
      { label: '$50k - $75k', min: 50000, max: 75000, count: employees.filter(emp => emp.salary >= 50000 && emp.salary < 75000).length },
      { label: '$75k - $100k', min: 75000, max: 100000, count: employees.filter(emp => emp.salary >= 75000 && emp.salary < 100000).length },
      { label: '$100k+', min: 100000, max: Infinity, count: employees.filter(emp => emp.salary >= 100000).length }
    ]
  };

  const response: ApiResponse<typeof facets> = {
    success: true,
    data: facets
  };

  logger.info('Search facets retrieved');
  res.status(200).json(response);
});