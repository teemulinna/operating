import express from 'express';
import {
  searchEmployees,
  advancedSearch,
  getSearchSuggestions,
  getFacets
} from '../controllers/searchController';
import { authenticate } from '../middleware/auth';
import { validatePagination } from '../middleware/validation';
import { body } from 'express-validator';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /search/employees:
 *   get:
 *     summary: Search employees with query string
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (searches name, email, position, skills)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
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
 *       - in: query
 *         name: position
 *         schema:
 *           type: string
 *         description: Filter by position (partial match)
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *         description: Filter by skills (comma-separated)
 *       - in: query
 *         name: salaryMin
 *         schema:
 *           type: number
 *       - in: query
 *         name: salaryMax
 *         schema:
 *           type: number
 *       - in: query
 *         name: hireDateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: hireDateTo
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, salary, hireDate, position]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/employees', validatePagination, searchEmployees);

/**
 * @swagger
 * /search/advanced:
 *   post:
 *     summary: Advanced search with complex filters
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               department:
 *                 type: string
 *               position:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, terminated]
 *               salaryMin:
 *                 type: number
 *               salaryMax:
 *                 type: number
 *               hireDate:
 *                 type: object
 *                 properties:
 *                   from:
 *                     type: string
 *                     format: date
 *                   to:
 *                     type: string
 *                     format: date
 *     responses:
 *       200:
 *         description: Advanced search results
 */
router.post('/advanced', 
  validatePagination,
  [
    body('department').optional().isString(),
    body('position').optional().isString(),
    body('skills').optional().isArray(),
    body('status').optional().isIn(['active', 'inactive', 'terminated']),
    body('salaryMin').optional().isNumeric(),
    body('salaryMax').optional().isNumeric(),
    body('hireDate.from').optional().isISO8601(),
    body('hireDate.to').optional().isISO8601()
  ],
  advancedSearch
);

/**
 * @swagger
 * /search/suggestions:
 *   get:
 *     summary: Get search suggestions for autocomplete
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [skills, positions, employees]
 *         description: Type of suggestions to retrieve
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Partial query for suggestions
 *     responses:
 *       200:
 *         description: List of suggestions
 */
router.get('/suggestions', getSearchSuggestions);

/**
 * @swagger
 * /search/facets:
 *   get:
 *     summary: Get search facets for filtering options
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available filter options and counts
 */
router.get('/facets', getFacets);

export default router;