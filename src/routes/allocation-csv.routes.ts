import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { AllocationService } from '../services/allocation.service';
import { asyncHandler } from '../middleware/async-handler';

const router = Router();

// Helper function to check validation results
const checkValidationErrors = (req: Request, res: Response): Response | null => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  return null;
};

// GET /api/allocations/export/csv - Export allocations to CSV
router.get('/csv',
  query('startDate').optional().isISO8601().toDate(),
  query('endDate').optional().isISO8601().toDate(),
  query('employeeId').optional().isString(),
  query('projectId').optional().isString(),
  query('includeEnhancedFields').optional().isBoolean().toBoolean(),
  query('includeSummary').optional().isBoolean().toBoolean(),
  asyncHandler(async (req: Request, res: Response): Promise<Response | void> => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    // Build export options with filters
    const options = {
      employeeId: req.query.employeeId as string,
      projectId: req.query.projectId as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      includeEnhancedFields: req.query.includeEnhancedFields === 'true',
      includeSummary: req.query.includeSummary === 'true'
    };


    try {
      const csvData = await AllocationService.exportAllocationsToCSV(options);
      
      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `resource-allocations-${currentDate}.csv`;
      
      // Set appropriate headers for CSV download
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');
      
      return res.send(csvData);
    } catch (error: any) {
      if (error.message.includes('Invalid date range')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date range',
          error: error.message
        });
      }
      throw error;
    }
  })
);

export default router;