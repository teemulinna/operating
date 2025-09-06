import { Request, Response, NextFunction } from 'express';
export declare class SkillController {
    private skillService;
    constructor();
    getSkills: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getPopularSkills: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getSkillAnalytics: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
    getEmployeesBySkill: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getSkillRecommendations: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=skill.controller.d.ts.map