import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../services/employee.service';
import { CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeQuery } from '../types/employee.types';
import { ApiError } from '../utils/api-error';
import { parseCSV, generateCSV } from '../utils/csv-helper';

export class EmployeeController {
  private employeeService: EmployeeService;

  constructor() {
    this.employeeService = new EmployeeService();
  }

  // GET /api/employees
  getEmployees = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query: EmployeeQuery = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: req.query.search as string,
        departmentId: req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined,
        position: req.query.position as string,
        skills: req.query.skills as string,
        salaryMin: req.query.salaryMin ? parseFloat(req.query.salaryMin as string) : undefined,
        salaryMax: req.query.salaryMax ? parseFloat(req.query.salaryMax as string) : undefined,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        sortBy: req.query.sortBy as any || 'lastName',
        sortOrder: req.query.sortOrder as any || 'asc'
      };

      const result = await this.employeeService.getEmployees(query);
      
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // GET /api/employees/:id
  getEmployeeById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id!);
      const employee = await this.employeeService.getEmployeeById(id);
      
      if (!employee) {
        throw ApiError.notFound('Employee');
      }
      
      res.status(200).json(employee);
    } catch (error) {
      next(error);
    }
  };

  // POST /api/employees
  createEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const employeeData: CreateEmployeeRequest = req.body;
      
      // Check for duplicate email
      const existingEmployee = await this.employeeService.getEmployeeByEmail(employeeData.email);
      if (existingEmployee) {
        throw ApiError.conflict('An employee with this email already exists');
      }
      
      const newEmployee = await this.employeeService.createEmployee(employeeData);
      
      res.status(201).json(newEmployee);
    } catch (error) {
      next(error);
    }
  };

  // PUT /api/employees/:id
  updateEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id!);
      const updateData: UpdateEmployeeRequest = req.body;
      
      // Check if employee exists
      const existingEmployee = await this.employeeService.getEmployeeById(id);
      if (!existingEmployee) {
        throw ApiError.notFound('Employee');
      }
      
      // Check for duplicate email if email is being updated
      if (updateData.email && updateData.email !== existingEmployee.email) {
        const duplicateEmployee = await this.employeeService.getEmployeeByEmail(updateData.email);
        if (duplicateEmployee) {
          throw ApiError.conflict('An employee with this email already exists');
        }
      }
      
      const updatedEmployee = await this.employeeService.updateEmployee(id, updateData);
      
      res.status(200).json(updatedEmployee);
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/employees/:id
  deleteEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id!);
      
      // Check if employee exists
      const existingEmployee = await this.employeeService.getEmployeeById(id);
      if (!existingEmployee) {
        throw ApiError.notFound('Employee');
      }
      
      await this.employeeService.deleteEmployee(id);
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // POST /api/employees/bulk-import
  bulkImportEmployees = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw ApiError.badRequest('CSV file is required');
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const employees = parseCSV(csvContent);
      
      if (!employees || employees.length === 0) {
        throw ApiError.badRequest('CSV file is empty or invalid');
      }

      const result = await this.employeeService.bulkImportEmployees(employees);
      
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // GET /api/employees/export
  exportEmployees = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query: EmployeeQuery = {
        // Export all employees (no pagination)
        limit: 10000,
        search: req.query.search as string,
        departmentId: req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined,
        position: req.query.position as string,
        skills: req.query.skills as string,
        salaryMin: req.query.salaryMin ? parseFloat(req.query.salaryMin as string) : undefined,
        salaryMax: req.query.salaryMax ? parseFloat(req.query.salaryMax as string) : undefined,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        sortBy: req.query.sortBy as any || 'lastName',
        sortOrder: req.query.sortOrder as any || 'asc'
      };

      const result = await this.employeeService.getEmployees(query);
      const csvContent = generateCSV(result.data);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=employees.csv');
      res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  };

  // GET /api/employees/analytics
  getEmployeeAnalytics = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const analytics = await this.employeeService.getEmployeeAnalytics();
      
      res.status(200).json(analytics);
    } catch (error) {
      next(error);
    }
  };
}