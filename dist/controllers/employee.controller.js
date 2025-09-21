"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeController = void 0;
const employee_service_1 = require("../services/employee.service");
const api_error_1 = require("../utils/api-error");
const csv_helper_1 = require("../utils/csv-helper");
const websocket_service_1 = require("../websocket/websocket.service");
class EmployeeController {
    constructor() {
        // GET /api/employees
        this.getEmployees = async (req, res, next) => {
            try {
                const query = {
                    page: parseInt(req.query.page) || 1,
                    limit: parseInt(req.query.limit) || 10,
                    search: req.query.search,
                    departmentId: req.query.departmentId || undefined,
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
        // GET /api/employees/:id
        this.getEmployeeById = async (req, res, next) => {
            try {
                const id = req.params.id;
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
        // POST /api/employees
        this.createEmployee = async (req, res, next) => {
            try {
                const requestData = req.body;
                // Transform frontend request to backend format
                const employeeData = {
                    firstName: requestData.firstName,
                    lastName: requestData.lastName,
                    email: requestData.email,
                    position: requestData.position,
                    departmentId: requestData.departmentId,
                    salary: requestData.salary,
                    skills: requestData.skills || []
                };
                // Check for duplicate email
                const existingEmployee = await this.employeeService.getEmployeeByEmail(employeeData.email);
                if (existingEmployee) {
                    throw api_error_1.ApiError.conflict('An employee with this email already exists');
                }
                const newEmployee = await this.employeeService.createEmployee(employeeData);
                // Emit real-time event for employee creation
                this.webSocketService.sendNotification({
                    id: `employee-created-${newEmployee.id}-${Date.now()}`,
                    type: 'employee_created',
                    title: 'New Employee Added',
                    message: `${newEmployee.firstName} ${newEmployee.lastName} has been added to the team`,
                    timestamp: new Date().toISOString(),
                    isRead: false,
                    priority: 'medium',
                    data: newEmployee
                });
                res.status(201).json(newEmployee);
            }
            catch (error) {
                next(error);
            }
        };
        // PUT /api/employees/:id
        this.updateEmployee = async (req, res, next) => {
            try {
                const id = req.params.id;
                const updateData = req.body;
                // Check if employee exists
                const existingEmployee = await this.employeeService.getEmployeeById(id);
                if (!existingEmployee) {
                    throw api_error_1.ApiError.notFound('Employee');
                }
                // Check for duplicate email if email is being updated
                if (updateData.email && updateData.email !== existingEmployee.email) {
                    const duplicateEmployee = await this.employeeService.getEmployeeByEmail(updateData.email);
                    if (duplicateEmployee) {
                        throw api_error_1.ApiError.conflict('An employee with this email already exists');
                    }
                }
                const updatedEmployee = await this.employeeService.updateEmployee(id, updateData);
                // Emit real-time event for employee update
                this.webSocketService.sendNotification({
                    id: `employee-updated-${updatedEmployee.id}-${Date.now()}`,
                    type: 'employee_updated',
                    title: 'Employee Updated',
                    message: `${updatedEmployee.firstName} ${updatedEmployee.lastName}'s information has been updated`,
                    timestamp: new Date().toISOString(),
                    isRead: false,
                    priority: 'low',
                    data: updatedEmployee
                });
                res.status(200).json(updatedEmployee);
            }
            catch (error) {
                next(error);
            }
        };
        // DELETE /api/employees/:id
        this.deleteEmployee = async (req, res, next) => {
            try {
                const id = req.params.id;
                // Check if employee exists
                const existingEmployee = await this.employeeService.getEmployeeById(id);
                if (!existingEmployee) {
                    throw api_error_1.ApiError.notFound('Employee');
                }
                await this.employeeService.deleteEmployee(id);
                // Emit real-time event for employee deletion
                this.webSocketService.sendNotification({
                    id: `employee-deleted-${id}-${Date.now()}`,
                    type: 'employee_deleted',
                    title: 'Employee Removed',
                    message: `${existingEmployee.firstName} ${existingEmployee.lastName} has been removed from the team`,
                    timestamp: new Date().toISOString(),
                    isRead: false,
                    priority: 'high',
                    data: { employeeId: id, deletedEmployee: existingEmployee }
                });
                res.status(204).send();
            }
            catch (error) {
                next(error);
            }
        };
        // POST /api/employees/bulk-import
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
        // GET /api/employees/export
        this.exportEmployees = async (req, res, next) => {
            try {
                const query = {
                    // Export all employees (no pagination)
                    limit: 10000,
                    search: req.query.search,
                    departmentId: req.query.departmentId || undefined,
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
        // GET /api/employees/analytics
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
        this.webSocketService = websocket_service_1.WebSocketService.getInstance();
    }
}
exports.EmployeeController = EmployeeController;
