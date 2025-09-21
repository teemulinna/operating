"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillController = void 0;
const skill_service_1 = require("../services/skill.service");
class SkillController {
    constructor() {
        // GET /api/skills - Get all skills with optional filters
        this.getSkills = async (req, res, next) => {
            try {
                const search = req.query.search;
                const category = req.query.category;
                const skills = await this.skillService.getSkills(search, category);
                return res.status(200).json({
                    data: skills,
                    count: skills.length
                });
            }
            catch (error) {
                next(error);
            }
        };
        // POST /api/skills - Create a new skill
        this.createSkill = async (req, res, next) => {
            try {
                const skillData = req.body;
                const newSkill = await this.skillService.createSkill(skillData);
                return res.status(201).json(newSkill);
            }
            catch (error) {
                next(error);
            }
        };
        // GET /api/skills/:id - Get skill by ID
        this.getSkillById = async (req, res, next) => {
            try {
                const id = req.params.id;
                const skill = await this.skillService.getSkillById(id);
                if (!skill) {
                    return res.status(404).json({ error: 'Skill not found' });
                }
                return res.status(200).json(skill);
            }
            catch (error) {
                next(error);
            }
        };
        // PUT /api/skills/:id - Update skill
        this.updateSkill = async (req, res, next) => {
            try {
                const id = req.params.id;
                const updateData = req.body;
                const updatedSkill = await this.skillService.updateSkill(id, updateData);
                return res.status(200).json(updatedSkill);
            }
            catch (error) {
                next(error);
            }
        };
        // DELETE /api/skills/:id - Delete skill
        this.deleteSkill = async (req, res, next) => {
            try {
                const id = req.params.id;
                const deletedSkill = await this.skillService.deleteSkill(id);
                return res.status(200).json({
                    message: 'Skill deleted successfully',
                    skill: deletedSkill
                });
            }
            catch (error) {
                next(error);
            }
        };
        // GET /api/skills/popular - Get skills sorted by usage count
        this.getPopularSkills = async (req, res, next) => {
            try {
                const limit = req.query.limit ? parseInt(req.query.limit) : 20;
                const popularSkills = await this.skillService.getPopularSkills(limit);
                return res.status(200).json({
                    data: popularSkills,
                    count: popularSkills.length
                });
            }
            catch (error) {
                next(error);
            }
        };
        // GET /api/skills/analytics - Get skill analytics
        this.getSkillAnalytics = async (_req, res, next) => {
            try {
                const analytics = await this.skillService.getSkillAnalytics();
                return res.status(200).json(analytics);
            }
            catch (error) {
                next(error);
            }
        };
        // GET /api/skills/:id/employees - Get employees with specific skill
        this.getEmployeesBySkill = async (req, res, next) => {
            try {
                const skillId = req.params.id;
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const result = await this.skillService.getEmployeesBySkill(skillId, page, limit);
                return res.status(200).json(result);
            }
            catch (error) {
                next(error);
            }
        };
        // GET /api/skills/recommendations/:employeeId - Get skill recommendations for employee
        this.getSkillRecommendations = async (req, res, next) => {
            try {
                const employeeId = req.params.employeeId;
                const limit = parseInt(req.query.limit) || 5;
                const recommendations = await this.skillService.getSkillRecommendations(employeeId, limit);
                return res.status(200).json({
                    data: recommendations,
                    count: recommendations.length
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.skillService = new skill_service_1.SkillService();
    }
}
exports.SkillController = SkillController;
