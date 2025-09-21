import { Router } from 'express';
import { Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { DatabaseService } from '../database/database.service';
import { HistoricalDataAggregator } from '../services/forecasting/historical-data-aggregator';
import { PatternRecognitionService } from '../services/forecasting/pattern-recognition.service';

const router = Router();

// Initialize services
const dbService = new DatabaseService();
const dataAggregator = new HistoricalDataAggregator(dbService);
const patternService = new PatternRecognitionService(dataAggregator);

/**
 * GET /api/forecasting/capacity
 * Get capacity forecasting data
 */
router.get('/capacity',
  [
    query('timeHorizon').optional().isInt({ min: 1, max: 365 }).toInt(),
    query('skills').optional().isString(),
    query('aggregation').optional().isIn(['daily', 'weekly', 'monthly']),
    query('includePatterns').optional().isBoolean().toBoolean()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const {
        timeHorizon = 90,
        skills,
        aggregation = 'daily',
        includePatterns = false
      } = req.query;

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (timeHorizon as number));

      // Get historical capacity data
      const capacityTrends = await dataAggregator.calculateCapacityTrends({
        start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year back
        end: startDate
      });

      let skillFilter: string[] = [];
      if (skills) {
        skillFilter = (skills as string).split(',').map(s => s.trim());
      }

      // Get skill-specific demand data
      const skillDemand = await dataAggregator.aggregateSkillDemand(
        skillFilter.length > 0 ? skillFilter : Object.keys(capacityTrends.bySkill),
        { start: startDate, end: endDate }
      );

      let patterns = null;
      if (includePatterns) {
        patterns = await patternService.recognizePatterns(capacityTrends.totalCapacity);
      }

      const response = {
        success: true,
        data: {
          totalCapacity: capacityTrends.totalCapacity,
          availableCapacity: capacityTrends.availableCapacity,
          utilizationRate: capacityTrends.utilizationRate,
          skillCapacity: capacityTrends.bySkill,
          skillDemand,
          forecast: {
            timeHorizon: timeHorizon as number,
            aggregation,
            startDate,
            endDate
          },
          patterns: patterns || undefined
        },
        metadata: {
          generatedAt: new Date(),
          dataPoints: capacityTrends.totalCapacity.length,
          skills: Object.keys(capacityTrends.bySkill).length
        }
      };

      return res.json(response);
    } catch (error: any) {
      console.error('Error in capacity forecasting:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/forecasting/scenario
 * Create and run a forecasting scenario
 */
router.post('/scenario',
  [
    body('name').isString().isLength({ min: 1, max: 100 }),
    body('description').optional().isString().isLength({ max: 500 }),
    body('timeHorizon').isInt({ min: 7, max: 365 }),
    body('projects').isArray(),
    body('projects.*.id').isString(),
    body('projects.*.name').isString(),
    body('projects.*.startDate').isISO8601(),
    body('projects.*.endDate').isISO8601(),
    body('projects.*.teamSize').isInt({ min: 1 }),
    body('projects.*.budget').isFloat({ min: 0 }),
    body('projects.*.probability').isFloat({ min: 0, max: 1 }),
    body('constraints').optional().isArray()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const {
        name,
        description = '',
        timeHorizon,
        projects,
        constraints = []
      } = req.body;

      // Store scenario in database
      const scenarioQuery = `
        INSERT INTO capacity_scenarios (name, description, time_horizon, projects_data, constraints_data, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;

      const scenarioResult = await dbService.query(scenarioQuery, [
        name,
        description,
        timeHorizon,
        JSON.stringify(projects),
        JSON.stringify(constraints),
        new Date()
      ]);

      const scenarioId = scenarioResult.rows[0].id;

      // Get historical data for pattern analysis
      const historicalData = await dataAggregator.aggregateResourceUtilization({
        timeWindow: 'daily',
        aggregationMethod: 'average',
        groupBy: [],
        filters: {}
      });

      // Analyze capacity patterns
      const patterns = await patternService.recognizePatterns(
        historicalData.map(d => ({
          timestamp: d.timestamp,
          value: d.value,
          metadata: d.metadata
        }))
      );

      // Generate insights
      const insights = await patternService.generateCapacityInsights(
        historicalData.map(d => ({
          timestamp: d.timestamp,
          value: d.value,
          metadata: d.metadata
        })),
        historicalData.map(d => ({
          timestamp: d.timestamp,
          value: d.value * 1.1, // Simulate demand data
          metadata: d.metadata
        })),
        [] // Would include actual resource data
      );

      // Detect anomalies
      const anomalies = await patternService.detectAnomalies(
        historicalData.map(d => ({
          timestamp: d.timestamp,
          value: d.value,
          metadata: d.metadata
        }))
      );

      // Generate recommendations
      const recommendations = patternService.generatePatternRecommendations(patterns);

      const response = {
        success: true,
        data: {
          scenarioId,
          name,
          description,
          timeHorizon,
          analysis: {
            patterns,
            insights,
            anomalies,
            recommendations
          },
          projects: projects.length,
          constraints: constraints.length
        },
        metadata: {
          createdAt: new Date(),
          analysisCompleted: true
        }
      };

      return res.status(201).json(response);
    } catch (error: any) {
      console.error('Error creating forecasting scenario:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/forecasting/scenario/:id
 * Get scenario analysis results
 */
router.get('/scenario/:id',
  [
    param('id').isInt().toInt()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const scenarioId = req.params.id;

      const scenarioQuery = `
        SELECT id, name, description, time_horizon, projects_data, constraints_data, created_at, updated_at
        FROM capacity_scenarios 
        WHERE id = $1
      `;

      const scenarios = await dbService.query(scenarioQuery, [scenarioId]);

      if (scenarios.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Scenario not found'
        });
      }

      const scenario = scenarios.rows[0];
      const projects = JSON.parse(scenario.projects_data);
      const constraints = JSON.parse(scenario.constraints_data);

      // Re-run analysis with current data
      const historicalData = await dataAggregator.aggregateResourceUtilization({
        timeWindow: 'daily',
        aggregationMethod: 'average',
        groupBy: [],
        filters: {}
      });

      const patterns = await patternService.recognizePatterns(
        historicalData.map(d => ({
          timestamp: d.timestamp,
          value: d.value,
          metadata: d.metadata
        }))
      );

      const insights = await patternService.generateCapacityInsights(
        historicalData.map(d => ({
          timestamp: d.timestamp,
          value: d.value,
          metadata: d.metadata
        })),
        historicalData.map(d => ({
          timestamp: d.timestamp,
          value: d.value * 1.1,
          metadata: d.metadata
        })),
        []
      );

      const response = {
        success: true,
        data: {
          scenario: {
            id: scenario.id,
            name: scenario.name,
            description: scenario.description,
            timeHorizon: scenario.time_horizon,
            projects,
            constraints,
            createdAt: scenario.created_at,
            updatedAt: scenario.updated_at
          },
          analysis: {
            patterns,
            insights,
            recommendations: patternService.generatePatternRecommendations(patterns)
          }
        }
      };

      return res.json(response);
    } catch (error: any) {
      console.error('Error retrieving scenario:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/forecasting/demand
 * Get demand forecasting data
 */
router.get('/demand',
  [
    query('skills').optional().isString(),
    query('timeRange').optional().isIn(['week', 'month', 'quarter', 'year']),
    query('projects').optional().isString(),
    query('includeHistorical').optional().isBoolean().toBoolean()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const {
        skills,
        timeRange = 'quarter',
        projects,
        includeHistorical = true
      } = req.query;

      // Calculate time ranges
      const timeRanges = {
        week: 7,
        month: 30,
        quarter: 90,
        year: 365
      };

      const days = timeRanges[timeRange as keyof typeof timeRanges];
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      let skillFilter: string[] = [];
      if (skills) {
        skillFilter = (skills as string).split(',').map(s => s.trim());
      }

      let projectFilter: string[] = [];
      if (projects) {
        projectFilter = (projects as string).split(',').map(p => p.trim());
      }

      // Get skill demand data
      const skillDemand = await dataAggregator.aggregateSkillDemand(
        skillFilter.length > 0 ? skillFilter : ['javascript', 'typescript', 'react', 'node.js', 'python'],
        { start: startDate, end: endDate }
      );

      let historicalDemand = null;
      if (includeHistorical) {
        const historicalStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);
        historicalDemand = await dataAggregator.aggregateSkillDemand(
          Object.keys(skillDemand),
          { start: historicalStartDate, end: startDate }
        );
      }

      // Calculate demand trends
      const demandTrends = {};
      for (const [skill, demandData] of Object.entries(skillDemand)) {
        const values = demandData.map(d => d.value);
        const trend = patternService['calculateLinearTrend'](values);
        (demandTrends as any)[skill] = {
          trend: trend.slope > 0.1 ? 'increasing' : trend.slope < -0.1 ? 'decreasing' : 'stable',
          strength: Math.abs(trend.correlation),
          currentDemand: values[values.length - 1] || 0,
          avgDemand: values.reduce((sum, val) => sum + val, 0) / values.length
        };
      }

      const response = {
        success: true,
        data: {
          demandBySkill: skillDemand,
          historicalDemand: historicalDemand || undefined,
          trends: demandTrends,
          timeRange: {
            start: startDate,
            end: endDate,
            period: timeRange,
            days
          },
          filters: {
            skills: skillFilter,
            projects: projectFilter
          }
        },
        metadata: {
          generatedAt: new Date(),
          skillsAnalyzed: Object.keys(skillDemand).length,
          dataPoints: Object.values(skillDemand).reduce((sum, data: any) => sum + data.length, 0)
        }
      };

      return res.json(response);
    } catch (error: any) {
      console.error('Error in demand forecasting:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/forecasting/patterns/train
 * Train pattern recognition models
 */
router.post('/patterns/train',
  [
    body('timeRange').optional().isInt({ min: 30, max: 365 }),
    body('includeAnomalyDetection').optional().isBoolean()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const {
        timeRange = 365,
        includeAnomalyDetection = true
      } = req.body;

      // Get historical data for training
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - timeRange * 24 * 60 * 60 * 1000);

      // Get employee historical data
      const employeesQuery = `
        SELECT id FROM employees 
        WHERE status = 'active' 
        ORDER BY created_at 
        LIMIT 50
      `;
      
      const employees = await dbService.query(employeesQuery, []);
      const historicalData = [];

      for (const employee of employees.rows.slice(0, 10)) { // Limit for training
        try {
          const resourceHistory = await dataAggregator.getResourceHistory(
            employee.id,
            { start: startDate, end: endDate }
          );
          historicalData.push(resourceHistory);
        } catch (error: any) {
          console.warn(`Failed to get history for employee ${employee.id}:`, error.message);
        }
      }

      if (historicalData.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No historical data available for training'
        });
      }

      // Train models
      await patternService.trainModels(historicalData);

      // Test pattern recognition on recent data
      const recentData = await dataAggregator.aggregateResourceUtilization({
        timeWindow: 'daily',
        aggregationMethod: 'average',
        groupBy: [],
        filters: {
          'aa.start_date >=': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      });

      const testPatterns = await patternService.recognizePatterns(
        recentData.map(d => ({
          timestamp: d.timestamp,
          value: d.value,
          metadata: d.metadata
        }))
      );

      const response = {
        success: true,
        data: {
          training: {
            dataPoints: historicalData.length,
            timeRange: {
              start: startDate,
              end: endDate,
              days: timeRange
            },
            modelsUpdated: ['patternDetection', 'anomalyDetection'].filter(m => 
              m === 'patternDetection' || (m === 'anomalyDetection' && includeAnomalyDetection)
            )
          },
          validation: {
            patternsDetected: testPatterns.length,
            patternTypes: [...new Set(testPatterns.map(p => p.type))],
            averageConfidence: testPatterns.length > 0 ? 
              testPatterns.reduce((sum, p) => sum + p.strength, 0) / testPatterns.length : 0
          }
        },
        metadata: {
          trainedAt: new Date(),
          nextTrainingRecommended: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week
        }
      };

      return res.json(response);
    } catch (error: any) {
      console.error('Error training pattern recognition models:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/forecasting/insights
 * Get capacity insights and recommendations
 */
router.get('/insights',
  [
    query('category').optional().isIn(['efficiency', 'utilization', 'planning', 'risk']),
    query('timeRange').optional().isInt({ min: 7, max: 365 }),
    query('minImpact').optional().isIn(['low', 'medium', 'high', 'critical'])
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const {
        category,
        timeRange = 30,
        minImpact = 'low'
      } = req.query;

      // Get recent data
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (timeRange as number) * 24 * 60 * 60 * 1000);

      const utilizationData = await dataAggregator.aggregateResourceUtilization({
        timeWindow: 'daily',
        aggregationMethod: 'average',
        groupBy: [],
        filters: {
          'aa.start_date >=': startDate.toISOString(),
          'aa.start_date <=': endDate.toISOString()
        }
      });

      const demandData = utilizationData.map(d => ({
        timestamp: d.timestamp,
        value: d.value * 1.1, // Simulate demand slightly higher than utilization
        metadata: d.metadata
      }));

      // Generate insights
      const allInsights = await patternService.generateCapacityInsights(
        utilizationData.map(d => ({
          timestamp: d.timestamp,
          value: d.value,
          metadata: d.metadata
        })),
        demandData,
        [] // Would include actual resource data
      );

      // Filter insights
      const impactOrder = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
      const minImpactLevel = impactOrder[minImpact as keyof typeof impactOrder];

      let filteredInsights = allInsights.filter(insight => {
        const insightImpactLevel = impactOrder[insight.impact];
        const categoryMatch = !category || insight.category === category;
        const impactMatch = insightImpactLevel >= minImpactLevel;
        return categoryMatch && impactMatch;
      });

      // Get patterns for additional recommendations
      const patterns = await patternService.recognizePatterns(
        utilizationData.map(d => ({
          timestamp: d.timestamp,
          value: d.value,
          metadata: d.metadata
        }))
      );

      const patternRecommendations = patternService.generatePatternRecommendations(patterns);

      const response = {
        success: true,
        data: {
          insights: filteredInsights,
          patterns: patterns.map(p => ({
            id: p.id,
            type: p.type,
            description: p.description,
            strength: p.strength,
            occurrences: p.occurrences.length
          })),
          recommendations: patternRecommendations,
          summary: {
            totalInsights: allInsights.length,
            filteredInsights: filteredInsights.length,
            byCategory: {
              efficiency: allInsights.filter(i => i.category === 'efficiency').length,
              utilization: allInsights.filter(i => i.category === 'utilization').length,
              planning: allInsights.filter(i => i.category === 'planning').length,
              risk: allInsights.filter(i => i.category === 'risk').length
            },
            byImpact: {
              low: allInsights.filter(i => i.impact === 'low').length,
              medium: allInsights.filter(i => i.impact === 'medium').length,
              high: allInsights.filter(i => i.impact === 'high').length,
              critical: allInsights.filter(i => i.impact === 'critical').length
            }
          }
        },
        metadata: {
          generatedAt: new Date(),
          timeRange: {
            start: startDate,
            end: endDate,
            days: timeRange
          },
          filters: { category, minImpact }
        }
      };

      return res.json(response);
    } catch (error: any) {
      console.error('Error generating capacity insights:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;