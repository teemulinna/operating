import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/async-handler';
import { SkillMatcherService, SkillMatchCriteria, SkillMatchFilters } from '../services/skill-matcher.service';
import { ProjectService } from '../services/project.service';
import { SkillCategory, ProficiencyLevel } from '../types';

const router = Router();

// Validation helpers
const checkValidationErrors = (req: Request, res: Response): Response | null => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  return null;
};

// Validation middleware for skill matching
const validateSkillMatchRequest = [
  body('requiredSkills')
    .isArray({ min: 1 })
    .withMessage('requiredSkills must be a non-empty array'),
  body('requiredSkills.*.skillId')
    .notEmpty()
    .withMessage('skillId is required for each skill'),
  body('requiredSkills.*.skillName')
    .notEmpty()
    .withMessage('skillName is required for each skill'),
  body('requiredSkills.*.category')
    .isIn(['technical', 'soft', 'language', 'certification', 'domain'])
    .withMessage('category must be a valid skill category'),
  body('requiredSkills.*.minimumProficiency')
    .isInt({ min: 1, max: 5 })
    .withMessage('minimumProficiency must be between 1 and 5'),
  body('requiredSkills.*.weight')
    .isFloat({ min: 0, max: 10 })
    .withMessage('weight must be between 0 and 10'),
  body('requiredSkills.*.isRequired')
    .isBoolean()
    .withMessage('isRequired must be a boolean'),
  body('projectId')
    .optional()
    .isString()
    .withMessage('projectId must be a string'),
  body('roleTitle')
    .optional()
    .isString()
    .withMessage('roleTitle must be a string'),
  body('experienceLevel')
    .optional()
    .isIn(['junior', 'mid', 'senior', 'lead'])
    .withMessage('experienceLevel must be one of: junior, mid, senior, lead'),
  body('availabilityHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('availabilityHours must be a positive number'),
  body('startDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('startDate must be a valid ISO 8601 date'),
  body('endDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('endDate must be a valid ISO 8601 date')
];

/**
 * POST /api/skills/match
 * Find best matches for skill requirements
 */
router.post('/match',
  validateSkillMatchRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const skillMatcher = await SkillMatcherService.create();

    // Build skill criteria from request
    const criteria: SkillMatchCriteria = {
      requiredSkills: req.body.requiredSkills.map((skill: any) => ({
        skillId: skill.skillId,
        skillName: skill.skillName,
        category: skill.category as SkillCategory,
        minimumProficiency: skill.minimumProficiency as ProficiencyLevel,
        weight: skill.weight,
        isRequired: skill.isRequired
      })),
      projectId: req.body.projectId,
      roleTitle: req.body.roleTitle,
      experienceLevel: req.body.experienceLevel,
      availabilityHours: req.body.availabilityHours,
      startDate: req.body.startDate,
      endDate: req.body.endDate
    };

    // Build filters from request
    const filters: SkillMatchFilters = {
      minimumMatchScore: req.body.minimumMatchScore || 30,
      maxResults: req.body.maxResults || 20,
      departmentIds: req.body.departmentIds,
      excludeEmployeeIds: req.body.excludeEmployeeIds,
      availabilityThreshold: req.body.availabilityThreshold || 50,
      includeBenchWarming: req.body.includeBenchWarming || false
    };

    const matches = await skillMatcher.findResourceMatches(criteria, filters);

    // Calculate summary statistics
    const summary = {
      totalCandidates: matches.length,
      averageMatchScore: matches.length > 0
        ? Math.round(matches.reduce((sum, m) => sum + m.overallMatchScore, 0) / matches.length)
        : 0,
      excellentMatches: matches.filter(m => m.overallRecommendation === 'excellent').length,
      goodMatches: matches.filter(m => m.overallRecommendation === 'good').length,
      fairMatches: matches.filter(m => m.overallRecommendation === 'fair').length,
      poorMatches: matches.filter(m => m.overallRecommendation === 'poor').length,
      skillCoverage: {
        fullyCovered: criteria.requiredSkills.filter(rs =>
          matches.some(m => m.skillMatches.some(sm =>
            sm.skillId === rs.skillId && sm.hasSkill && sm.proficiencyGap >= 0
          ))
        ).length,
        totalRequired: criteria.requiredSkills.length
      }
    };

    return res.json({
      success: true,
      message: `Found ${matches.length} matching candidates`,
      data: {
        matches,
        summary,
        criteria: {
          requiredSkills: criteria.requiredSkills.length,
          hasProjectContext: !!criteria.projectId,
          hasTimeConstraints: !!(criteria.startDate && criteria.endDate),
          hasAvailabilityRequirement: !!criteria.availabilityHours
        }
      }
    });
  })
);

/**
 * GET /api/skills/employee/:employeeId
 * Get employee skills with proficiency levels
 */
router.get('/employee/:employeeId',
  param('employeeId').isUUID().withMessage('Employee ID must be a valid UUID'),
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const { employeeId } = req.params;
    const skillMatcher = await SkillMatcherService.create();

    try {
      // Get all potential candidates to find the specific employee
      const candidates = await skillMatcher['getCandidatesWithSkills']({
        excludeEmployeeIds: [], // Don't exclude anyone
        maxResults: 1000
      });

      const employee = candidates.find(c => c.id === employeeId);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found or inactive'
        });
      }

      // Format employee skills data
      const employeeData = {
        id: employee.id,
        firstName: employee.first_name,
        lastName: employee.last_name,
        email: employee.email,
        position: employee.position,
        departmentId: employee.department_id,
        departmentName: employee.department_name,
        skills: (employee.skills || []).map((skill: any) => ({
          skillId: skill.skill_id,
          skillName: skill.skill_name,
          category: skill.skill_category,
          proficiencyLevel: skill.proficiency_level,
          yearsOfExperience: skill.years_of_experience,
          lastUsed: skill.last_used
        })),
        skillSummary: {
          totalSkills: (employee.skills || []).length,
          skillsByCategory: (employee.skills || []).reduce((acc: any, skill: any) => {
            const category = skill.skill_category || 'unknown';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
          }, {}),
          averageProficiency: (employee.skills || []).length > 0
            ? Math.round((employee.skills || []).reduce((sum: number, skill: any) =>
                sum + (skill.proficiency_level || 0), 0) / (employee.skills || []).length)
            : 0
        }
      };

      return res.json({
        success: true,
        message: 'Employee skills retrieved successfully',
        data: employeeData
      });
    } catch (error) {
      console.error('Error fetching employee skills:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch employee skills'
      });
    }
  })
);

