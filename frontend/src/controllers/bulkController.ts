import { Request, Response, NextFunction } from 'express';
import { Employee, BulkOperationResult, ApiResponse } from '../types';
import { AppError, catchAsync } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import Papa from 'papaparse';

// Mock data store - in real app, this would be database operations
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
  }
];

export const importEmployees = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return next(new AppError('Please upload a CSV file', 400));
  }

  const csvData = req.file.buffer.toString();
  
  // Parse CSV
  const parseResult = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parseResult.errors.length > 0) {
    logger.error('CSV parsing errors:', parseResult.errors);
    return next(new AppError('Invalid CSV format', 400));
  }

  const result: BulkOperationResult = {
    success: true,
    processed: 0,
    errors: []
  };

  const data = parseResult.data as any[];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 2; // +2 for header and 1-based indexing

    try {
      // Validate required fields
      const requiredFields = ['firstName', 'lastName', 'email', 'position', 'departmentId', 'salary', 'hireDate'];
      for (const field of requiredFields) {
        if (!row[field] || row[field].trim() === '') {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Check if employee already exists
      const existingEmployee = employees.find(emp => emp.email === row.email);
      if (existingEmployee) {
        throw new Error(`Employee with email ${row.email} already exists`);
      }

      // Parse skills (comma-separated)
      const skills = row.skills ? row.skills.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [];

      // Create employee
      const newEmployee: Employee = {
        id: String(employees.length + result.processed + 1),
        firstName: row.firstName.trim(),
        lastName: row.lastName.trim(),
        email: row.email.trim(),
        phoneNumber: row.phoneNumber?.trim() || undefined,
        position: row.position.trim(),
        departmentId: row.departmentId.trim(),
        salary: parseFloat(row.salary),
        hireDate: new Date(row.hireDate),
        status: row.status?.trim() || 'active',
        skills,
        managerId: row.managerId?.trim() || undefined,
        profileImage: row.profileImage?.trim() || undefined,
        address: row.street ? {
          street: row.street.trim(),
          city: row.city?.trim() || '',
          state: row.state?.trim() || '',
          zipCode: row.zipCode?.trim() || '',
          country: row.country?.trim() || ''
        } : undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      employees.push(newEmployee);
      result.processed++;

    } catch (error) {
      result.errors.push({
        row: rowNumber,
        message: (error as Error).message
      });
    }
  }

  // Determine overall success
  result.success = result.errors.length < data.length / 2; // Success if less than 50% errors

  const response: ApiResponse<BulkOperationResult> = {
    success: result.success,
    data: result,
    message: `Processed ${result.processed} employees with ${result.errors.length} errors`
  };

  logger.info('Bulk employee import completed', {
    totalRows: data.length,
    processed: result.processed,
    errors: result.errors.length
  });

  res.status(result.success ? 200 : 207).json(response); // 207 Multi-Status for partial success
});

