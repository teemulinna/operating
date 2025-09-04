import express from 'express';
import multer from 'multer';
import {
  importEmployees,
  exportEmployees,
  bulkUpdateEmployees,
  bulkDeleteEmployees,
  getBulkTemplate
} from '../controllers/bulkController';
import { authenticate, authorize } from '../middleware/auth';
import * as validator from 'express-validator';
const { body } = validator;
import { handleValidationErrors } from '../middleware/validation';

const router = express.Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /bulk/template:
 *   get:
 *     summary: Download CSV template for bulk import
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV template file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/template', getBulkTemplate);

/**
 * @swagger
 * /bulk/import:
 *   post:
 *     summary: Import employees from CSV file
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file containing employee data
 *     responses:
 *       200:
 *         description: Import completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       207:
 *         description: Import completed with some errors
 *       400:
 *         description: Invalid file or format
 */
router.post('/import', 
  authorize('admin', 'hr'),
  upload.single('file'),
  importEmployees
);

/**
 * @swagger
 * /bulk/export:
 *   get:
 *     summary: Export employees to CSV file
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv]
 *           default: csv
 *         description: Export format
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, terminated]
 *         description: Filter by employee status
 *     responses:
 *       200:
 *         description: CSV export file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/export', exportEmployees);

/**
 * @swagger
 * /bulk/update:
 *   put:
 *     summary: Bulk update multiple employees
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeIds
 *               - updates
 *             properties:
 *               employeeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of employee IDs to update
 *               updates:
 *                 type: object
 *                 description: Fields to update for all specified employees
 *                 properties:
 *                   status:
 *                     type: string
 *                     enum: [active, inactive, terminated]
 *                   departmentId:
 *                     type: string
 *                   managerId:
 *                     type: string
 *                   salary:
 *                     type: number
 *     responses:
 *       200:
 *         description: Bulk update completed successfully
 *       207:
 *         description: Bulk update completed with some errors
 */
router.put('/update',
  authorize('admin', 'hr'),
  [
    body('employeeIds')
      .isArray({ min: 1 })
      .withMessage('Employee IDs must be a non-empty array'),
    body('updates')
      .isObject()
      .withMessage('Updates must be an object'),
    handleValidationErrors
  ],
  bulkUpdateEmployees
);

/**
 * @swagger
 * /bulk/delete:
 *   delete:
 *     summary: Bulk delete multiple employees
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeIds
 *             properties:
 *               employeeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of employee IDs to delete
 *     responses:
 *       200:
 *         description: Bulk deletion completed successfully
 *       207:
 *         description: Bulk deletion completed with some errors
 */
router.delete('/delete',
  authorize('admin', 'hr'),
  [
    body('employeeIds')
      .isArray({ min: 1 })
      .withMessage('Employee IDs must be a non-empty array'),
    handleValidationErrors
  ],
  bulkDeleteEmployees
);

export default router;