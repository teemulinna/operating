import express from 'express';
import {
  getAllSkills,
  getSkillById,
  createSkill,
  updateSkill,
  deleteSkill,
  getSkillStats,
  getSkillsByCategory
} from '../controllers/skillController';
import { authenticate, authorize } from '../middleware/auth';
import { validateSkill, validateId, validatePagination } from '../middleware/validation';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /skills:
 *   get:
 *     summary: Get all skills
 *     tags: [Skills]
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
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced, expert]
 *         description: Filter by skill level
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name and description
 *     responses:
 *       200:
 *         description: List of skills
 */
router.get('/', validatePagination, getAllSkills);

/**
 * @swagger
 * /skills/stats:
 *   get:
 *     summary: Get skill statistics
 *     tags: [Skills]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Skill statistics
 */
router.get('/stats', authorize('admin', 'hr', 'manager'), getSkillStats);

/**
 * @swagger
 * /skills/category/{category}:
 *   get:
 *     summary: Get skills by category
 *     tags: [Skills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of skills in category
 */
router.get('/category/:category', getSkillsByCategory);

/**
 * @swagger
 * /skills/{id}:
 *   get:
 *     summary: Get skill by ID
 *     tags: [Skills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Skill details
 *       404:
 *         description: Skill not found
 */
router.get('/:id', validateId, getSkillById);

/**
 * @swagger
 * /skills:
 *   post:
 *     summary: Create new skill
 *     tags: [Skills]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Skill'
 *     responses:
 *       201:
 *         description: Skill created successfully
 */
router.post('/', authorize('admin', 'hr'), validateSkill, createSkill);

/**
 * @swagger
 * /skills/{id}:
 *   put:
 *     summary: Update skill
 *     tags: [Skills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Skill'
 *     responses:
 *       200:
 *         description: Skill updated successfully
 */
router.put('/:id', authorize('admin', 'hr'), validateId, validateSkill, updateSkill);

/**
 * @swagger
 * /skills/{id}:
 *   delete:
 *     summary: Delete skill
 *     tags: [Skills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Skill deleted successfully
 */
router.delete('/:id', authorize('admin', 'hr'), validateId, deleteSkill);

export default router;