/**
 * POST /api/skills/recommend
 * Get skill-based recommendations for a project
 */
router.post('/recommend',
  body('projectId').isString().notEmpty().withMessage('Project ID is required'),
  body('roleId').optional().isString().withMessage('Role ID must be a string'),
  body('maxRecommendations').optional().isInt({ min: 1, max: 50 }).withMessage('maxRecommendations must be between 1 and 50'),
  body('includeTeamChemistry').optional().isBoolean().withMessage('includeTeamChemistry must be a boolean'),
  body('preferredDepartments').optional().isArray().withMessage('preferredDepartments must be an array'),
  body('budgetConstraints').optional().isFloat({ min: 0 }).withMessage('budgetConstraints must be a positive number'),
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const { projectId, roleId } = req.body;
    const projectService = await ProjectService.create();

    try {
      let recommendations;

      if (roleId) {
        // Get recommendations for a specific role
        const roleMatches = await projectService.findRoleMatches(
          parseInt(projectId),
          parseInt(roleId),
          {
            maxResults: req.body.maxRecommendations || 10,
            minimumMatchScore: 40,
            includeBenchWarming: req.body.includeBenchWarming || false
          }
        );

        recommendations = {
          type: 'role_specific',
          roleId,
          matches: roleMatches
        };
      } else {
        // Get general project recommendations
        const projectRecommendations = await projectService.getResourceRecommendations(
          parseInt(projectId),
          {
            includeTeamChemistry: req.body.includeTeamChemistry !== false,
            maxRecommendations: req.body.maxRecommendations || 3,
            preferredDepartments: req.body.preferredDepartments,
            budgetConstraints: req.body.budgetConstraints
          }
        );

        recommendations = {
          type: 'project_wide',
          recommendations: projectRecommendations
        };
      }

      return res.json({
        success: true,
        message: 'Recommendations generated successfully',
        data: recommendations
      });
    } catch (error) {
      console.error('Error generating recommendations:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({
            success: false,
            message: error.message
          });
        }

        if (error.message.includes('No roles defined')) {
          return res.status(400).json({
            success: false,
            message: error.message,
            suggestion: 'Please define project roles before requesting recommendations'
          });
        }
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to generate recommendations'
      });
    }
  })
);

