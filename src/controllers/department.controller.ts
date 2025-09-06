import { Request, Response, NextFunction } from 'express';
import { DepartmentService } from '../services/department.service';
import { ApiError } from '../utils/api-error';

export class DepartmentController {
  private departmentService: DepartmentService;

  constructor() {
    this.departmentService = new DepartmentService();
  }

  // GET /api/departments
  getDepartments = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const departments = await this.departmentService.getDepartments();
      res.status(200).json(departments);
    } catch (error) {
      next(error);
    }
  };

  // GET /api/departments/:id
  getDepartmentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id!);
      const department = await this.departmentService.getDepartmentById(id);
      
      if (!department) {
        throw ApiError.notFound('Department');
      }
      
      res.status(200).json(department);
    } catch (error) {
      next(error);
    }
  };

  // POST /api/departments
  createDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const departmentData = req.body;
      
      // Check for duplicate name
      const existingDepartment = await this.departmentService.getDepartmentByName(departmentData.name);
      if (existingDepartment) {
        throw ApiError.conflict('A department with this name already exists');
      }
      
      const newDepartment = await this.departmentService.createDepartment(departmentData);
      
      res.status(201).json(newDepartment);
    } catch (error) {
      next(error);
    }
  };

  // PUT /api/departments/:id
  updateDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id!);
      const updateData = req.body;
      
      // Check if department exists
      const existingDepartment = await this.departmentService.getDepartmentById(id);
      if (!existingDepartment) {
        throw ApiError.notFound('Department');
      }
      
      // Check for duplicate name if name is being updated
      if (updateData.name && updateData.name !== existingDepartment.name) {
        const duplicateDepartment = await this.departmentService.getDepartmentByName(updateData.name);
        if (duplicateDepartment) {
          throw ApiError.conflict('A department with this name already exists');
        }
      }
      
      const updatedDepartment = await this.departmentService.updateDepartment(id, updateData);
      
      res.status(200).json(updatedDepartment);
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/departments/:id
  deleteDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id!);
      
      // Check if department exists
      const existingDepartment = await this.departmentService.getDepartmentById(id);
      if (!existingDepartment) {
        throw ApiError.notFound('Department');
      }
      
      // Check if department has employees
      const employeeCount = await this.departmentService.getDepartmentEmployeeCount(id);
      if (employeeCount > 0) {
        throw ApiError.badRequest(
          `Cannot delete department with ${employeeCount} employee(s). Please reassign employees first.`
        );
      }
      
      await this.departmentService.deleteDepartment(id);
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // GET /api/departments/:id/employees
  getDepartmentEmployees = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id!);
      
      // Check if department exists
      const existingDepartment = await this.departmentService.getDepartmentById(id);
      if (!existingDepartment) {
        throw ApiError.notFound('Department');
      }
      
      const employees = await this.departmentService.getDepartmentEmployees(id);
      
      res.status(200).json({
        department: existingDepartment,
        employees,
        totalEmployees: employees.length
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/departments/analytics
  getDepartmentAnalytics = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const analytics = await this.departmentService.getDepartmentAnalytics();
      
      res.status(200).json(analytics);
    } catch (error) {
      next(error);
    }
  };
}