export const exportEmployees = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const format = req.query.format || 'csv';
  
  if (format !== 'csv') {
    return next(new AppError('Only CSV format is currently supported', 400));
  }

  // Apply filters if provided
  let filteredEmployees = [...employees];

  if (req.query.department) {
    filteredEmployees = filteredEmployees.filter(emp => emp.departmentId === req.query.department);
  }

  if (req.query.status) {
    filteredEmployees = filteredEmployees.filter(emp => emp.status === req.query.status);
  }

  // Convert employees to CSV format
  const csvData = filteredEmployees.map(emp => ({
    id: emp.id,
    firstName: emp.firstName,
    lastName: emp.lastName,
    email: emp.email,
    phoneNumber: emp.phoneNumber || '',
    position: emp.position,
    departmentId: emp.departmentId,
    salary: emp.salary,
    hireDate: emp.hireDate.toISOString().split('T')[0], // YYYY-MM-DD format
    status: emp.status,
    skills: emp.skills.join(', '),
    managerId: emp.managerId || '',
    profileImage: emp.profileImage || '',
    street: emp.address?.street || '',
    city: emp.address?.city || '',
    state: emp.address?.state || '',
    zipCode: emp.address?.zipCode || '',
    country: emp.address?.country || '',
    createdAt: emp.createdAt.toISOString(),
    updatedAt: emp.updatedAt.toISOString()
  }));

  const csv = Papa.unparse(csvData);

  // Set response headers for file download
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=employees_export_${new Date().toISOString().split('T')[0]}.csv`);

  logger.info('Employee export completed', {
    format,
    count: filteredEmployees.length,
    filters: Object.keys(req.query).filter(key => key !== 'format')
  });

  res.send(csv);
});

export const bulkUpdateEmployees = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { employeeIds, updates } = req.body;

  if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
    return next(new AppError('Please provide an array of employee IDs', 400));
  }

  if (!updates || Object.keys(updates).length === 0) {
    return next(new AppError('Please provide fields to update', 400));
  }

  const result: BulkOperationResult = {
    success: true,
    processed: 0,
    errors: []
  };

  for (const employeeId of employeeIds) {
    try {
      const employeeIndex = employees.findIndex(emp => emp.id === employeeId);
      
      if (employeeIndex === -1) {
        throw new Error(`Employee with ID ${employeeId} not found`);
      }

      // Update employee
      employees[employeeIndex] = {
        ...employees[employeeIndex],
        ...updates,
        updatedAt: new Date()
      };

      result.processed++;

    } catch (error) {
      result.errors.push({
        row: result.processed + result.errors.length + 1,
        message: `ID ${employeeId}: ${(error as Error).message}`
      });
    }
  }

  result.success = result.errors.length === 0;

  const response: ApiResponse<BulkOperationResult> = {
    success: result.success,
    data: result,
    message: `Updated ${result.processed} employees with ${result.errors.length} errors`
  };

  logger.info('Bulk employee update completed', {
    totalIds: employeeIds.length,
    processed: result.processed,
    errors: result.errors.length,
    updatedFields: Object.keys(updates)
  });

  res.status(result.success ? 200 : 207).json(response);
});

export const bulkDeleteEmployees = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { employeeIds } = req.body;

  if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
    return next(new AppError('Please provide an array of employee IDs', 400));
  }

  const result: BulkOperationResult = {
    success: true,
    processed: 0,
    errors: []
  };

  for (const employeeId of employeeIds) {
    try {
      const employeeIndex = employees.findIndex(emp => emp.id === employeeId);
      
      if (employeeIndex === -1) {
        throw new Error(`Employee with ID ${employeeId} not found`);
      }

      employees.splice(employeeIndex, 1);
      result.processed++;

    } catch (error) {
      result.errors.push({
        row: result.processed + result.errors.length + 1,
        message: `ID ${employeeId}: ${(error as Error).message}`
      });
    }
  }

  result.success = result.errors.length === 0;

  const response: ApiResponse<BulkOperationResult> = {
    success: result.success,
    data: result,
    message: `Deleted ${result.processed} employees with ${result.errors.length} errors`
  };

  logger.info('Bulk employee deletion completed', {
    totalIds: employeeIds.length,
    processed: result.processed,
    errors: result.errors.length
  });

  res.status(result.success ? 200 : 207).json(response);
});

export const getBulkTemplate = catchAsync(async (_req: Request, res: Response, _next: NextFunction) => {
  const templateData = [{
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    phoneNumber: '+1234567890',
    position: 'Software Engineer',
    departmentId: '1',
    salary: '75000',
    hireDate: '2023-01-15',
    status: 'active',
    skills: 'JavaScript, React, Node.js',
    managerId: '2',
    profileImage: '',
    street: '123 Main St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'USA'
  }];

  const csv = Papa.unparse(templateData);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=employee_import_template.csv');

  logger.info('Bulk import template downloaded');
  res.send(csv);
});