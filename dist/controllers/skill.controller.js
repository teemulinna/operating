"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillController = void 0;
const skill_service_1 = require("../services/skill.service");
class SkillController {
    constructor() {
        this.getSkills = async (req, res, next) => {
            try {
                const search = req.query.search;
                const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
                const skills = await this.skillService.getSkills(search, limit);
                res.status(200).json(skills);
            }
            catch (error) {
                next(error);
            }
        };
        this.getPopularSkills = async (req, res, next) => {
            try {
                const limit = req.query.limit ? parseInt(req.query.limit) : 20;
                const popularSkills = await this.skillService.getPopularSkills(limit);
                res.status(200).json(popularSkills);
            }
            catch (error) {
                next(error);
            }
        };
        this.getSkillAnalytics = async (_req, res, next) => {
            try {
                const analytics = await this.skillService.getSkillAnalytics();
                res.status(200).json(analytics);
            }
            catch (error) {
                next(error);
            }
        };
        this.getEmployeesBySkill = async (req, res, next) => {
            try {
                const skill = decodeURIComponent(req.params.skill);
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const result = await this.skillService.getEmployeesBySkill(skill, page, limit);
                res.status(200).json(result);
            }
            catch (error) {
                next(error);
            }
        };
        this.getSkillRecommendations = async (req, res, next) => {
            try {
                const employeeId = parseInt(req.params.employeeId);
                const limit = parseInt(req.query.limit) || 5;
                const recommendations = await this.skillService.getSkillRecommendations(employeeId, limit);
                res.status(200).json(recommendations);
            }
            catch (error) {
                next(error);
            }
        };
        this.skillService = new skill_service_1.SkillService();
    }
}
exports.SkillController = SkillController;
//# sourceMappingURL=skill.controller.js.map