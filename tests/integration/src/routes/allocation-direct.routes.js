"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const database_service_1 = require("../database/database.service");
const async_handler_1 = require("../middleware/async-handler");
const router = (0, express_1.Router)();
const db = database_service_1.DatabaseService.getInstance();
/**
 * Direct allocation creation endpoint - bypasses complex models for MVP
 * This provides a working allocation creation without the issues in AllocationService
 */
router.post('/direct', 
// Simplified validation
[
    (0, express_validator_1.body)('employeeId').notEmpty().withMessage('Employee ID is required'),
    (0, express_validator_1.body)('projectId').notEmpty().withMessage('Project ID is required'),
    (0, express_validator_1.body)('allocatedHours').isFloat({ min: 0.1, max: 168 }).withMessage('Allocated hours must be between 0.1 and 168'),
    (0, express_validator_1.body)('roleOnProject').optional().isString().withMessage('Role must be a string'),
    (0, express_validator_1.body)('startDate').isISO8601().withMessage('Start date must be valid ISO date').toDate(),
    (0, express_validator_1.body)('endDate').isISO8601().withMessage('End date must be valid ISO date').toDate(),
    (0, express_validator_1.body)('notes').optional().isString().withMessage('Notes must be a string')
], (0, async_handler_1.asyncHandler)(async (req, res) => {
    // Check validation errors
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    await db.connect();
    const { employeeId, projectId, allocatedHours, roleOnProject, startDate, endDate, notes } = req.body;
    try {
        // Step 1: Verify employee exists and is active
        const employeeResult = await db.query('SELECT id, first_name, last_name, is_active FROM employees WHERE id = $1', [employeeId]);
        if (employeeResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }
        const employee = employeeResult.rows[0];
        if (!employee.is_active) {
            return res.status(400).json({
                success: false,
                message: 'Cannot allocate to inactive employee'
            });
        }
        // Step 2: Verify project exists and is active
        const projectResult = await db.query('SELECT id, name, is_active FROM projects WHERE id = $1', [parseInt(String(projectId))] // Ensure integer for project_id
        );
        if (projectResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }
        const project = projectResult.rows[0];
        if (!project.is_active) {
            return res.status(400).json({
                success: false,
                message: 'Cannot allocate to inactive project'
            });
        }
        // Step 3: Calculate allocation percentage (assuming 40 hour work week)
        const allocationPercentage = (parseFloat(allocatedHours) / 40) * 100;
        // Step 4: Check for overlapping allocations (simple conflict detection)
        const overlapResult = await db.query(`
        SELECT 
          SUM(planned_allocation_percentage) as total_allocation
        FROM resource_assignments
        WHERE employee_id = $1 
          AND status IN ('planned', 'active')
          AND ((start_date <= $2 AND end_date >= $2) 
               OR (start_date <= $3 AND end_date >= $3) 
               OR (start_date >= $2 AND end_date <= $3))
      `, [employeeId, startDate, endDate]);
        const existingAllocation = parseFloat(overlapResult.rows[0]?.total_allocation || '0');
        const totalAllocation = existingAllocation + allocationPercentage;
        if (totalAllocation > 100) {
            return res.status(409).json({
                success: false,
                message: `Allocation conflict detected. Total allocation would be ${totalAllocation.toFixed(1)}% (exceeds 100%).`,
                currentAllocation: existingAllocation,
                requestedAllocation: allocationPercentage,
                totalAllocation: totalAllocation
            });
        }
        // Step 5: Create the allocation
        const insertQuery = `
        INSERT INTO resource_assignments (
          employee_id, project_id, start_date, end_date, 
          planned_allocation_percentage, status, notes
        )
        VALUES ($1, $2, $3, $4, $5, 'planned', $6)
        RETURNING *
      `;
        const values = [
            employeeId,
            parseInt(String(projectId)),
            startDate,
            endDate,
            allocationPercentage,
            notes || `${roleOnProject || 'Team Member'} - ${parseFloat(allocatedHours).toFixed(1)} hours`
        ];
        const result = await db.query(insertQuery, values);
        const allocation = result.rows[0];
        // Step 6: Return success response
        return res.status(201).json({
            success: true,
            message: 'Allocation created successfully',
            data: {
                id: allocation.id,
                employeeId: allocation.employee_id,
                employeeName: `${employee.first_name} ${employee.last_name}`,
                projectId: allocation.project_id,
                projectName: project.name,
                allocationPercentage: parseFloat(allocation.planned_allocation_percentage),
                allocatedHours: parseFloat(allocatedHours),
                roleOnProject: roleOnProject || 'Team Member',
                startDate: allocation.start_date,
                endDate: allocation.end_date,
                status: allocation.status,
                notes: allocation.notes,
                createdAt: allocation.created_at
            }
        });
    }
    catch (error) {
        console.error('Direct allocation creation error:', error);
        if (error.code === '23503') { // Foreign key constraint violation
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID or project ID'
            });
        }
        if (error.code === '23514') { // Check constraint violation
            return res.status(400).json({
                success: false,
                message: 'Invalid allocation data - check dates and percentage'
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Internal server error during allocation creation',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}));
/**
 * Get allocations using direct database queries
 */
router.get('/direct', (0, async_handler_1.asyncHandler)(async (req, res) => {
    await db.connect();
    const query = `
      SELECT 
        ra.id,
        ra.employee_id,
        ra.project_id,
        e.first_name || ' ' || e.last_name as employee_name,
        p.name as project_name,
        ra.planned_allocation_percentage,
        ra.actual_allocation_percentage,
        ra.start_date,
        ra.end_date,
        ra.status,
        ra.notes,
        ra.created_at,
        ra.updated_at
      FROM resource_assignments ra
      JOIN employees e ON ra.employee_id = e.id
      JOIN projects p ON ra.project_id = p.id
      ORDER BY ra.created_at DESC
      LIMIT 50
    `;
    try {
        const result = await db.query(query);
        const allocations = result.rows.map(row => ({
            id: row.id,
            employeeId: row.employee_id,
            employeeName: row.employee_name,
            projectId: row.project_id,
            projectName: row.project_name,
            allocationPercentage: parseFloat(row.planned_allocation_percentage),
            actualPercentage: row.actual_allocation_percentage ? parseFloat(row.actual_allocation_percentage) : null,
            allocatedHours: Math.round((parseFloat(row.planned_allocation_percentage) / 100) * 40),
            startDate: row.start_date,
            endDate: row.end_date,
            status: row.status,
            notes: row.notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
        res.json({
            success: true,
            message: 'Allocations retrieved successfully',
            data: allocations,
            total: allocations.length
        });
    }
    catch (error) {
        console.error('Direct allocation retrieval error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during allocation retrieval',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}));
exports.default = router;
