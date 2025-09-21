"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.skillRoutes = void 0;
const express_1 = __importDefault(require("express"));
const skill_controller_1 = require("../controllers/skill.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const router = express_1.default.Router();
exports.skillRoutes = router;
const skillController = new skill_controller_1.SkillController();
// GET /api/skills - Get all skills with optional filters
router.get('/', skillController.getSkills);
// POST /api/skills - Create a new skill
router.post('/', skillController.createSkill);
// GET /api/skills/popular - Get popular skills
router.get('/popular', skillController.getPopularSkills);
// GET /api/skills/analytics - Get skill analytics
router.get('/analytics', skillController.getSkillAnalytics);
// GET /api/skills/:id - Get skill by ID
router.get('/:id', validate_middleware_1.validateIdParam, skillController.getSkillById);
// PUT /api/skills/:id - Update skill
router.put('/:id', validate_middleware_1.validateIdParam, skillController.updateSkill);
// DELETE /api/skills/:id - Delete skill
router.delete('/:id', validate_middleware_1.validateIdParam, skillController.deleteSkill);
// GET /api/skills/:id/employees - Get employees with specific skill
router.get('/:id/employees', validate_middleware_1.validateIdParam, skillController.getEmployeesBySkill);
// GET /api/skills/recommendations/:employeeId - Get skill recommendations
router.get('/recommendations/:employeeId', validate_middleware_1.validateIdParam, skillController.getSkillRecommendations);
