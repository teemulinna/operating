"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportController = void 0;
const express_validator_1 = require("express-validator");
class ExportController {
    static initialize(pool) {
        this.pool = pool;
    }
    static async exportEmployeesCSV(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
                return;
            }
            const { filters = {}, fields = ['firstName', 'lastName', 'email', 'position', 'departmentName', 'status'] } = req.body;
            let whereConditions = ['e.is_active = true'];
            const values = [];
            if (filters.status && filters.status !== 'all') {
                values.push(filters.status);
                whereConditions.push(`COALESCE(ea.status, 'available') = $${values.length}`);
            }
            if (filters.departmentId) {
                values.push(filters.departmentId);
                whereConditions.push(`e.department_id = $${values.length}`);
            }
            if (filters.search) {
                values.push(`%${filters.search}%`);
                whereConditions.push(`(
          LOWER(e.first_name) ILIKE LOWER($${values.length}) OR 
          LOWER(e.last_name) ILIKE LOWER($${values.length}) OR 
          LOWER(e.email) ILIKE LOWER($${values.length}) OR 
          LOWER(e.position) ILIKE LOWER($${values.length})
        )`);
            }
            const whereClause = whereConditions.join(' AND ');
            const query = `
        SELECT 
          e.id,
          e.first_name,
          e.last_name,
          e.email,
          e.position,
          e.hire_date,
          d.name as department_name,
          COALESCE(ea.status, 'available') as status,
          COALESCE(ea.capacity, 100) as capacity,
          COALESCE(ea.current_projects, 0) as current_projects,
          COALESCE(ea.available_hours, 40) as available_hours,
          e.created_at,
          e.updated_at
        FROM employees e
        JOIN departments d ON e.department_id = d.id
        LEFT JOIN employee_availability ea ON e.id = ea.employee_id
        WHERE ${whereClause}
        ORDER BY e.last_name, e.first_name
      `;
            const result = await this.pool.query(query, values);
            const employees = result.rows;
            const fieldMapping = {
                firstName: 'First Name',
                lastName: 'Last Name',
                email: 'Email',
                position: 'Position',
                departmentName: 'Department',
                status: 'Status',
                capacity: 'Capacity (%)',
                currentProjects: 'Current Projects',
                availableHours: 'Available Hours',
                hireDate: 'Hire Date',
                createdAt: 'Created At',
                updatedAt: 'Updated At'
            };
            const csvHeaders = fields.map((field) => fieldMapping[field] || field).join(',');
            const csvRows = employees.map(employee => {
                return fields.map((field) => {
                    let value;
                    switch (field) {
                        case 'firstName':
                            value = employee.first_name;
                            break;
                        case 'lastName':
                            value = employee.last_name;
                            break;
                        case 'departmentName':
                            value = employee.department_name;
                            break;
                        case 'currentProjects':
                            value = employee.current_projects;
                            break;
                        case 'availableHours':
                            value = employee.available_hours;
                            break;
                        case 'hireDate':
                            value = employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : '';
                            break;
                        case 'createdAt':
                            value = employee.created_at ? new Date(employee.created_at).toLocaleDateString() : '';
                            break;
                        case 'updatedAt':
                            value = employee.updated_at ? new Date(employee.updated_at).toLocaleDateString() : '';
                            break;
                        default:
                            value = employee[field];
                    }
                    if (value === null || value === undefined) {
                        return '';
                    }
                    const stringValue = String(value);
                    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                        return `"${stringValue.replace(/"/g, '""')}"`;
                    }
                    return stringValue;
                }).join(',');
            }).join('\n');
            const csvContent = `${csvHeaders}\n${csvRows}`;
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `employees_export_${timestamp}.csv`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', Buffer.byteLength(csvContent));
            res.send(csvContent);
        }
        catch (error) {
            console.error('Error exporting CSV:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export CSV',
                error: error.message
            });
        }
    }
    static async exportEmployeesExcel(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
                return;
            }
            const { filters = {}, includeCharts = false, worksheets = ['employees'] } = req.body;
            const mockExcelData = Buffer.from('Excel file content would be here');
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `employees_export_${timestamp}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', mockExcelData.length);
            res.send(mockExcelData);
        }
        catch (error) {
            console.error('Error exporting Excel:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export Excel',
                error: error.message
            });
        }
    }
    static async generateCapacityReportPDF(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
                return;
            }
            const { dateRange, includeDepartments = [], reportType = 'quarterly', includeCharts = true, includeProjections = true } = req.body;
            let whereConditions = ['e.is_active = true'];
            const values = [];
            if (includeDepartments.length > 0) {
                values.push(includeDepartments);
                whereConditions.push(`e.department_id = ANY($${values.length})`);
            }
            const whereClause = whereConditions.join(' AND ');
            const query = `
        SELECT 
          d.name as department_name,
          COUNT(e.id) as total_employees,
          AVG(COALESCE(ea.capacity, 100)) as avg_capacity,
          COUNT(*) FILTER (WHERE COALESCE(ea.status, 'available') = 'available') as available_count,
          COUNT(*) FILTER (WHERE COALESCE(ea.status, 'available') = 'busy') as busy_count,
          COUNT(*) FILTER (WHERE COALESCE(ea.status, 'available') = 'unavailable') as unavailable_count
        FROM employees e
        JOIN departments d ON e.department_id = d.id
        LEFT JOIN employee_availability ea ON e.id = ea.employee_id
        WHERE ${whereClause}
        GROUP BY d.id, d.name
        ORDER BY d.name
      `;
            const result = await this.pool.query(query, values);
            const capacityData = result.rows;
            const mockPDFData = Buffer.from('PDF report content would be here');
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `capacity-report-${reportType}-${timestamp}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', mockPDFData.length);
            res.send(mockPDFData);
        }
        catch (error) {
            console.error('Error generating PDF report:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate PDF report',
                error: error.message
            });
        }
    }
    static async scheduleReport(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
                return;
            }
            const { reportType, frequency, format, recipients, filters, startDate } = req.body;
            const now = new Date();
            let nextRun;
            switch (frequency) {
                case 'daily':
                    nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                    break;
                case 'weekly':
                    nextRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'monthly':
                    nextRun = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
                    break;
                default:
                    nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            }
            const scheduleQuery = `
        INSERT INTO report_schedules (
          report_type, frequency, format, recipients, filters, next_run, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP)
        RETURNING *
      `;
            const scheduleValues = [
                reportType,
                frequency,
                format,
                JSON.stringify(recipients),
                JSON.stringify(filters || {}),
                nextRun
            ];
            const result = await this.pool.query(scheduleQuery, scheduleValues);
            const schedule = result.rows[0];
            res.status(201).json({
                success: true,
                message: 'Report schedule created successfully',
                data: {
                    scheduleId: schedule.id,
                    reportType: schedule.report_type,
                    frequency: schedule.frequency,
                    format: schedule.format,
                    recipients: JSON.parse(schedule.recipients),
                    filters: JSON.parse(schedule.filters),
                    nextRun: schedule.next_run,
                    isActive: schedule.is_active
                },
                scheduleId: schedule.id,
                nextRun: schedule.next_run
            });
        }
        catch (error) {
            console.error('Error scheduling report:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to schedule report',
                error: error.message
            });
        }
    }
    static async syncWithExternalTools(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
                return;
            }
            const { targetSystems, syncType, data } = req.body;
            const syncResults = [];
            for (const system of targetSystems) {
                try {
                    let syncResult;
                    switch (system.toLowerCase()) {
                        case 'jira':
                            syncResult = await this.syncWithJira(syncType, data);
                            break;
                        case 'asana':
                            syncResult = await this.syncWithAsana(syncType, data);
                            break;
                        case 'trello':
                            syncResult = await this.syncWithTrello(syncType, data);
                            break;
                        default:
                            throw new Error(`Unsupported system: ${system}`);
                    }
                    syncResults.push({
                        system,
                        status: 'success',
                        syncedAt: new Date().toISOString(),
                        recordsProcessed: syncResult.recordsProcessed || 1,
                        details: syncResult.details
                    });
                }
                catch (error) {
                    syncResults.push({
                        system,
                        status: 'error',
                        syncedAt: new Date().toISOString(),
                        error: error.message
                    });
                }
            }
            const logQuery = `
        INSERT INTO external_sync_log (
          target_systems, sync_type, sync_data, results, created_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `;
            await this.pool.query(logQuery, [
                JSON.stringify(targetSystems),
                syncType,
                JSON.stringify(data),
                JSON.stringify(syncResults)
            ]);
            res.json({
                success: true,
                message: 'External sync completed',
                syncResults
            });
        }
        catch (error) {
            console.error('Error syncing with external tools:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to sync with external tools',
                error: error.message
            });
        }
    }
    static async syncWithJira(syncType, data) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
            recordsProcessed: 1,
            details: {
                issueUpdated: 'PROJ-123',
                capacityUpdated: data.capacity,
                assigneeCapacity: data.availableHours
            }
        };
    }
    static async syncWithAsana(syncType, data) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
            recordsProcessed: 1,
            details: {
                taskCapacityUpdated: 'task_123456789',
                userCapacity: data.capacity,
                availableHours: data.availableHours
            }
        };
    }
    static async syncWithTrello(syncType, data) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
            recordsProcessed: 1,
            details: {
                boardUpdated: 'board_123',
                memberCapacity: data.capacity,
                cardAssignments: data.currentProjects
            }
        };
    }
}
exports.ExportController = ExportController;
//# sourceMappingURL=exportController.js.map