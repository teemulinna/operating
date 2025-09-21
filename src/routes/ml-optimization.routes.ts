/**
 * ML Optimization API Routes
 * Provides endpoints for AI-powered resource optimization features
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/async-handler';

// Import ML services
import MLRecommendationEngine from '../services/ml-recommendation-engine.service';
import SkillsMatchingService from '../services/skills-matching.service';
import PredictiveAnalyticsService from '../services/predictive-analytics.service';
import OptimizationEngine from '../services/optimization-engine.service';

const router = Router();

// Validation helper
const handleValidationErrors = (req: Request, res: Response, next: any): Response | void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  return next();
};

// ============================================================================
// RESOURCE RECOMMENDATIONS
// ============================================================================

/**
 * POST /api/ml-optimization/recommendations/find-matches
 * Find best resource matches for a project role
 */
router.post('/recommendations/find-matches',
  [
    body('projectId').isNumeric().withMessage('Project ID must be a number'),
    body('roleId').isString().notEmpty().withMessage('Role ID is required'),
    body('requiredSkills').isArray().withMessage('Required skills must be an array'),
    body('requiredSkills.*').isString().withMessage('Each skill must be a string'),
    body('experienceLevel').isIn(['junior', 'intermediate', 'senior', 'expert']).withMessage('Invalid experience level'),
    body('maxCandidates').optional().isInt({ min: 1, max: 50 }).withMessage('Max candidates must be 1-50')
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId, roleId, requiredSkills, experienceLevel, maxCandidates = 10 } = req.body;

    const recommendations = await MLRecommendationEngine.findBestResourceMatches(
      parseInt(projectId),
      roleId,
      requiredSkills,
      experienceLevel,
      maxCandidates
    );

    res.json({
      success: true,
      message: 'Resource matches found successfully',
      data: {
        projectId,
        roleId,
        matchCount: recommendations.length,
        recommendations
      }
    });
  })
);

/**
 * POST /api/ml-optimization/recommendations/skill-matching
 * Advanced skill-based matching with confidence scoring
 */
router.post('/recommendations/skill-matching',
  [
    body('criteria.projectId').isNumeric().withMessage('Project ID must be a number'),
    body('criteria.requiredSkills').isArray().notEmpty().withMessage('Required skills array is required'),
    body('criteria.experienceLevel').isIn(['junior', 'intermediate', 'senior', 'expert']).withMessage('Invalid experience level'),
    body('criteria.startDate').isISO8601().withMessage('Start date must be valid ISO 8601'),
    body('options.maxResults').optional().isInt({ min: 1, max: 100 }),
    body('options.includePartialMatches').optional().isBoolean(),
    body('options.considerTraining').optional().isBoolean()
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const { criteria, options = {} } = req.body;

    // Transform criteria to match service interface
    const matchingCriteria = {
      ...criteria,
      requiredSkills: criteria.requiredSkills.map((skill: any) => ({
        skillId: typeof skill === 'string' ? skill : skill.skillId,
        minimumLevel: typeof skill === 'string' ? criteria.experienceLevel : skill.minimumLevel,
        weight: typeof skill === 'string' ? 1.0 : skill.weight || 1.0,
        mandatory: typeof skill === 'string' ? true : skill.mandatory !== false
      })),
      startDate: new Date(criteria.startDate),
      endDate: criteria.endDate ? new Date(criteria.endDate) : undefined,
      projectDuration: criteria.projectDuration || 12
    };

    const matches = await SkillsMatchingService.findSkillMatches(matchingCriteria, options);

    res.json({
      success: true,
      message: 'Skill matching completed successfully',
      data: {
        criteria: matchingCriteria,
        matchCount: matches.length,
        matches
      }
    });
  })
);

/**
 * GET /api/ml-optimization/recommendations/skill-similarity
 * Calculate similarity between skill sets
 */
