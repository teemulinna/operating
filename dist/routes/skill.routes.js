"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.skillRoutes = void 0;
const express_1 = __importDefault(require("express"));
const skill_controller_1 = require("../controllers/skill.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
exports.skillRoutes = router;
const skillController = new skill_controller_1.SkillController();
router.get('/', skillController.getSkills);
router.get('/popular', skillController.getPopularSkills);
router.get('/analytics', (0, auth_middleware_1.requireRole)(['admin', 'hr']), skillController.getSkillAnalytics);
router.get('/:skill/employees', skillController.getEmployeesBySkill);
router.get('/recommendations/:employeeId', validate_middleware_1.validateIdParam, skillController.getSkillRecommendations);
//# sourceMappingURL=skill.routes.js.map