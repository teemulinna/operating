import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/async-handler';
import { SkillMatcherService, SkillMatchCriteria, SkillMatchFilters } from '../services/skill-matcher.service';
import { TeamChemistryAnalyzerService, TeamComposition } from '../services/team-chemistry-analyzer.service';
import { ResourceRecommendationEngine, RecommendationRequest } from '../services/resource-recommendation-engine.service';

const router = Router();

// Validation middleware
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

const validateTeamAnalysisRequest = [
  body('members')
    .isArray({ min: 1 })
    .withMessage('members must be a non-empty array'),
  body('members.*.employeeId')
    .notEmpty()
    .withMessage('employeeId is required for each member'),
  body('members.*.firstName')
    .notEmpty()
    .withMessage('firstName is required for each member'),
  body('members.*.lastName')
    .notEmpty()
    .withMessage('lastName is required for each member'),
  body('members.*.position')
    .notEmpty()
    .withMessage('position is required for each member'),
  body('members.*.departmentId')
    .notEmpty()
    .withMessage('departmentId is required for each member'),
  body('members.*.skills')
    .isArray()
    .withMessage('skills must be an array for each member'),
  body('projectId')
    .optional()
    .isString()
    .withMessage('projectId must be a string')
];

const validateRecommendationRequest = [
  body('roleRequirements')
    .isArray({ min: 1 })
    .withMessage('roleRequirements must be a non-empty array'),
  body('roleRequirements.*.roleTitle')
    .notEmpty()
    .withMessage('roleTitle is required for each role'),
  body('roleRequirements.*.skillRequirements')
    .isArray({ min: 1 })
    .withMessage('skillRequirements must be a non-empty array for each role'),
  body('roleRequirements.*.count')
    .isInt({ min: 1 })
    .withMessage('count must be a positive integer for each role'),
  body('projectConstraints.startDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('startDate must be a valid ISO 8601 date'),
  body('projectConstraints.endDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('endDate must be a valid ISO 8601 date'),
  body('projectConstraints.totalBudget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('totalBudget must be a positive number'),
  body('projectConstraints.maxTeamSize')
    .optional()
    .isInt({ min: 1 })
    .withMessage('maxTeamSize must be a positive integer'),
  body('projectConstraints.minTeamSize')
    .optional()
    .isInt({ min: 1 })
    .withMessage('minTeamSize must be a positive integer')
];

// Helper function to check validation results
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

// POST /api/matching/recommend - Generate resource recommendations
router.post('/recommend',
  validateRecommendationRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const recommendationEngine = await ResourceRecommendationEngine.create();

    const request: RecommendationRequest = {
      projectId: req.body.projectId,
      roleRequirements: req.body.roleRequirements,
      projectConstraints: req.body.projectConstraints,
      preferences: req.body.preferences
    };

    const filters = {
      maxRecommendations: req.body.maxRecommendations || 3,
      minConfidence: req.body.minConfidence,
      includeAlternatives: req.body.includeAlternatives !== false,
      detailedAnalysis: req.body.detailedAnalysis !== false
    };

    const recommendations = await recommendationEngine.generateRecommendations(request, filters);

    return res.json({
      success: true,
      message: 'Resource recommendations generated successfully',
      data: {
        recommendations,
        requestSummary: {
          totalRoles: request.roleRequirements.length,
          totalPositions: request.roleRequirements.reduce((sum, role) => sum + role.count, 0),
          projectId: request.projectId,
          hasConstraints: !!request.projectConstraints
        }
      }
    });
  })
);

// POST /api/matching/skill-match - Find resources based on skill requirements
router.post('/skill-match',
  validateSkillMatchRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const skillMatcher = await SkillMatcherService.create();

    const criteria: SkillMatchCriteria = {
      requiredSkills: req.body.requiredSkills,
      projectId: req.body.projectId,
      roleTitle: req.body.roleTitle,
      experienceLevel: req.body.experienceLevel,
      availabilityHours: req.body.availabilityHours,
      startDate: req.body.startDate,
      endDate: req.body.endDate
    };

    const filters: SkillMatchFilters = {
      minimumMatchScore: req.body.minimumMatchScore || 0,
      maxResults: req.body.maxResults || 20,
      departmentIds: req.body.departmentIds,
      excludeEmployeeIds: req.body.excludeEmployeeIds,
      availabilityThreshold: req.body.availabilityThreshold,
      includeBenchWarming: req.body.includeBenchWarming
    };

    const matches = await skillMatcher.findResourceMatches(criteria, filters);

    return res.json({
      success: true,
      message: 'Skill matching completed successfully',
      data: {
        matches,
        summary: {
          totalCandidates: matches.length,
          averageMatchScore: matches.length > 0
            ? Math.round(matches.reduce((sum, m) => sum + m.overallMatchScore, 0) / matches.length)
            : 0,
          excellentMatches: matches.filter(m => m.overallRecommendation === 'excellent').length,
          goodMatches: matches.filter(m => m.overallRecommendation === 'good').length
        }
      }
    });
  })
);

