"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentController = void 0;
const department_service_1 = require("../services/department.service");
const api_error_1 = require("../utils/api-error");
class DepartmentController {
    constructor() {
        this.getDepartments = async (_req, res, next) => {
            try {
                const departments = await this.departmentService.getDepartments();
                res.status(200).json(departments);
            }
            catch (error) {
                next(error);
            }
        };
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
        this.createDepartment = async (req, res, next) => {
            try {
                const departmentData = req.body;
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
        this.updateDepartment = async (req, res, next) => {
            try {
                const id = parseInt(req.params.id);
                const updateData = req.body;
                const existingDepartment = await this.departmentService.getDepartmentById(id);
                if (!existingDepartment) {
                    throw api_error_1.ApiError.notFound('Department');
                }
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
        this.deleteDepartment = async (req, res, next) => {
            try {
                const id = parseInt(req.params.id);
                const existingDepartment = await this.departmentService.getDepartmentById(id);
                if (!existingDepartment) {
                    throw api_error_1.ApiError.notFound('Department');
                }
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
        this.getDepartmentEmployees = async (req, res, next) => {
            try {
                const id = parseInt(req.params.id);
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
//# sourceMappingURL=department.controller.js.map