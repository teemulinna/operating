import { Router, Request, Response } from 'express';
import { AllocationService } from '../services/allocation.service';
import { OverAllocationWarningService } from '../services/over-allocation-warning.service';
import { body, query, validationResult } from 'express-validator';

const router = Router();

/**
 * @swagger
 * /api/over-allocation-warnings/schedule:
 *   get:
 *     summary: Get over-allocation warnings for schedule view
 *     tags: [Over-allocation Warnings]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Start date for the schedule view
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: End date for the schedule view
 *     responses:
 *       200:
 *         description: Over-allocation warnings summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasOverAllocations:
 *                   type: boolean
 *                 totalWarnings:
 *                   type: number
 *                 totalCritical:
 *                   type: number
 *                 warnings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OverAllocationWarning'
 *       400:
 *         description: Invalid date parameters
 *       500:
 *         description: Internal server error
 */
router.get(
  '/schedule',
  [
    query('startDate').isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate').isISO8601().withMessage('End date must be a valid ISO 8601 date')
  ],
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { startDate, endDate } = req.query;
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (start >= end) {
        return res.status(400).json({
          message: 'Start date must be before end date'
        });
      }

      const summary = await AllocationService.getOverAllocationSummary(start, end);

      return res.json(summary);
    } catch (error) {
      console.error('Error fetching over-allocation warnings:', error);
      return res.status(500).json({
        message: 'Failed to fetch over-allocation warnings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/over-allocation-warnings/employee/{employeeId}:
 *   get:
 *     summary: Get over-allocation warnings for a specific employee
 *     tags: [Over-allocation Warnings]
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         schema:
 *           type: string
 *         required: true
 *         description: Employee ID
 *       - in: query
 *         name: weekStartDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Week start date
 *       - in: query
 *         name: weekEndDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Week end date
 *     responses:
 *       200:
 *         description: Over-allocation warning for the employee
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/OverAllocationWarning'
 *                 - type: null
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Internal server error
 */
router.get(
  '/employee/:employeeId',
  [
    query('weekStartDate').isISO8601().withMessage('Week start date must be a valid ISO 8601 date'),
    query('weekEndDate').isISO8601().withMessage('Week end date must be a valid ISO 8601 date')
  ],
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { employeeId } = req.params;
      const { weekStartDate, weekEndDate } = req.query;

      const weekStart = new Date(weekStartDate as string);
      const weekEnd = new Date(weekEndDate as string);

      const warning = await OverAllocationWarningService.checkWeeklyOverAllocation(
        employeeId,
        weekStart,
        weekEnd
      );

      return res.json(warning);
    } catch (error) {
      console.error('Error checking employee over-allocation:', error);
      
      if (error instanceof Error && error.message.includes('Employee not found')) {
        return res.status(404).json({
          message: 'Employee not found'
        });
      }

      return res.status(500).json({
        message: 'Failed to check employee over-allocation',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/over-allocation-warnings/validate:
 *   post:
 *     summary: Validate allocation for potential over-allocation
 *     tags: [Over-allocation Warnings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - projectId
 *               - allocatedHours
 *               - startDate
 *               - endDate
 *             properties:
 *               employeeId:
 *                 type: string
 *               projectId:
 *                 type: string
 *               allocatedHours:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Validation result with potential warnings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/OverAllocationWarning'
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post(
  '/validate',
  [
    body('employeeId').isString().notEmpty().withMessage('Employee ID is required'),
    body('projectId').isString().notEmpty().withMessage('Project ID is required'),
    body('allocatedHours').isNumeric().withMessage('Allocated hours must be a number'),
    body('startDate').isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
    body('endDate').isISO8601().withMessage('End date must be a valid ISO 8601 date')
  ],
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { employeeId, projectId, allocatedHours, startDate, endDate } = req.body;

      const warnings = await AllocationService.checkOverAllocationWarnings(
        employeeId,
        new Date(startDate),
        new Date(endDate),
        allocatedHours
      );

      return res.json(warnings);
    } catch (error) {
      console.error('Error validating allocation:', error);
      return res.status(500).json({
        message: 'Failed to validate allocation',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;