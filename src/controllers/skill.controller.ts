import { Request, Response, NextFunction } from 'express';
import { SkillService } from '../services/skill.service';
import { CreateSkillInput, UpdateSkillInput, SkillCategory } from '../types';
import { ApiError } from '../utils/api-error';

export class SkillController {
  private skillService: SkillService;

  constructor() {
    this.skillService = new SkillService();
  }

  // GET /api/skills - Get all skills with optional filters
  getSkills = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const search = req.query.search as string | undefined;
      const category = req.query.category as SkillCategory | undefined;
      
      const skills = await this.skillService.getSkills(search, category);
      
      return res.status(200).json({
        data: skills,
        count: skills.length
      });
    } catch (error: any) {
      next(error);
    }
  };

  // POST /api/skills - Create a new skill
  createSkill = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const skillData: CreateSkillInput = req.body;
      
      const newSkill = await this.skillService.createSkill(skillData);
      
      return res.status(201).json(newSkill);
    } catch (error: any) {
      next(error);
    }
  };

  // GET /api/skills/:id - Get skill by ID
  getSkillById = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const id = req.params.id;

      const skill = await this.skillService.getSkillById(id);

      if (!skill) {
        return res.status(404).json({ error: 'Skill not found' });
      }

      return res.status(200).json(skill);
    } catch (error: any) {
      next(error);
    }
  };

  // PUT /api/skills/:id - Update skill
  updateSkill = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const id = req.params.id;
      const updateData: UpdateSkillInput = req.body;
      
      const updatedSkill = await this.skillService.updateSkill(id, updateData);
      
      return res.status(200).json(updatedSkill);
    } catch (error: any) {
      next(error);
    }
  };

  // DELETE /api/skills/:id - Delete skill
  deleteSkill = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const id = req.params.id;
      
      const deletedSkill = await this.skillService.deleteSkill(id);
      
      return res.status(200).json({
        message: 'Skill deleted successfully',
        skill: deletedSkill
      });
    } catch (error: any) {
      next(error);
    }
  };

  // GET /api/skills/popular - Get skills sorted by usage count
  getPopularSkills = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      const popularSkills = await this.skillService.getPopularSkills(limit);
      
      return res.status(200).json({
        data: popularSkills,
        count: popularSkills.length
      });
    } catch (error: any) {
      next(error);
    }
  };

  // GET /api/skills/analytics - Get skill analytics
  getSkillAnalytics = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const analytics = await this.skillService.getSkillAnalytics();
      
      return res.status(200).json(analytics);
    } catch (error: any) {
      next(error);
    }
  };

  // GET /api/skills/:id/employees - Get employees with specific skill
  getEmployeesBySkill = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const skillId = req.params.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const result = await this.skillService.getEmployeesBySkill(skillId, page, limit);
      
      return res.status(200).json(result);
    } catch (error: any) {
      next(error);
    }
  };

  // GET /api/skills/recommendations/:employeeId - Get skill recommendations for employee
  getSkillRecommendations = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const employeeId = req.params.employeeId;
      const limit = parseInt(req.query.limit as string) || 5;
      
      const recommendations = await this.skillService.getSkillRecommendations(employeeId, limit);
      
      return res.status(200).json({
        data: recommendations,
        count: recommendations.length
      });
    } catch (error: any) {
      next(error);
    }
  };
}