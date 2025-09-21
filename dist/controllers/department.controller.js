"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentController = void 0;
const department_service_1 = require("../services/department.service");
const api_error_1 = require("../utils/api-error");
class DepartmentController {
    constructor() {
        // GET /api/departments
        this.getDepartments = async (_req, res, next) => {
            try {
                const departments = await this.departmentService.getDepartments();
                res.status(200).json(departments);
            }
            catch (error) {
                next(error);
            }
        };
        // GET /api/departments/:id
        this.getDepartmentById = async (req, res, next) => {
            try {
                const id = parseInt(req.params.id);
                const department = await this.departmentService.getDepartmentById(id);
                if (!department) {
                    throw api_error_1.ApiError.notFound('Department');
                }
                res.status(200).json(department);
            }
            catch (error) {
                next(error);
            }
        };
        // POST /api/departments
        this.createDepartment = async (req, res, next) => {
            try {
                const departmentData = req.body;
                // Check for duplicate name
                const existingDepartment = await this.departmentService.getDepartmentByName(departmentData.name);
                if (existingDepartment) {
                    throw api_error_1.ApiError.conflict('A department with this name already exists');
                }
                const newDepartment = await this.departmentService.createDepartment(departmentData);
                res.status(201).json(newDepartment);
            }
            catch (error) {
                next(error);
            }
        };
        // PUT /api/departments/:id
        this.updateDepartment = async (req, res, next) => {
            try {
                const id = parseInt(req.params.id);
                const updateData = req.body;
                // Check if department exists
                const existingDepartment = await this.departmentService.getDepartmentById(id);
                if (!existingDepartment) {
                    throw api_error_1.ApiError.notFound('Department');
                }
                // Check for duplicate name if name is being updated
                if (updateData.name && updateData.name !== existingDepartment.name) {
                    const duplicateDepartment = await this.departmentService.getDepartmentByName(updateData.name);
                    if (duplicateDepartment) {
                        throw api_error_1.ApiError.conflict('A department with this name already exists');
                    }
                }
                const updatedDepartment = await this.departmentService.updateDepartment(id, updateData);
                res.status(200).json(updatedDepartment);
            }
            catch (error) {
                next(error);
            }
        };
        // DELETE /api/departments/:id
        this.deleteDepartment = async (req, res, next) => {
            try {
                const id = parseInt(req.params.id);
                // Check if department exists
                const existingDepartment = await this.departmentService.getDepartmentById(id);
                if (!existingDepartment) {
                    throw api_error_1.ApiError.notFound('Department');
                }
                // Check if department has employees
                const employeeCount = await this.departmentService.getDepartmentEmployeeCount(id);
                if (employeeCount > 0) {
                    throw api_error_1.ApiError.badRequest(`Cannot delete department with ${employeeCount} employee(s). Please reassign employees first.`);
                }
                await this.departmentService.deleteDepartment(id);
                res.status(204).send();
            }
            catch (error) {
                next(error);
            }
        };
        // GET /api/departments/:id/employees
        this.getDepartmentEmployees = async (req, res, next) => {
            try {
                const id = parseInt(req.params.id);
                // Check if department exists
                const existingDepartment = await this.departmentService.getDepartmentById(id);
                if (!existingDepartment) {
                    throw api_error_1.ApiError.notFound('Department');
                }
                const employees = await this.departmentService.getDepartmentEmployees(id);
                res.status(200).json({
                    department: existingDepartment,
                    employees,
                    totalEmployees: employees.length
                });
            }
            catch (error) {
                next(error);
            }
        };
        // GET /api/departments/analytics
        this.getDepartmentAnalytics = async (_req, res, next) => {
            try {
                const analytics = await this.departmentService.getDepartmentAnalytics();
                res.status(200).json(analytics);
            }
            catch (error) {
                next(error);
            }
        };
        this.departmentService = new department_service_1.DepartmentService();
    }
}
exports.DepartmentController = DepartmentController;