// GET /api/matching/score/:employeeId - Get match score for specific employee
router.get('/score/:employeeId',
  param('employeeId').notEmpty().withMessage('Employee ID is required'),
  validateSkillMatchRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const { employeeId } = req.params;
    const skillMatcher = await SkillMatcherService.create();

    // Get employee with skills
    const candidates = await skillMatcher.findResourceMatches(
      req.body as SkillMatchCriteria,
      { maxResults: 1000 }
    );

    const employeeMatch = candidates.find(c => c.employeeId === employeeId);

    if (!employeeMatch) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found or does not match criteria'
      });
    }

    return res.json({
      success: true,
      message: 'Match score calculated successfully',
      data: employeeMatch
    });
  })
);

// POST /api/matching/analyze-team - Analyze team chemistry
router.post('/analyze-team',
  validateTeamAnalysisRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const teamAnalyzer = await TeamChemistryAnalyzerService.create();

    const teamComposition: TeamComposition = {
      members: req.body.members,
      projectId: req.body.projectId,
      roleRequirements: req.body.roleRequirements
    };

    const analysis = await teamAnalyzer.analyzeTeamChemistry(teamComposition);

    return res.json({
      success: true,
      message: 'Team chemistry analysis completed successfully',
      data: {
        analysis,
        summary: {
          overallScore: analysis.overallChemistryScore,
          teamSize: teamComposition.members.length,
          riskLevel: analysis.riskFactors.some(rf => rf.severity === 'high') ? 'high' :
                     analysis.riskFactors.some(rf => rf.severity === 'medium') ? 'medium' : 'low',
          strengths: analysis.strengths.length,
          concerns: analysis.concerns.length
        }
      }
    });
  })
);

// POST /api/matching/optimize-team - Get team optimization suggestions
router.post('/optimize-team',
  validateTeamAnalysisRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const teamAnalyzer = await TeamChemistryAnalyzerService.create();

    const teamComposition: TeamComposition = {
      members: req.body.members,
      projectId: req.body.projectId,
      roleRequirements: req.body.roleRequirements
    };

    const analysis = await teamAnalyzer.analyzeTeamChemistry(teamComposition);
    const suggestions = await teamAnalyzer.generateOptimizationSuggestions(analysis, teamComposition);

    return res.json({
      success: true,
      message: 'Team optimization suggestions generated successfully',
      data: {
        currentAnalysis: analysis,
        optimizationSuggestions: suggestions,
        summary: {
          totalSuggestions: suggestions.length,
          maxPotentialImprovement: suggestions.length > 0
            ? Math.max(...suggestions.map(s => s.expectedImpact))
            : 0,
          prioritySuggestions: suggestions.filter(s => s.expectedImpact >= 15).length
        }
      }
    });
  })
);

// GET /api/matching/statistics - Get matching statistics for a project or criteria
router.get('/statistics',
  query('projectId').optional().isString(),
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    // This endpoint requires skill criteria to be provided
    if (!req.query.criteria) {
      return res.status(400).json({
        success: false,
        message: 'Skill criteria must be provided for statistics'
      });
    }

    const skillMatcher = await SkillMatcherService.create();

    try {
      const criteria: SkillMatchCriteria = JSON.parse(req.query.criteria as string);
      const statistics = await skillMatcher.getMatchStatistics(criteria);

      return res.json({
        success: true,
        message: 'Matching statistics retrieved successfully',
        data: statistics
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid criteria format. Must be valid JSON.'
      });
    }
  })
);

