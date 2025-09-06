import { Request, Response, NextFunction } from 'express';
import { SkillService } from '../services/skill.service';

export class SkillController {
  private skillService: SkillService;

  constructor() {
    this.skillService = new SkillService();
  }

  // GET /api/skills - Get all unique skills
  getSkills = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const search = req.query.search as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      const skills = await this.skillService.getSkills(search, limit);
      
      res.status(200).json(skills);
    } catch (error) {
      next(error);
    }
  };

  // GET /api/skills/popular - Get skills sorted by usage count
  getPopularSkills = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      const popularSkills = await this.skillService.getPopularSkills(limit);
      
      res.status(200).json(popularSkills);
    } catch (error) {
      next(error);
    }
  };

  // GET /api/skills/analytics - Get skill analytics
  getSkillAnalytics = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const analytics = await this.skillService.getSkillAnalytics();
      
      res.status(200).json(analytics);
    } catch (error) {
      next(error);
    }
  };

  // GET /api/skills/:skill/employees - Get employees with specific skill
  getEmployeesBySkill = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const skill = decodeURIComponent(req.params.skill!);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const result = await this.skillService.getEmployeesBySkill(skill, page, limit);
      
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // GET /api/skills/recommendations/:employeeId - Get skill recommendations for employee
  getSkillRecommendations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const employeeId = parseInt(req.params.employeeId!);
      const limit = parseInt(req.query.limit as string) || 5;
      
      const recommendations = await this.skillService.getSkillRecommendations(employeeId, limit);
      
      res.status(200).json(recommendations);
    } catch (error) {
      next(error);
    }
  };
}