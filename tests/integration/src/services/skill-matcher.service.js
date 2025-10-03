"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillMatcherService = void 0;
const database_service_1 = require("../database/database.service");
const database_factory_1 = require("../database/database-factory");
const api_error_1 = require("../utils/api-error");
class SkillMatcherService {
    constructor(db) {
        this.db = db || database_service_1.DatabaseService.getInstance();
    }
    static async create() {
        const db = await database_factory_1.DatabaseFactory.getDatabaseService();
        return new SkillMatcherService(db);
    }
    /**
     * Find best resource matches based on skill requirements
     */
    async findResourceMatches(criteria, filters = {}) {
        try {
            // Get potential candidates with their skills
            const candidates = await this.getCandidatesWithSkills(filters);
            // Calculate match scores for each candidate
            const matches = [];
            for (const candidate of candidates) {
                const match = await this.calculateSkillMatch(candidate, criteria, filters);
                // Apply minimum match score filter
                if (match.overallMatchScore >= (filters.minimumMatchScore || 0)) {
                    matches.push(match);
                }
            }
            // Sort by match score (descending)
            matches.sort((a, b) => b.overallMatchScore - a.overallMatchScore);
            // Limit results
            const maxResults = filters.maxResults || 20;
            return matches.slice(0, maxResults);
        }
        catch (error) {
            console.error('Error finding resource matches:', error);
            throw new api_error_1.ApiError(500, 'Failed to find resource matches');
        }
    }
    /**
     * Calculate detailed skill match for a single employee
     */
    async calculateSkillMatch(candidate, criteria, filters) {
        const skillMatches = [];
        let totalWeightedScore = 0;
        let totalWeight = 0;
        let requiredSkillsMet = 0;
        let requiredSkillsCount = 0;
        // Create skill lookup for employee
        const employeeSkillsMap = new Map(candidate.skills?.map((es) => [
            es.skill_id || es.skillId,
            {
                proficiencyLevel: parseInt(String(es.proficiency_level || es.proficiencyLevel)),
                yearsOfExperience: parseFloat(String(es.years_of_experience || es.yearsOfExperience || 0)),
                lastUsed: es.last_used || es.lastUsed
            }
        ]) || []);
        // Analyze each required skill
        for (const requiredSkill of criteria.requiredSkills) {
            const employeeSkill = employeeSkillsMap.get(requiredSkill.skillId);
            const hasSkill = !!employeeSkill;
            const employeeProficiency = employeeSkill?.proficiencyLevel || null;
            let proficiencyGap = 0;
            let matchScore = 0;
            if (hasSkill && employeeProficiency) {
                proficiencyGap = employeeProficiency - requiredSkill.minimumProficiency;
                // Calculate match score for this skill
                if (proficiencyGap >= 0) {
                    // Meets or exceeds requirement
                    matchScore = 100;
                    // Bonus for exceeding requirements (up to 20 points)
                    if (proficiencyGap > 0) {
                        matchScore = Math.min(100, 80 + (proficiencyGap * 10));
                    }
                }
                else {
                    // Below requirement
                    const gapPenalty = Math.abs(proficiencyGap) * 25;
                    matchScore = Math.max(0, 60 - gapPenalty);
                }
            }
            else {
                // No skill
                proficiencyGap = requiredSkill.minimumProficiency;
                matchScore = requiredSkill.isRequired ? 0 : 20; // Some points for learning potential
            }
            // Track required skills compliance
            if (requiredSkill.isRequired) {
                requiredSkillsCount++;
                if (hasSkill && proficiencyGap >= 0) {
                    requiredSkillsMet++;
                }
            }
            skillMatches.push({
                skillId: requiredSkill.skillId,
                skillName: requiredSkill.skillName,
                category: requiredSkill.category,
                required: requiredSkill.isRequired,
                weight: requiredSkill.weight,
                hasSkill,
                employeeProficiency,
                requiredProficiency: requiredSkill.minimumProficiency,
                proficiencyGap,
                matchScore,
                yearsOfExperience: employeeSkill?.yearsOfExperience,
                lastUsed: employeeSkill?.lastUsed
            });
            // Add to weighted score
            totalWeightedScore += matchScore * requiredSkill.weight;
            totalWeight += requiredSkill.weight;
        }
        // Calculate overall match score
        const baseScore = totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0;
        // Apply required skills penalty
        let requiredSkillsMultiplier = 1;
        if (requiredSkillsCount > 0) {
            requiredSkillsMultiplier = requiredSkillsMet / requiredSkillsCount;
        }
        // Calculate availability score
        const availabilityScore = await this.calculateAvailabilityScore(candidate.id, criteria.availabilityHours, criteria.startDate, criteria.endDate);
        // Calculate team fit score
        const teamFitScore = await this.calculateTeamFitScore(candidate.id, criteria.projectId);
        // Final overall score with weights
        const overallMatchScore = Math.round((baseScore * 0.6 + availabilityScore * 0.2 + teamFitScore * 0.2) *
            requiredSkillsMultiplier);
        // Identify strength and gap areas
        const strengthAreas = skillMatches
            .filter(sm => sm.proficiencyGap > 0)
            .map(sm => sm.skillName);
        const gapAreas = skillMatches
            .filter(sm => !sm.hasSkill || sm.proficiencyGap < 0)
            .map(sm => sm.skillName);
        // Determine recommendation level
        let overallRecommendation = 'poor';
        if (overallMatchScore >= 85)
            overallRecommendation = 'excellent';
        else if (overallMatchScore >= 70)
            overallRecommendation = 'good';
        else if (overallMatchScore >= 50)
            overallRecommendation = 'fair';
        // Generate reasoning notes
        const reasoningNotes = this.generateReasoningNotes(skillMatches, availabilityScore, teamFitScore, requiredSkillsMet, requiredSkillsCount);
        return {
            employeeId: candidate.id,
            employee: {
                id: candidate.id,
                firstName: candidate.first_name || candidate.firstName,
                lastName: candidate.last_name || candidate.lastName,
                email: candidate.email,
                position: candidate.position,
                departmentId: candidate.department_id || candidate.departmentId,
                departmentName: candidate.department_name
            },
            overallMatchScore,
            skillMatches,
            strengthAreas,
            gapAreas,
            availabilityScore,
            teamFitScore,
            overallRecommendation,
            reasoningNotes
        };
    }
    /**
     * Calculate availability score based on current allocations
     */
    async calculateAvailabilityScore(employeeId, requiredHours, startDate, endDate) {
        try {
            if (!requiredHours || !startDate || !endDate) {
                return 100; // No availability constraints specified
            }
            // Get current allocations for the time period
            const query = `
        SELECT 
          COALESCE(SUM(allocated_hours), 0) as total_allocated
        FROM resource_allocations 
        WHERE employee_id = $1 
        AND is_active = true
        AND (
          (start_date <= $2 AND end_date >= $2) OR
          (start_date <= $3 AND end_date >= $3) OR
          (start_date >= $2 AND end_date <= $3)
        )
      `;
            const result = await this.db.query(query, [employeeId, startDate, endDate]);
            const currentAllocated = parseFloat(result.rows[0].total_allocated || 0);
            // Assume 40 hours per week as full capacity
            const weeksInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
            const totalCapacity = weeksInPeriod * 40;
            const availableHours = totalCapacity - currentAllocated;
            if (availableHours >= requiredHours) {
                return 100;
            }
            else if (availableHours > 0) {
                return Math.round((availableHours / requiredHours) * 100);
            }
            else {
                return 0;
            }
        }
        catch (error) {
            console.error('Error calculating availability score:', error);
            return 50; // Default middle score on error
        }
    }
    /**
     * Calculate team fit score based on past collaborations
     */
    async calculateTeamFitScore(employeeId, projectId) {
        try {
            // This is a simplified version - in a real system you might analyze:
            // - Past project success rates with similar teams
            // - Performance ratings on collaborative projects
            // - Feedback scores from team members
            // - Communication style compatibility
            if (!projectId) {
                return 75; // Default neutral score
            }
            // Check if employee has worked on similar projects
            const query = `
        SELECT COUNT(*) as similar_projects
        FROM resource_allocations ra
        JOIN projects p ON ra.project_id = p.id
        WHERE ra.employee_id = $1
        AND p.status = 'completed'
        AND ra.actual_hours > 0
      `;
            const result = await this.db.query(query, [employeeId]);
            const similarProjects = parseInt(result.rows[0].similar_projects || 0);
            // Higher score for more collaborative experience
            if (similarProjects >= 5)
                return 90;
            if (similarProjects >= 3)
                return 80;
            if (similarProjects >= 1)
                return 70;
            return 60; // New employee or limited project history
        }
        catch (error) {
            console.error('Error calculating team fit score:', error);
            return 75; // Default score on error
        }
    }
    /**
     * Get candidate employees with their skills
     */
    async getCandidatesWithSkills(filters) {
        let whereConditions = ['e.is_active = true'];
        const values = [];
        if (filters.departmentIds && filters.departmentIds.length > 0) {
            values.push(filters.departmentIds);
            whereConditions.push(`e.department_id = ANY($${values.length})`);
        }
        if (filters.excludeEmployeeIds && filters.excludeEmployeeIds.length > 0) {
            values.push(filters.excludeEmployeeIds);
            whereConditions.push(`e.id != ALL($${values.length})`);
        }
        const whereClause = whereConditions.join(' AND ');
        const query = `
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.email,
        e.position,
        e.department_id,
        d.name as department_name,
        COALESCE(
          json_agg(
            CASE WHEN es.id IS NOT NULL THEN
              json_build_object(
                'skill_id', es.skill_id,
                'proficiency_level', es.proficiency_level,
                'years_of_experience', es.years_of_experience,
                'last_used', es.last_used,
                'skill_name', s.name,
                'skill_category', s.category
              )
            ELSE NULL END
          ) FILTER (WHERE es.id IS NOT NULL),
          '[]'::json
        ) as skills
      FROM employees e
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN employee_skills es ON e.id = es.employee_id AND es.is_active = true
      LEFT JOIN skills s ON es.skill_id = s.id AND s.is_active = true
      WHERE ${whereClause}
      GROUP BY e.id, d.name
      ORDER BY e.last_name, e.first_name
    `;
        const result = await this.db.query(query, values);
        return result.rows;
    }
    /**
     * Generate reasoning notes for the match
     */
    generateReasoningNotes(skillMatches, availabilityScore, teamFitScore, requiredSkillsMet, requiredSkillsCount) {
        const notes = [];
        // Required skills analysis
        if (requiredSkillsCount > 0) {
            const requiredPercentage = Math.round((requiredSkillsMet / requiredSkillsCount) * 100);
            if (requiredPercentage === 100) {
                notes.push(`✓ Meets all ${requiredSkillsCount} required skills`);
            }
            else {
                notes.push(`⚠ Meets ${requiredSkillsMet} of ${requiredSkillsCount} required skills (${requiredPercentage}%)`);
            }
        }
        // Strength areas
        const strengths = skillMatches.filter(sm => sm.proficiencyGap > 0);
        if (strengths.length > 0) {
            notes.push(`💪 Strong in: ${strengths.slice(0, 3).map(s => s.skillName).join(', ')}`);
        }
        // Gap areas
        const gaps = skillMatches.filter(sm => !sm.hasSkill || sm.proficiencyGap < 0);
        if (gaps.length > 0) {
            const criticalGaps = gaps.filter(g => g.required);
            if (criticalGaps.length > 0) {
                notes.push(`❌ Missing critical skills: ${criticalGaps.map(g => g.skillName).join(', ')}`);
            }
            else {
                notes.push(`📚 Development areas: ${gaps.slice(0, 2).map(g => g.skillName).join(', ')}`);
            }
        }
        // Availability analysis
        if (availabilityScore >= 90) {
            notes.push('✓ High availability for the project timeline');
        }
        else if (availabilityScore >= 70) {
            notes.push('⚠ Moderate availability - may need scheduling coordination');
        }
        else if (availabilityScore < 50) {
            notes.push('❌ Limited availability - significant scheduling challenges');
        }
        // Team fit analysis
        if (teamFitScore >= 85) {
            notes.push('✓ Excellent team collaboration history');
        }
        else if (teamFitScore >= 70) {
            notes.push('✓ Good team fit based on past projects');
        }
        else if (teamFitScore < 60) {
            notes.push('⚠ Limited collaborative project experience');
        }
        return notes;
    }
    /**
     * Get skill match statistics for reporting
     */
    async getMatchStatistics(criteria) {
        const matches = await this.findResourceMatches(criteria, { maxResults: 1000 });
        const totalCandidates = matches.length;
        const candidatesWithAnySkill = matches.filter(m => m.skillMatches.some(sm => sm.hasSkill)).length;
        const candidatesWithAllRequiredSkills = matches.filter(m => m.skillMatches.filter(sm => sm.required).every(sm => sm.hasSkill && sm.proficiencyGap >= 0)).length;
        const averageMatchScore = totalCandidates > 0
            ? Math.round(matches.reduce((sum, m) => sum + m.overallMatchScore, 0) / totalCandidates)
            : 0;
        // Calculate skill gaps
        const topSkillGaps = criteria.requiredSkills.map(rs => {
            const candidatesWithSkill = matches.filter(m => m.skillMatches.find(sm => sm.skillId === rs.skillId && sm.hasSkill && sm.proficiencyGap >= 0)).length;
            return {
                skillName: rs.skillName,
                requiredCount: 1, // For this analysis, assuming need 1 person per skill
                availableCount: candidatesWithSkill,
                gap: Math.max(0, 1 - candidatesWithSkill)
            };
        }).sort((a, b) => b.gap - a.gap);
        return {
            totalCandidates,
            candidatesWithAnySkill,
            candidatesWithAllRequiredSkills,
            topSkillGaps,
            averageMatchScore
        };
    }
}
exports.SkillMatcherService = SkillMatcherService;
