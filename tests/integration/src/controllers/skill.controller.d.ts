export const __esModule: boolean;
export class SkillController {
    getSkills: (req: any, res: any, next: any) => Promise<any>;
    createSkill: (req: any, res: any, next: any) => Promise<any>;
    getSkillById: (req: any, res: any, next: any) => Promise<any>;
    updateSkill: (req: any, res: any, next: any) => Promise<any>;
    deleteSkill: (req: any, res: any, next: any) => Promise<any>;
    getPopularSkills: (req: any, res: any, next: any) => Promise<any>;
    getSkillAnalytics: (_req: any, res: any, next: any) => Promise<any>;
    getEmployeesBySkill: (req: any, res: any, next: any) => Promise<any>;
    getSkillRecommendations: (req: any, res: any, next: any) => Promise<any>;
    skillService: skill_service_1.SkillService;
}
import skill_service_1 = require("../services/skill.service");
//# sourceMappingURL=skill.controller.d.ts.map