import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { ExportController } from '../controllers/exportController';
import { validateRequest } from '../middleware/validate.middleware';

const router = Router();

// Validation rules
const csvExportValidation = [
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  body('filters.status')
    .optional()
    .isIn(['available', 'busy', 'unavailable', 'all'])
    .withMessage('Status filter must be one of: available, busy, unavailable, all'),
  body('filters.departmentId')
    .optional()
    .isUUID()
    .withMessage('Department ID filter must be a valid UUID'),
  body('filters.search')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search filter must be a string with max 100 characters'),
  body('fields')
    .optional()
    .isArray()
    .withMessage('Fields must be an array')
    .custom((fields) => {
      const validFields = [
        'firstName', 'lastName', 'email', 'position', 'departmentName', 
        'status', 'capacity', 'currentProjects', 'availableHours',
        'hireDate', 'createdAt', 'updatedAt'
      ];
      const invalidFields = fields.filter((field: string) => !validFields.includes(field));
      if (invalidFields.length > 0) {
        throw new Error(`Invalid fields: ${invalidFields.join(', ')}`);
      }
      return true;
    }),
];

const excelExportValidation = [
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  body('includeCharts')
    .optional()
    .isBoolean()
    .withMessage('Include charts must be a boolean'),
  body('worksheets')
    .optional()
    .isArray()
    .withMessage('Worksheets must be an array')
    .custom((worksheets) => {
      const validWorksheets = ['employees', 'summary', 'department_breakdown', 'availability_trends'];
      const invalidWorksheets = worksheets.filter((ws: string) => !validWorksheets.includes(ws));
      if (invalidWorksheets.length > 0) {
        throw new Error(`Invalid worksheets: ${invalidWorksheets.join(', ')}`);
      }
      return true;
    }),
];

const pdfReportValidation = [
  body('dateRange')
    .isObject()
    .withMessage('Date range is required'),
  body('dateRange.start')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  body('dateRange.end')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  body('includeDepartments')
    .optional()
    .isArray()
    .withMessage('Include departments must be an array'),
  body('includeDepartments.*')
    .optional()
    .isUUID()
    .withMessage('Department IDs must be valid UUIDs'),
  body('reportType')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'annual'])
    .withMessage('Report type must be one of: daily, weekly, monthly, quarterly, annual'),
  body('includeCharts')
    .optional()
    .isBoolean()
    .withMessage('Include charts must be a boolean'),
  body('includeProjections')
    .optional()
    .isBoolean()
    .withMessage('Include projections must be a boolean'),
];

const scheduleReportValidation = [
  body('reportType')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Report type is required and must be between 1-100 characters'),
  body('frequency')
    .isIn(['daily', 'weekly', 'monthly', 'quarterly'])
    .withMessage('Frequency must be one of: daily, weekly, monthly, quarterly'),
  body('format')
    .isIn(['csv', 'excel', 'pdf'])
    .withMessage('Format must be one of: csv, excel, pdf'),
  body('recipients')
    .isArray({ min: 1 })
    .withMessage('Recipients must be a non-empty array'),
  body('recipients.*')
    .isEmail()
    .withMessage('All recipients must be valid email addresses'),
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
];

const externalSyncValidation = [
  body('targetSystems')
    .isArray({ min: 1 })
    .withMessage('Target systems must be a non-empty array'),
  body('targetSystems.*')
    .isIn(['jira', 'asana', 'trello', 'monday', 'slack', 'teams'])
    .withMessage('Target systems must contain valid system names'),
  body('syncType')
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Sync type is required and must be between 1-50 characters'),
  body('data')
    .isObject()
    .withMessage('Data must be an object'),
];

const bulkUpdateValidation = [
  body('updates')
    .isArray({ min: 1 })
    .withMessage('Updates must be a non-empty array'),
  body('updates.*.employeeId')
    .isUUID()
    .withMessage('Employee ID must be a valid UUID'),
  body('updates.*.updates')
    .isObject()
    .withMessage('Updates must be an object'),
];

