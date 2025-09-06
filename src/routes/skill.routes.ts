import express from 'express';
import { SkillController } from '../controllers/skill.controller';
import { validateIdParam } from '../middleware/validate.middleware';
import { requireRole } from '../middleware/auth.middleware';

const router = express.Router();
const skillController = new SkillController();

// GET /api/skills - Get all unique skills
router.get(
  '/',
  skillController.getSkills
);

// GET /api/skills/popular - Get popular skills
router.get(
  '/popular',
  skillController.getPopularSkills
);

// GET /api/skills/analytics - Get skill analytics
router.get(
  '/analytics',
  requireRole(['admin', 'hr']),
  skillController.getSkillAnalytics
);

// GET /api/skills/:skill/employees - Get employees with specific skill
router.get(
  '/:skill/employees',
  skillController.getEmployeesBySkill
);

// GET /api/skills/recommendations/:employeeId - Get skill recommendations
router.get(
  '/recommendations/:employeeId',
  validateIdParam,
  skillController.getSkillRecommendations
);

export { router as skillRoutes };