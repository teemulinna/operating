"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportController = void 0;
const express_validator_1 = require("express-validator");
const exceljs_1 = __importDefault(require("exceljs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
class ExportController {
    static initialize(pool) {
        console.log('🔧 Initializing ExportController with pool:', !!pool);
        this.pool = pool;
        console.log('✅ ExportController initialized successfully');
    }
    /**
     * Export employees as CSV
     */
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
            // Build query based on filters
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
            console.log('🔍 ExportController: this.pool is', !!this.pool);
            if (!this.pool) {
                throw new Error('Database pool is not initialized. Call ExportController.initialize() first.');
            }
            console.log('🔍 About to query database with pool:', !!this.pool);
            if (!this.pool) {
                console.error('❌ Database pool is not initialized!');
                throw new Error('Database pool is not initialized. Call ExportController.initialize() first.');
            }
            const result = await this.pool.query(query, values);
            const employees = result.rows;
            // Map field names for CSV headers
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
            // Generate CSV headers
            const csvHeaders = fields.map((field) => fieldMapping[field] || field).join(',');
            // Generate CSV rows
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
                    // Escape CSV values
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
    /**
     * Export projects as CSV
     */
    static async exportProjectsCSV(req, res) {
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
            const { filters = {}, fields = ['name', 'status', 'startDate', 'endDate', 'budget', 'description'] } = req.body;
            // Build query based on filters
            let whereConditions = ['p.is_active = true'];
            const values = [];
            if (filters.status && filters.status !== 'all') {
                values.push(filters.status);
                whereConditions.push(`p.status = $${values.length}`);
            }
            if (filters.search) {
                values.push(`%${filters.search}%`);
                whereConditions.push(`(
          LOWER(p.name) ILIKE LOWER($${values.length}) OR 
          LOWER(p.description) ILIKE LOWER($${values.length})
        )`);
            }
            const whereClause = whereConditions.join(' AND ');
            const query = `
        SELECT 
          p.id,
          p.name,
          p.description,
          p.status,
          p.start_date,
          p.end_date,
          p.budget,
          p.created_at,
          p.updated_at,
          COUNT(ra.id) as allocated_resources
        FROM projects p
        LEFT JOIN resource_assignments ra ON p.id = ra.project_id AND ra.status = 'active'
        WHERE ${whereClause}
        GROUP BY p.id, p.name, p.description, p.status, p.start_date, p.end_date, p.budget, p.created_at, p.updated_at
        ORDER BY p.name
      `;
            const result = await this.pool.query(query, values);
            const projects = result.rows;
            // Map field names for CSV headers
            const fieldMapping = {
                name: 'Project Name',
                description: 'Description',
                status: 'Status',
                startDate: 'Start Date',
                endDate: 'End Date',
                budget: 'Budget',
                allocatedResources: 'Allocated Resources',
                createdAt: 'Created At',
                updatedAt: 'Updated At'
            };
            // Generate CSV headers
            const csvHeaders = fields.map((field) => fieldMapping[field] || field).join(',');
            // Generate CSV rows
            const csvRows = projects.map(project => {
                return fields.map((field) => {
                    let value;
                    switch (field) {
                        case 'startDate':
                            value = project.start_date ? new Date(project.start_date).toLocaleDateString() : '';
                            break;
                        case 'endDate':
                            value = project.end_date ? new Date(project.end_date).toLocaleDateString() : '';
                            break;
                        case 'allocatedResources':
                            value = project.allocated_resources || 0;
                            break;
                        case 'createdAt':
                            value = project.created_at ? new Date(project.created_at).toLocaleDateString() : '';
                            break;
                        case 'updatedAt':
                            value = project.updated_at ? new Date(project.updated_at).toLocaleDateString() : '';
                            break;
                        default:
                            value = project[field];
                    }
                    // Escape CSV values
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
            const filename = `projects_export_${timestamp}.csv`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', Buffer.byteLength(csvContent));
            res.send(csvContent);
        }
        catch (error) {
            console.error('Error exporting projects CSV:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export projects CSV',
                error: error.message
            });
        }
    }
    /**
     * Export allocations as CSV
     */
    static async exportAllocationsCSV(req, res) {
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
            const { filters = {}, fields = ['employeeName', 'projectName', 'plannedHoursPerWeek', 'startDate', 'endDate', 'status'] } = req.body;
            // Build query based on filters
            let whereConditions = ['ra.status = \'active\''];
            const values = [];
            if (filters.employeeId) {
                values.push(filters.employeeId);
                whereConditions.push(`ra.employee_id = $${values.length}`);
            }
            if (filters.projectId) {
                values.push(filters.projectId);
                whereConditions.push(`ra.project_id = $${values.length}`);
            }
            if (filters.status && filters.status !== 'all') {
                values.push(filters.status);
                whereConditions.push(`ra.status = $${values.length}`);
            }
            const whereClause = whereConditions.join(' AND ');
            const query = `
        SELECT 
          ra.id,
          ra.employee_id,
          ra.project_id,
          e.first_name || ' ' || e.last_name as employee_name,
          e.email as employee_email,
          e.position,
          p.name as project_name,
          p.status as project_status,
          ra.planned_allocation_percentage,
          ra.actual_allocation_percentage,
          ra.planned_hours_per_week,
          ra.start_date,
          ra.end_date,
          ra.status,
          ra.notes,
          ra.created_at,
          ra.updated_at
        FROM resource_assignments ra
        JOIN employees e ON ra.employee_id = e.id
        JOIN projects p ON ra.project_id = p.id
        WHERE ${whereClause}
        ORDER BY ra.start_date DESC
      `;
            const result = await this.pool.query(query, values);
            const allocations = result.rows;
            // Map field names for CSV headers
            const fieldMapping = {
                employeeName: 'Employee Name',
                employeeEmail: 'Employee Email',
                position: 'Position',
                projectName: 'Project Name',
                plannedHoursPerWeek: 'Planned Hours/Week',
                plannedAllocationPercentage: 'Allocation %',
                actualAllocationPercentage: 'Actual Allocation %',
                startDate: 'Start Date',
                endDate: 'End Date',
                status: 'Status',
                notes: 'Notes',
                createdAt: 'Created At',
                updatedAt: 'Updated At'
            };
            // Generate CSV headers
            const csvHeaders = fields.map((field) => fieldMapping[field] || field).join(',');
            // Generate CSV rows
            const csvRows = allocations.map(allocation => {
                return fields.map((field) => {
                    let value;
                    switch (field) {
                        case 'employeeName':
                            value = allocation.employee_name;
                            break;
                        case 'employeeEmail':
                            value = allocation.employee_email;
                            break;
                        case 'projectName':
                            value = allocation.project_name;
                            break;
                        case 'plannedHoursPerWeek':
                            // Calculate hours per week if not available
                            if (allocation.planned_hours_per_week) {
                                value = allocation.planned_hours_per_week;
                            }
                            else if (allocation.planned_allocation_percentage) {
                                value = (40 * parseFloat(allocation.planned_allocation_percentage)) / 100;
                            }
                            else {
                                value = 0;
                            }
                            break;
                        case 'plannedAllocationPercentage':
                            value = allocation.planned_allocation_percentage || 0;
                            break;
                        case 'actualAllocationPercentage':
                            value = allocation.actual_allocation_percentage || 0;
                            break;
                        case 'startDate':
                            value = allocation.start_date ? new Date(allocation.start_date).toLocaleDateString() : '';
                            break;
                        case 'endDate':
                            value = allocation.end_date ? new Date(allocation.end_date).toLocaleDateString() : '';
                            break;
                        case 'createdAt':
                            value = allocation.created_at ? new Date(allocation.created_at).toLocaleDateString() : '';
                            break;
                        case 'updatedAt':
                            value = allocation.updated_at ? new Date(allocation.updated_at).toLocaleDateString() : '';
                            break;
                        default:
                            value = allocation[field];
                    }
                    // Escape CSV values
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
            const filename = `allocations_export_${timestamp}.csv`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', Buffer.byteLength(csvContent));
            res.send(csvContent);
        }
        catch (error) {
            console.error('Error exporting allocations CSV:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export allocations CSV',
                error: error.message
            });
        }
    }
    /**
     * Export employees as Excel
     */
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
            const { filters = {}, 
            // _includeCharts = false,
            // _worksheets = ['employees'],
            fields = ['firstName', 'lastName', 'email', 'position', 'departmentName', 'status'] } = req.body;
            // Build query based on filters (same logic as CSV export)
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
            // Create Excel workbook
            const workbook = new exceljs_1.default.Workbook();
            workbook.creator = 'Resource Management System';
            workbook.created = new Date();
            // Create worksheet
            const worksheet = workbook.addWorksheet('Employees');
            // Map field names for headers
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
            // Add headers
            const headers = fields.map((field) => fieldMapping[field] || field);
            const headerRow = worksheet.addRow(headers);
            // Style the header row
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFF' } };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: '366092' }
                };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
            // Add data rows
            employees.forEach(employee => {
                const rowData = fields.map((field) => {
                    switch (field) {
                        case 'firstName':
                            return employee.first_name;
                        case 'lastName':
                            return employee.last_name;
                        case 'departmentName':
                            return employee.department_name;
                        case 'currentProjects':
                            return employee.current_projects;
                        case 'availableHours':
                            return employee.available_hours;
                        case 'hireDate':
                            return employee.hire_date ? new Date(employee.hire_date) : null;
                        case 'createdAt':
                            return employee.created_at ? new Date(employee.created_at) : null;
                        case 'updatedAt':
                            return employee.updated_at ? new Date(employee.updated_at) : null;
                        default:
                            return employee[field];
                    }
                });
                const dataRow = worksheet.addRow(rowData);
                // Style data rows
                dataRow.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            });
            // Auto-fit columns
            worksheet.columns.forEach(column => {
                if (column.header) {
                    const maxLength = Math.max(column.header.length, ...column.values?.map(v => (v ? v.toString().length : 0)) || [0]);
                    column.width = Math.min(Math.max(maxLength + 2, 10), 50);
                }
            });
            // Generate Excel buffer
            const buffer = await workbook.xlsx.writeBuffer();
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `employees_export_${timestamp}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', buffer.byteLength.toString());
            res.send(buffer);
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
    /**
     * Generate PDF capacity planning report
     */
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
            // Get capacity data for report
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
            // Create PDF document
            const doc = new pdfkit_1.default();
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => {
                const pdfData = Buffer.concat(chunks);
                const timestamp = new Date().toISOString().split('T')[0];
                const filename = `capacity-report-${reportType}-${timestamp}.pdf`;
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.setHeader('Content-Length', pdfData.length);
                res.send(pdfData);
            });
            // Add content to PDF
            doc.fontSize(20).text('Capacity Planning Report', 50, 50);
            doc.fontSize(14).text(`Report Type: ${reportType}`, 50, 80);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, 50, 100);
            if (dateRange) {
                doc.text(`Date Range: ${dateRange.startDate} - ${dateRange.endDate}`, 50, 120);
            }
            // Add summary section
            doc.fontSize(16).text('Department Summary', 50, 160);
            let yPosition = 190;
            const totalEmployees = capacityData.reduce((sum, dept) => sum + parseInt(dept.total_employees), 0);
            const avgCapacity = capacityData.reduce((sum, dept) => sum + parseFloat(dept.avg_capacity), 0) / capacityData.length;
            doc.fontSize(12);
            doc.text(`Total Employees: ${totalEmployees}`, 50, yPosition);
            yPosition += 20;
            doc.text(`Average Capacity: ${avgCapacity.toFixed(1)}%`, 50, yPosition);
            yPosition += 30;
            // Add department details table
            doc.fontSize(14).text('Department Details', 50, yPosition);
            yPosition += 30;
            // Table headers
            doc.fontSize(10);
            doc.text('Department', 50, yPosition);
            doc.text('Total Employees', 150, yPosition);
            doc.text('Avg Capacity', 250, yPosition);
            doc.text('Available', 330, yPosition);
            doc.text('Busy', 390, yPosition);
            doc.text('Unavailable', 450, yPosition);
            yPosition += 20;
            // Draw line under headers
            doc.moveTo(50, yPosition).lineTo(520, yPosition).stroke();
            yPosition += 10;
            // Add department data
            capacityData.forEach(dept => {
                if (yPosition > 720) { // Check if we need a new page
                    doc.addPage();
                    yPosition = 50;
                }
                doc.text(dept.department_name.substring(0, 15), 50, yPosition);
                doc.text(dept.total_employees.toString(), 150, yPosition);
                doc.text(`${parseFloat(dept.avg_capacity).toFixed(1)}%`, 250, yPosition);
                doc.text(dept.available_count.toString(), 330, yPosition);
                doc.text(dept.busy_count.toString(), 390, yPosition);
                doc.text(dept.unavailable_count.toString(), 450, yPosition);
                yPosition += 20;
            });
            // Add capacity distribution chart (simple text representation)
            if (includeCharts && yPosition < 650) {
                yPosition += 30;
                doc.fontSize(14).text('Capacity Distribution', 50, yPosition);
                yPosition += 20;
                capacityData.forEach(dept => {
                    if (yPosition > 720) {
                        doc.addPage();
                        yPosition = 50;
                    }
                    const total = parseInt(dept.available_count) + parseInt(dept.busy_count) + parseInt(dept.unavailable_count);
                    const availablePercent = ((parseInt(dept.available_count) / total) * 100).toFixed(1);
                    const busyPercent = ((parseInt(dept.busy_count) / total) * 100).toFixed(1);
                    const unavailablePercent = ((parseInt(dept.unavailable_count) / total) * 100).toFixed(1);
                    doc.fontSize(10);
                    doc.text(`${dept.department_name}:`, 50, yPosition);
                    doc.text(`Available: ${availablePercent}% | Busy: ${busyPercent}% | Unavailable: ${unavailablePercent}%`, 70, yPosition + 12);
                    yPosition += 30;
                });
            }
            // Add projections if requested
            if (includeProjections && yPosition < 650) {
                yPosition += 30;
                doc.fontSize(14).text('Capacity Projections', 50, yPosition);
                yPosition += 20;
                doc.fontSize(10);
                doc.text('Based on current trends, the following departments may experience capacity constraints:', 50, yPosition);
                yPosition += 20;
                capacityData.forEach(dept => {
                    const utilizationRate = (parseInt(dept.busy_count) / parseInt(dept.total_employees)) * 100;
                    if (utilizationRate > 75) {
                        doc.text(`• ${dept.department_name}: ${utilizationRate.toFixed(1)}% utilization - Consider additional resources`, 60, yPosition);
                        yPosition += 15;
                    }
                });
            }
            // Add footer
            doc.fontSize(8).text(`Generated by Resource Management System on ${new Date().toLocaleString()}`, 50, 750);
            doc.end();
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
    /**
     * Schedule automated reports
     */
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
            const { reportType, frequency, format, recipients, filters
            // startDate
             } = req.body;
            // Calculate next run time based on frequency
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
            // Create schedule record
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
    /**
     * Sync data with external project management tools
     */
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
                    // Mock external API integration
                    // In production, you would make actual API calls to JIRA, Asana, etc.
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
            // Log sync attempt
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
    /**
     * Mock JIRA integration
     */
    static async syncWithJira(_syncType, data) {
        // In production, implement actual JIRA API integration
        // Example: await jiraClient.updateIssueCapacity(data.issueId, data.capacity);
        return {
            recordsProcessed: 1,
            details: {
                issueUpdated: 'PROJ-123',
                capacityUpdated: data.capacity,
                assigneeCapacity: data.availableHours
            }
        };
    }
    /**
     * Mock Asana integration
     */
    static async syncWithAsana(_syncType, data) {
        // In production, implement actual Asana API integration
        // Example: await asanaClient.updateUserCapacity(data.userId, data.capacity);
        return {
            recordsProcessed: 1,
            details: {
                taskCapacityUpdated: 'task_123456789',
                userCapacity: data.capacity,
                availableHours: data.availableHours
            }
        };
    }
    /**
     * Mock Trello integration
     */
    static async syncWithTrello(_syncType, data) {
        // In production, implement actual Trello API integration
        // Example: await trelloClient.updateBoardMemberCapacity(data.boardId, data.memberId, data.capacity);
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