/**
 * GET /api/skills/gaps/project/:projectId
 * Get skill gap analysis for a specific project
 */
router.get('/gaps/project/:projectId',
  param('projectId').isNumeric().withMessage('Project ID must be a number'),
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const { projectId } = req.params;
    const projectService = await ProjectService.create();

    try {
      const skillGaps = await projectService.getProjectSkillGaps(parseInt(projectId));

      return res.json({
        success: true,
        message: 'Skill gap analysis completed successfully',
        data: {
          projectId: parseInt(projectId),
          analysis: skillGaps,
          actionItems: [
            ...skillGaps.roleGaps
              .filter(rg => rg.criticalGaps.length > 0)
              .map(rg => ({
                type: 'critical_hiring',
                priority: 'high',
                description: `Hire or train for ${rg.criticalGaps.join(', ')} in ${rg.roleTitle} role`,
                timeline: 'immediate'
              })),
            ...(skillGaps.summary.riskLevel === 'high' ? [{
              type: 'risk_mitigation',
              priority: 'high',
              description: 'High-risk project due to skill gaps - consider timeline adjustment or external consultants',
              timeline: 'immediate'
            }] : [])
          ]
        }
      });
    } catch (error) {
      console.error('Error analyzing project skill gaps:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to analyze project skill gaps'
      });
    }
  })
);

/**
 * POST /api/skills/match/bulk
 * Calculate match scores for multiple employees against skill requirements
 */
router.post('/match/bulk',
  validateSkillMatchRequest,
  body('employeeIds').isArray({ min: 1 }).withMessage('employeeIds must be a non-empty array'),
  body('employeeIds.*').isUUID().withMessage('Each employee ID must be a valid UUID'),
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const skillMatcher = await SkillMatcherService.create();
    const { employeeIds } = req.body;

    const criteria: SkillMatchCriteria = {
      requiredSkills: req.body.requiredSkills.map((skill: any) => ({
        skillId: skill.skillId,
        skillName: skill.skillName,
        category: skill.category as SkillCategory,
        minimumProficiency: skill.minimumProficiency as ProficiencyLevel,
        weight: skill.weight,
        isRequired: skill.isRequired
      })),
      projectId: req.body.projectId,
      roleTitle: req.body.roleTitle,
      experienceLevel: req.body.experienceLevel,
      availabilityHours: req.body.availabilityHours,
      startDate: req.body.startDate,
      endDate: req.body.endDate
    };

    try {
      // Get all matches and filter for requested employees
      const allMatches = await skillMatcher.findResourceMatches(criteria, {
        maxResults: 1000,
        minimumMatchScore: 0 // Include all scores for comparison
      });

      const requestedMatches = allMatches.filter((match: any) => employeeIds.includes(match.employeeId));
      const notFoundEmployees = employeeIds.filter((id: any) => !requestedMatches.some((m: any) => m.employeeId === id));

      return res.json({
        success: true,
        message: `Bulk scoring completed for ${requestedMatches.length}/${employeeIds.length} employees`,
        data: {
          matches: requestedMatches.sort((a, b) => b.overallMatchScore - a.overallMatchScore),
          summary: {
            requestedCount: employeeIds.length,
            foundCount: requestedMatches.length,
            notFoundCount: notFoundEmployees.length,
            averageScore: requestedMatches.length > 0
              ? Math.round(requestedMatches.reduce((sum, m) => sum + m.overallMatchScore, 0) / requestedMatches.length)
              : 0,
            topScore: requestedMatches.length > 0
              ? Math.max(...requestedMatches.map(m => m.overallMatchScore))
              : 0,
            scoreDistribution: {
              excellent: requestedMatches.filter(m => m.overallRecommendation === 'excellent').length,
              good: requestedMatches.filter(m => m.overallRecommendation === 'good').length,
              fair: requestedMatches.filter(m => m.overallRecommendation === 'fair').length,
              poor: requestedMatches.filter(m => m.overallRecommendation === 'poor').length
            }
          },
          notFound: notFoundEmployees
        }
      });
    } catch (error) {
      console.error('Error performing bulk skill matching:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to perform bulk skill matching'
      });
    }
  })
);