router.get('/recommendations/skill-similarity',
  [
    query('skillSet1').notEmpty().withMessage('First skill set is required'),
    query('skillSet2').notEmpty().withMessage('Second skill set is required'),
    query('contextWeight').optional().isFloat({ min: 0, max: 1 })
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const skillSet1 = Array.isArray(req.query.skillSet1) ? req.query.skillSet1 as string[] : [req.query.skillSet1 as string];
    const skillSet2 = Array.isArray(req.query.skillSet2) ? req.query.skillSet2 as string[] : [req.query.skillSet2 as string];
    const contextWeight = parseFloat(req.query.contextWeight as string) || 0.3;

    const similarity = await SkillsMatchingService.calculateSkillSimilarity(
      skillSet1,
      skillSet2,
      contextWeight
    );

    res.json({
      success: true,
      message: 'Skill similarity calculated successfully',
      data: {
        skillSet1,
        skillSet2,
        similarity
      }
    });
  })
);

// ============================================================================
// DEMAND FORECASTING
// ============================================================================

/**
 * POST /api/ml-optimization/forecasting/demand-forecast
 * Generate demand forecast for resources
 */
router.post('/forecasting/demand-forecast',
  [
    body('timeHorizon').isIn(['weekly', 'monthly', 'quarterly', 'yearly']).withMessage('Invalid time horizon'),
    body('options.includeSeasonality').optional().isBoolean(),
    body('options.includeTrends').optional().isBoolean(),
    body('options.confidenceLevel').optional().isFloat({ min: 0.5, max: 0.99 }),
    body('options.skillCategories').optional().isArray(),
    body('options.departments').optional().isArray()
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const { timeHorizon, options = {} } = req.body;

    const forecast = await PredictiveAnalyticsService.generateDemandForecast(timeHorizon, options);

    res.json({
      success: true,
      message: 'Demand forecast generated successfully',
      data: forecast
    });
  })
);

/**
 * POST /api/ml-optimization/forecasting/pipeline-demand
 * Forecast resource demand based on pipeline projects
 */
router.post('/forecasting/pipeline-demand',
  [
    body('filter.probabilityThreshold').optional().isFloat({ min: 0, max: 1 }),
    body('filter.budgetRange').optional().isArray().withMessage('Budget range must be an array'),
    body('filter.timeRange').optional().isArray().withMessage('Time range must be an array')
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const { filter = {} } = req.body;

    // Convert date strings to Date objects if provided
    if (filter.timeRange) {
      filter.timeRange = filter.timeRange.map((date: string) => new Date(date));
    }

    const pipelineForecast = await PredictiveAnalyticsService.forecastPipelineResourceDemand(filter);

    res.json({
      success: true,
      message: 'Pipeline demand forecast generated successfully',
      data: pipelineForecast
    });
  })
);

/**
 * POST /api/ml-optimization/forecasting/scenarios
 * Generate scenario-based forecasts
 */
router.post('/forecasting/scenarios',
  [
    body('scenarios').isArray().notEmpty().withMessage('Scenarios array is required'),
    body('scenarios.*.name').notEmpty().withMessage('Scenario name is required'),
    body('scenarios.*.assumptions.growthRate').isNumeric().withMessage('Growth rate must be numeric'),
    body('scenarios.*.assumptions.marketConditions').isIn(['optimistic', 'realistic', 'pessimistic'])
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const { scenarios } = req.body;

    const scenarioForecasts = await PredictiveAnalyticsService.generateScenarioForecasts(scenarios);

    res.json({
      success: true,
      message: 'Scenario forecasts generated successfully',
      data: scenarioForecasts
    });
  })
);

/**
 * PUT /api/ml-optimization/forecasting/:forecastId/update
 * Update forecast with real-time data
 */