// Routes

/**
 * @route POST /api/export/employees/csv
 * @description Export filtered employee data as CSV
 * @access Public
 * @body {Object} [filters] - Filter criteria for employees
 * @body {Array} [fields] - Array of fields to include in export
 */
router.post(
  '/employees/csv',
  csvExportValidation,
  validateRequest,
  ExportController.exportEmployeesCSV
);

/**
 * @route POST /api/export/employees/excel
 * @description Export filtered employee data as Excel workbook
 * @access Public
 * @body {Object} [filters] - Filter criteria for employees
 * @body {boolean} [includeCharts] - Whether to include charts in the export
 * @body {Array} [worksheets] - Array of worksheets to include
 */
router.post(
  '/employees/excel',
  excelExportValidation,
  validateRequest,
  ExportController.exportEmployeesExcel
);

/**
 * @route POST /api/export/capacity-report/pdf
 * @description Generate PDF capacity planning report
 * @access Public
 * @body {Object} dateRange - Date range for the report
 * @body {Array} [includeDepartments] - Array of department UUIDs to include
 * @body {string} [reportType] - Type of report (daily, weekly, monthly, quarterly, annual)
 * @body {boolean} [includeCharts] - Whether to include charts in the report
 * @body {boolean} [includeProjections] - Whether to include capacity projections
 */
router.post(
  '/capacity-report/pdf',
  pdfReportValidation,
  validateRequest,
  ExportController.generateCapacityReportPDF
);

/**
 * @route POST /api/export/schedule
 * @description Schedule automated reports
 * @access Public
 * @body {string} reportType - Type of report to schedule
 * @body {string} frequency - How often to run the report
 * @body {string} format - Output format (csv, excel, pdf)
 * @body {Array} recipients - Array of email addresses to send reports to
 * @body {Object} [filters] - Filter criteria to apply to scheduled reports
 * @body {string} [startDate] - When to start the schedule
 */
router.post(
  '/schedule',
  scheduleReportValidation,
  validateRequest,
  ExportController.scheduleReport
);

/**
 * @route POST /api/integration/external/sync
 * @description Sync data with external project management tools
 * @access Public
 * @body {Array} targetSystems - Array of system names to sync with
 * @body {string} syncType - Type of data to sync
 * @body {Object} data - Data to sync to external systems
 */
router.post(
  '/external/sync',
  externalSyncValidation,
  validateRequest,
  ExportController.syncWithExternalTools
);

/**
 * @route PUT /api/employees/bulk-update
 * @description Bulk update employee data
 * @access Public
 * @body {Array} updates - Array of update objects with employeeId and updates
 */
router.put(
  '/bulk-update',
  bulkUpdateValidation,
  validateRequest,
  async (req: any, res: any) => {
    try {
      // This route is handled by the availability controller for capacity updates
      // but can be extended for other bulk operations
      const { updates } = req.body;
      
      // Transform updates to availability format if they contain capacity data
      const availabilityUpdates = updates.filter((update: any) => 
        update.updates.capacity !== undefined || 
        update.updates.status !== undefined ||
        update.updates.availableHours !== undefined ||
        update.updates.currentProjects !== undefined
      ).map((update: any) => ({
        employeeId: update.employeeId,
        ...update.updates
      }));

      if (availabilityUpdates.length > 0) {
        // Use the availability controller for capacity-related updates
        req.body = { updates: availabilityUpdates };
        return await require('../controllers/availabilityController').AvailabilityController.bulkUpdateAvailability(req, res);
      }

      // Handle other bulk updates here (position changes, department transfers, etc.)
      res.json({
        success: true,
        message: 'No availability updates to process',
        results: []
      });
    } catch (error: any) {
      console.error('Error in bulk update:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process bulk update',
        error: error.message
      });
    }
  }
);

export { router as exportRoutes };