/**
 * GET /api/skills/statistics/organization
 * Get organization-wide skill statistics and insights
 */
router.get('/statistics/organization',
  query('departmentId').optional().isUUID().withMessage('Department ID must be a valid UUID'),
  query('includeInactive').optional().isBoolean().withMessage('includeInactive must be a boolean'),
  asyncHandler(async (req: Request, res: Response) => {
    const skillMatcher = await SkillMatcherService.create();

    try {
      // This would typically query the database directly for better performance
      // For now, we'll use the existing service to get a representative sample
      const candidates = await skillMatcher['getCandidatesWithSkills']({
        departmentIds: req.query.departmentId ? [req.query.departmentId as string] : undefined,
        maxResults: 1000
      });

      // Analyze organization skill distribution
      const skillStats = candidates.reduce((stats: any, candidate: any) => {
        const skills = candidate.skills || [];
        
        skills.forEach((skill: any) => {
          const skillName = skill.skill_name;
          const category = skill.skill_category;
          const proficiency = skill.proficiency_level;

          if (!stats[skillName]) {
            stats[skillName] = {
              name: skillName,
              category,
              totalEmployees: 0,
              proficiencyDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
              averageProficiency: 0,
              averageExperience: 0
            };
          }

          stats[skillName].totalEmployees++;
          stats[skillName].proficiencyDistribution[proficiency]++;
        });

        return stats;
      }, {});

      // Calculate averages and sort by prevalence
      const skillArray = Object.values(skillStats).map((skill: any) => {
        const total = skill.totalEmployees;
        const proficiencySum = Object.entries(skill.proficiencyDistribution)
          .reduce((sum: number, [level, count]) => sum + (parseInt(level) * (count as number)), 0);
        
        return {
          ...skill,
          averageProficiency: total > 0 ? Math.round((proficiencySum / total) * 10) / 10 : 0,
          prevalence: Math.round((total / candidates.length) * 100)
        };
      }).sort((a: any, b: any) => b.totalEmployees - a.totalEmployees);

      // Category analysis
      const categoryStats = skillArray.reduce((stats: any, skill: any) => {
        const category = skill.category || 'unknown';
        if (!stats[category]) {
          stats[category] = {
            skillCount: 0,
            totalPeople: 0,
            averageProficiency: 0
          };
        }
        
        stats[category].skillCount++;
        stats[category].totalPeople += skill.totalEmployees;
        return stats;
      }, {});

      res.json({
        success: true,
        message: 'Organization skill statistics retrieved successfully',
        data: {
          overview: {
            totalEmployees: candidates.length,
            totalUniqueSkills: skillArray.length,
            averageSkillsPerEmployee: Math.round(
              skillArray.reduce((sum: number, skill: any) => sum + skill.totalEmployees, 0) / 
              Math.max(candidates.length, 1) * 10
            ) / 10
          },
          skillsBreakdown: skillArray.slice(0, 20), // Top 20 skills
          categoryBreakdown: categoryStats,
          insights: {
            mostCommonSkills: skillArray.slice(0, 5).map((s: any) => s.name),
            rareSkills: skillArray.filter((s: any) => s.totalEmployees === 1).length,
            highExpertiseSkills: skillArray.filter((s: any) => s.averageProficiency >= 4).map((s: any) => s.name)
          },
          filters: {
            departmentId: req.query.departmentId,
            includeInactive: req.query.includeInactive === 'true'
          }
        }
      });
    } catch (error) {
      console.error('Error retrieving organization skill statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve organization skill statistics'
      });
    }
  })
);

export { router as skillsRoutes };