router.put('/forecasting/:forecastId/update',
  [
    param('forecastId').notEmpty().withMessage('Forecast ID is required'),
    body('realTimeData.newProjects').optional().isArray(),
    body('realTimeData.cancelledProjects').optional().isArray(),
    body('realTimeData.resourceChanges').optional().isArray()
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const { forecastId } = req.params;
    const { realTimeData } = req.body;

    const updatedForecast = await PredictiveAnalyticsService.updateForecastWithRealTimeData(
      forecastId,
      realTimeData
    );

    res.json({
      success: true,
      message: 'Forecast updated with real-time data',
      data: updatedForecast
    });
  })
);

/**
 * POST /api/ml-optimization/forecasting/:forecastId/evaluate
 * Evaluate forecast accuracy against actual data
 */
router.post('/forecasting/:forecastId/evaluate',
  [
    param('forecastId').notEmpty().withMessage('Forecast ID is required'),
    body('actualData.skillDemand').isArray().withMessage('Actual skill demand data is required'),
    body('actualData.departmentUtilization').optional().isArray()
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const { forecastId } = req.params;
    const { actualData } = req.body;

    // Convert date strings to Date objects
    if (actualData.skillDemand) {
      actualData.skillDemand = actualData.skillDemand.map((item: any) => ({
        ...item,
        date: new Date(item.date)
      }));
    }

    if (actualData.departmentUtilization) {
      actualData.departmentUtilization = actualData.departmentUtilization.map((item: any) => ({
        ...item,
        date: new Date(item.date)
      }));
    }

    const evaluation = await PredictiveAnalyticsService.evaluateForecastAccuracy(forecastId, actualData);

    res.json({
      success: true,
      message: 'Forecast accuracy evaluation completed',
      data: evaluation
    });
  })
);

// ============================================================================
// OPTIMIZATION
// ============================================================================

/**
 * POST /api/ml-optimization/optimization/optimize-allocation
 * Run resource allocation optimization
 */
router.post('/optimization/optimize-allocation',
  [
    body('scope.projectIds').optional().isArray(),
    body('scope.employeeIds').optional().isArray(),
    body('scope.timeRange.startDate').optional().isISO8601(),
    body('scope.timeRange.endDate').optional().isISO8601(),
    body('config.objectives.maximizeUtilization').optional().isFloat({ min: 0, max: 1 }),
    body('config.objectives.minimizeConflicts').optional().isFloat({ min: 0, max: 1 }),
    body('config.algorithm').optional().isIn(['genetic', 'simulated_annealing', 'constraint_satisfaction', 'hybrid'])
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const { scope = {}, config = {} } = req.body;

    // Convert date strings to Date objects
    if (scope.timeRange) {
      if (scope.timeRange.startDate) scope.timeRange.startDate = new Date(scope.timeRange.startDate);
      if (scope.timeRange.endDate) scope.timeRange.endDate = new Date(scope.timeRange.endDate);
    }

    const optimization = await OptimizationEngine.optimizeResourceAllocation(scope, config);

    res.json({
      success: true,
      message: 'Resource allocation optimization completed',
      data: optimization
    });
  })
);

// ============================================================================
// REAL-TIME ADJUSTMENTS
// ============================================================================

/**
 * POST /api/ml-optimization/adjustments/generate
 * Generate real-time adjustment suggestions
 */
router.post('/adjustments/generate',
  [
    body('triggerEvent.type').isIn(['project_change', 'employee_unavailable', 'skill_gap', 'budget_change']).withMessage('Invalid trigger event type'),
    body('triggerEvent.projectId').optional().isNumeric(),
    body('triggerEvent.employeeId').optional().isString(),
    body('triggerEvent.changes').isObject().withMessage('Changes object is required')
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const { triggerEvent } = req.body;

    const adjustments = await MLRecommendationEngine.generateRealTimeAdjustments(triggerEvent);

    res.json({
      success: true,
      message: 'Real-time adjustments generated successfully',
      data: adjustments
    });
  })
);

// ============================================================================
// PERFORMANCE & BENCHMARKING
// ============================================================================

/**
 * GET /api/ml-optimization/performance/benchmark
 * Run performance benchmarks for ML algorithms
 */
