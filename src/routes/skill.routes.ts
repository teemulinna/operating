import express from 'express';
import { SkillController } from '../controllers/skill.controller';
import { validateIdParam } from '../middleware/validate.middleware';
import { requireRole } from '../middleware/auth.middleware';

const router = express.Router();
const skillController = new SkillController();

// GET /api/skills - Get all skills with optional filters
router.get(
  '/',
  skillController.getSkills
);

// POST /api/skills - Create a new skill
router.post(
  '/',
  skillController.createSkill
);

// GET /api/skills/popular - Get popular skills
router.get(
  '/popular',
  skillController.getPopularSkills
);

// GET /api/skills/analytics - Get skill analytics
router.get(
  '/analytics',
  skillController.getSkillAnalytics
);

// GET /api/skills/:id - Get skill by ID
router.get(
  '/:id',
  validateIdParam,
  skillController.getSkillById
);

// PUT /api/skills/:id - Update skill
router.put(
  '/:id',
  validateIdParam,
  skillController.updateSkill
);

// DELETE /api/skills/:id - Delete skill
router.delete(
  '/:id',
  validateIdParam,
  skillController.deleteSkill
);

// GET /api/skills/:id/employees - Get employees with specific skill
router.get(
  '/:id/employees',
  validateIdParam,
  skillController.getEmployeesBySkill
);

// GET /api/skills/recommendations/:employeeId - Get skill recommendations
router.get(
  '/recommendations/:employeeId',
  validateIdParam,
  skillController.getSkillRecommendations
);

export { router as skillRoutes };