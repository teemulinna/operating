import { Request, Response, NextFunction } from 'express';
export declare class SkillController {
    private skillService;
    constructor();
    getSkills: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    createSkill: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getSkillById: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    updateSkill: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    deleteSkill: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getPopularSkills: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getSkillAnalytics: (_req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getEmployeesBySkill: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getSkillRecommendations: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
//# sourceMappingURL=skill.controller.d.ts.map