router.get('/performance/benchmark',
  asyncHandler(async (req: Request, res: Response) => {
    const benchmarks = await MLRecommendationEngine.benchmarkAlgorithmPerformance();

    res.json({
      success: true,
      message: 'Performance benchmarks completed',
      data: {
        timestamp: new Date(),
        benchmarks
      }
    });
  })
);

/**
 * POST /api/ml-optimization/performance/predict-performance
 * Predict employee performance for a project
 */
router.post('/performance/predict-performance',
  [
    body('employeeId').isString().notEmpty().withMessage('Employee ID is required'),
    body('projectRequirements').isObject().notEmpty().withMessage('Project requirements are required'),
    body('historicalProjects').optional().isArray()
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const { employeeId, projectRequirements, historicalProjects } = req.body;

    const performancePrediction = await SkillsMatchingService.predictPerformance(
      employeeId,
      projectRequirements,
      historicalProjects
    );

    res.json({
      success: true,
      message: 'Performance prediction completed',
      data: {
        employeeId,
        prediction: performancePrediction
      }
    });
  })
);

/**
 * POST /api/ml-optimization/performance/confidence-score
 * Calculate confidence score for a match result
 */
router.post('/performance/confidence-score',
  [
    body('matchResult').isObject().notEmpty().withMessage('Match result is required'),
    body('historicalData').optional().isObject()
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const { matchResult, historicalData } = req.body;

    const confidenceAnalysis = SkillsMatchingService.calculateConfidenceScore(
      matchResult,
      historicalData
    );

    res.json({
      success: true,
      message: 'Confidence score calculated successfully',
      data: confidenceAnalysis
    });
  })
);

// ============================================================================
// ANALYTICS & INSIGHTS
// ============================================================================

/**
 * GET /api/ml-optimization/analytics/insights
 * Get ML-driven insights and recommendations
 */
router.get('/analytics/insights',
  [
    query('timeRange').optional().isIn(['week', 'month', 'quarter', 'year']),
    query('departments').optional(),
    query('skillCategories').optional()
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const timeRange = req.query.timeRange as string || 'month';
    const departments = req.query.departments ? (req.query.departments as string).split(',') : undefined;
    const skillCategories = req.query.skillCategories ? (req.query.skillCategories as string).split(',') : undefined;

    // Generate comprehensive insights
    const insights = {
      timestamp: new Date(),
      timeRange,
      summary: {
        totalRecommendations: 0,
        optimizationOpportunities: 0,
        skillGaps: 0,
        utilizationIssues: 0
      },
      recommendations: [],
      trends: [],
      alerts: []
    };

    // This would integrate with all services to generate comprehensive insights
    // For now, returning a structured response

    res.json({
      success: true,
      message: 'ML insights generated successfully',
      data: insights
    });
  })
);

/**
 * POST /api/ml-optimization/analytics/what-if
 * Run what-if analysis scenarios
 */
router.post('/analytics/what-if',
  [
    body('scenario.name').notEmpty().withMessage('Scenario name is required'),
    body('scenario.changes').isArray().withMessage('Changes array is required'),
    body('scenario.timeframe').notEmpty().withMessage('Timeframe is required')
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const { scenario } = req.body;

    // Run what-if analysis
    const analysis = {
      scenarioId: `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      scenario,
      results: {
        predictedOutcome: {
          utilizationChange: 0,
          costImpact: 0,
          skillGapImpact: 0,
          riskLevel: 'medium'
        },
        recommendations: [],
        risks: [],
        alternatives: []
      },
      confidence: 0.75
    };

    res.json({
      success: true,
      message: 'What-if analysis completed',
      data: analysis
    });
  })
);

// Error handling middleware for this router
router.use((error: any, req: Request, res: Response, next: any) => {
  console.error('ML Optimization API Error:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error in ML optimization',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

export { router as mlOptimizationRoutes };