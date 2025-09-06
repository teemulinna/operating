"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeController = void 0;
const employee_service_1 = require("../services/employee.service");
const api_error_1 = require("../utils/api-error");
const csv_helper_1 = require("../utils/csv-helper");
class EmployeeController {
    constructor() {
        this.getEmployees = async (req, res, next) => {
            try {
                const query = {
                    page: parseInt(req.query.page) || 1,
                    limit: parseInt(req.query.limit) || 10,
                    search: req.query.search,
                    departmentId: req.query.departmentId ? parseInt(req.query.departmentId) : undefined,
                    position: req.query.position,
                    skills: req.query.skills,
                    salaryMin: req.query.salaryMin ? parseFloat(req.query.salaryMin) : undefined,
                    salaryMax: req.query.salaryMax ? parseFloat(req.query.salaryMax) : undefined,
                    isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
                    sortBy: req.query.sortBy || 'lastName',
                    sortOrder: req.query.sortOrder || 'asc'
                };
                const result = await this.employeeService.getEmployees(query);
                res.status(200).json(result);
            }
            catch (error) {
                next(error);
            }
        };
        this.getEmployeeById = async (req, res, next) => {
            try {
                const id = parseInt(req.params.id);
                const employee = await this.employeeService.getEmployeeById(id);
                if (!employee) {
                    throw api_error_1.ApiError.notFound('Employee');
                }
                res.status(200).json(employee);
            }
            catch (error) {
                next(error);
            }
        };
        this.createEmployee = async (req, res, next) => {
            try {
                const employeeData = req.body;
                const existingEmployee = await this.employeeService.getEmployeeByEmail(employeeData.email);
                if (existingEmployee) {
                    throw api_error_1.ApiError.conflict('An employee with this email already exists');
                }
                const newEmployee = await this.employeeService.createEmployee(employeeData);
                res.status(201).json(newEmployee);
            }
            catch (error) {
                next(error);
            }
        };
        this.updateEmployee = async (req, res, next) => {
            try {
                const id = parseInt(req.params.id);
                const updateData = req.body;
                const existingEmployee = await this.employeeService.getEmployeeById(id);
                if (!existingEmployee) {
                    throw api_error_1.ApiError.notFound('Employee');
                }
                if (updateData.email && updateData.email !== existingEmployee.email) {
                    const duplicateEmployee = await this.employeeService.getEmployeeByEmail(updateData.email);
                    if (duplicateEmployee) {
                        throw api_error_1.ApiError.conflict('An employee with this email already exists');
                    }
                }
                const updatedEmployee = await this.employeeService.updateEmployee(id, updateData);
                res.status(200).json(updatedEmployee);
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteEmployee = async (req, res, next) => {
            try {
                const id = parseInt(req.params.id);
                const existingEmployee = await this.employeeService.getEmployeeById(id);
                if (!existingEmployee) {
                    throw api_error_1.ApiError.notFound('Employee');
                }
                await this.employeeService.deleteEmployee(id);
                res.status(204).send();
            }
            catch (error) {
                next(error);
            }
        };
        this.bulkImportEmployees = async (req, res, next) => {
            try {
                if (!req.file) {
                    throw api_error_1.ApiError.badRequest('CSV file is required');
                }
                const csvContent = req.file.buffer.toString('utf-8');
                const employees = (0, csv_helper_1.parseCSV)(csvContent);
                if (!employees || employees.length === 0) {
                    throw api_error_1.ApiError.badRequest('CSV file is empty or invalid');
                }
                const result = await this.employeeService.bulkImportEmployees(employees);
                res.status(200).json(result);
            }
            catch (error) {
                next(error);
            }
        };
        this.exportEmployees = async (req, res, next) => {
            try {
                const query = {
                    limit: 10000,
                    search: req.query.search,
                    departmentId: req.query.departmentId ? parseInt(req.query.departmentId) : undefined,
                    position: req.query.position,
                    skills: req.query.skills,
                    salaryMin: req.query.salaryMin ? parseFloat(req.query.salaryMin) : undefined,
                    salaryMax: req.query.salaryMax ? parseFloat(req.query.salaryMax) : undefined,
                    isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
                    sortBy: req.query.sortBy || 'lastName',
                    sortOrder: req.query.sortOrder || 'asc'
                };
                const result = await this.employeeService.getEmployees(query);
                const csvContent = (0, csv_helper_1.generateCSV)(result.data);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=employees.csv');
                res.status(200).send(csvContent);
            }
            catch (error) {
                next(error);
            }
        };
        this.getEmployeeAnalytics = async (_req, res, next) => {
            try {
                const analytics = await this.employeeService.getEmployeeAnalytics();
                res.status(200).json(analytics);
            }
            catch (error) {
                next(error);
            }
        };
        this.employeeService = new employee_service_1.EmployeeService();
    }
}
exports.EmployeeController = EmployeeController;
//# sourceMappingURL=employee.controller.js.map