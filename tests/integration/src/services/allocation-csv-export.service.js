"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllocationCSVExportService = void 0;
const database_service_1 = require("../database/database.service");
/**
 * CSV Export Service for Resource Allocations
 * Implements PRD requirements for CSV export functionality
 */
class AllocationCSVExportService {
    /**
     * Export allocations to CSV format using real database data
     * @param options - Export options including filters and date range
     */
    static async exportAllocationsToCSV(options = {}) {
        // Validate date range if provided
        if (options.startDate && options.endDate && options.startDate > options.endDate) {
            throw new Error('Invalid date range: start date must be before end date');
        }
        await this.db.connect();
        // Build query with filters
        let query = `
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
      WHERE ra.status = 'active'
    `;
        const queryParams = [];
        let paramIndex = 1;
        // Add filters
        if (options.employeeId) {
            query += ` AND ra.employee_id = $${paramIndex}`;
            queryParams.push(options.employeeId);
            paramIndex++;
        }
        if (options.projectId) {
            query += ` AND ra.project_id = $${paramIndex}`;
            queryParams.push(parseInt(options.projectId));
            paramIndex++;
        }
        if (options.startDate) {
            query += ` AND ra.end_date >= $${paramIndex}`;
            queryParams.push(options.startDate.toISOString().split('T')[0]);
            paramIndex++;
        }
        if (options.endDate) {
            query += ` AND ra.start_date <= $${paramIndex}`;
            queryParams.push(options.endDate.toISOString().split('T')[0]);
            paramIndex++;
        }
        query += ` ORDER BY ra.created_at DESC`;
        const result = await this.db.query(query, queryParams);
        // Transform database result to AllocationData format
        const allocations = result.rows.map(row => {
            // Calculate hours per week from allocation percentage if planned_hours_per_week is null
            let hoursPerWeek = 0;
            if (row.planned_hours_per_week) {
                hoursPerWeek = parseFloat(row.planned_hours_per_week);
            }
            else if (row.planned_allocation_percentage) {
                // Standard 40-hour work week * allocation percentage / 100
                hoursPerWeek = (40 * parseFloat(row.planned_allocation_percentage)) / 100;
            }
            return {
                id: row.id.toString(),
                employeeName: row.employee_name,
                projectName: row.project_name,
                plannedHoursPerWeek: hoursPerWeek,
                startDate: row.start_date,
                endDate: row.end_date,
                status: row.status.toUpperCase(),
                employeeEmail: row.employee_email,
                position: row.position,
                notes: row.notes,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        });
        // Generate CSV content
        return AllocationCSVExportService.generateCSVFromAllocations(allocations, options);
    }
    /**
     * Generate CSV content from allocation data with exact PRD field order
     */
    static generateCSVFromAllocations(allocations, options = {}) {
        // PRD exact field order: Employee Name, Project Name, Hours per Week, Start Date, End Date
        const basicHeaders = ['Employee Name', 'Project Name', 'Hours per Week', 'Start Date', 'End Date'];
        const enhancedHeaders = ['Role', 'Status', 'Employee Email', 'Department', 'Notes', 'Created Date', 'Last Updated'];
        const headers = options.includeEnhancedFields ? [...basicHeaders, ...enhancedHeaders] : basicHeaders;
        if (allocations.length === 0) {
            // Return CSV with headers only
            let csvContent = headers.join(',') + '\r\n';
            // Add summary section even for empty data if requested
            if (options.includeSummary) {
                csvContent += '\r\nSUMMARY\r\n';
                csvContent += 'Total Employees:,0\r\n';
                csvContent += 'Total Projects:,0\r\n';
                csvContent += 'Total Allocations:,0\r\n';
                csvContent += 'Average Utilization:,0%\r\n';
            }
            return csvContent;
        }
        // Generate CSV rows with exact PRD field order
        const csvRows = allocations.map(allocation => {
            const basicRow = [
                AllocationCSVExportService.escapeCSVField(allocation.employeeName), // Employee Name
                AllocationCSVExportService.escapeCSVField(allocation.projectName), // Project Name
                allocation.plannedHoursPerWeek.toString(), // Hours per Week
                allocation.startDate, // Start Date
                allocation.endDate, // End Date
            ];
            if (options.includeEnhancedFields) {
                const enhancedRow = [
                    AllocationCSVExportService.escapeCSVField(allocation.position || 'Not Specified'), // Role
                    allocation.status, // Status
                    AllocationCSVExportService.escapeCSVField(allocation.employeeEmail || ''), // Employee Email
                    AllocationCSVExportService.escapeCSVField('Engineering'), // Department (would need department join)
                    AllocationCSVExportService.escapeCSVField(allocation.notes || ''), // Notes
                    allocation.createdAt ? new Date(allocation.createdAt).toISOString().split('T')[0] : '', // Created Date
                    allocation.updatedAt ? new Date(allocation.updatedAt).toISOString().split('T')[0] : '' // Last Updated
                ];
                return [...basicRow, ...enhancedRow].join(',');
            }
            return basicRow.join(',');
        });
        // Build CSV content with Excel-compatible line endings
        let csvContent = headers.join(',') + '\r\n';
        csvContent += csvRows.join('\r\n');
        // Add summary section if requested
        if (options.includeSummary) {
            csvContent += '\r\n\r\nSUMMARY\r\n';
            csvContent += `Total Employees:,${new Set(allocations.map(a => a.employeeName)).size}\r\n`;
            csvContent += `Total Projects:,${new Set(allocations.map(a => a.projectName)).size}\r\n`;
            csvContent += `Total Allocations:,${allocations.length}\r\n`;
            // Calculate average hours per week
            const avgHours = allocations.reduce((sum, a) => sum + a.plannedHoursPerWeek, 0) / allocations.length;
            csvContent += `Average Hours per Week:,${avgHours.toFixed(1)}\r\n`;
        }
        return csvContent;
    }
    /**
     * Escape CSV field to handle special characters - Excel compatible
     */
    static escapeCSVField(value) {
        if (!value)
            return '';
        const stringValue = value.toString();
        // If the value contains comma, quote, or newline, wrap in quotes
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
            // Escape existing quotes by doubling them (Excel standard)
            const escaped = stringValue.replace(/"/g, '""');
            return `"${escaped}"`;
        }
        return stringValue;
    }
    /**
     * Generate filename for CSV export
     */
    static generateCSVFilename(options = {}) {
        const currentDate = new Date().toISOString().split('T')[0];
        let filename = `resource-allocations-${currentDate}`;
        if (options.startDate && options.endDate) {
            const startStr = options.startDate.toISOString().split('T')[0];
            const endStr = options.endDate.toISOString().split('T')[0];
            filename = `resource-allocations-${startStr}-to-${endStr}`;
        }
        return `${filename}.csv`;
    }
}
exports.AllocationCSVExportService = AllocationCSVExportService;
AllocationCSVExportService.db = database_service_1.DatabaseService.getInstance();