// GET /api/matching/skills/gaps - Identify skill gaps across the organization
router.get('/skills/gaps',
  query('departmentId').optional().isString(),
  query('projectType').optional().isString(),
  asyncHandler(async (req: Request, res: Response) => {
    const skillMatcher = await SkillMatcherService.create();
    
    // This is a simplified skill gap analysis
    // In a real implementation, this would analyze current projects and resource needs
    const mockSkillGaps = [
      {
        skillName: 'React',
        category: 'Technical',
        currentDemand: 8,
        currentSupply: 5,
        gap: 3,
        priority: 'high',
        suggestedActions: ['External hiring', 'Internal training', 'Contractor engagement']
      },
      {
        skillName: 'Python',
        category: 'Technical',
        currentDemand: 6,
        currentSupply: 4,
        gap: 2,
        priority: 'medium',
        suggestedActions: ['Internal training', 'Skill development program']
      },
      {
        skillName: 'Project Management',
        category: 'Soft',
        currentDemand: 4,
        currentSupply: 6,
        gap: -2,
        priority: 'low',
        suggestedActions: ['Consider reallocation', 'Advanced PM training for existing staff']
      }
    ];

    res.json({
      success: true,
      message: 'Skill gaps analysis completed',
      data: {
        skillGaps: mockSkillGaps,
        summary: {
          totalGaps: mockSkillGaps.filter(g => g.gap > 0).length,
          criticalGaps: mockSkillGaps.filter(g => g.priority === 'high').length,
          surplusSkills: mockSkillGaps.filter(g => g.gap < 0).length,
          totalDemand: mockSkillGaps.reduce((sum, g) => sum + g.currentDemand, 0),
          totalSupply: mockSkillGaps.reduce((sum, g) => sum + g.currentSupply, 0)
        }
      }
    });
  })
);

// POST /api/matching/bulk-score - Calculate match scores for multiple employees
router.post('/bulk-score',
  validateSkillMatchRequest,
  body('employeeIds').isArray({ min: 1 }).withMessage('employeeIds must be a non-empty array'),
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const skillMatcher = await SkillMatcherService.create();
    const { employeeIds } = req.body;

    const criteria: SkillMatchCriteria = {
      requiredSkills: req.body.requiredSkills,
      projectId: req.body.projectId,
      roleTitle: req.body.roleTitle,
      experienceLevel: req.body.experienceLevel,
      availabilityHours: req.body.availabilityHours,
      startDate: req.body.startDate,
      endDate: req.body.endDate
    };

    // Get all matches and filter for requested employees
    const allMatches = await skillMatcher.findResourceMatches(criteria, { maxResults: 1000 });
    const requestedMatches = allMatches.filter(match => employeeIds.includes(match.employeeId));

    return res.json({
      success: true,
      message: 'Bulk scoring completed successfully',
      data: {
        matches: requestedMatches,
        summary: {
          requestedCount: employeeIds.length,
          foundCount: requestedMatches.length,
          averageScore: requestedMatches.length > 0
            ? Math.round(requestedMatches.reduce((sum, m) => sum + m.overallMatchScore, 0) / requestedMatches.length)
            : 0
        },
        notFound: employeeIds.filter((id: string) => !requestedMatches.some(m => m.employeeId === id))
      }
    });
  })
);

// GET /api/matching/recommendations/:recommendationId - Get specific recommendation details
router.get('/recommendations/:recommendationId',
  param('recommendationId').notEmpty().withMessage('Recommendation ID is required'),
  asyncHandler(async (req: Request, res: Response) => {
    const { recommendationId } = req.params;
    
    // In a real implementation, this would retrieve stored recommendation from database
    // For now, return a mock response indicating the endpoint structure
    
    res.status(404).json({
      success: false,
      message: 'Recommendation not found. Recommendations are currently generated on-demand.',
      suggestion: 'Use POST /api/matching/recommend to generate new recommendations'
    });
  })
);

export default router;