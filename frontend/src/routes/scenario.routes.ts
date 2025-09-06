// Scenario Planning API Routes
import express from 'express';
import { Pool } from 'pg';
import { ScenarioPlanningService } from '../services/scenario-planning.service';
import { ResourceForecastingService } from '../services/resource-forecasting.service';
import {
  CreateScenarioRequest,
  UpdateScenarioRequest,
  CreateScenarioAllocationRequest,
  UpdateScenarioAllocationRequest,
  ScenarioType,
  ScenarioStatus,
  AllocationType
} from '../types/scenario';

export function createScenarioRoutes(db: Pool): express.Router {
  const router = express.Router();
  const scenarioService = new ScenarioPlanningService(db);
  const forecastingService = new ResourceForecastingService(db);

  // Scenario CRUD Operations
  
  /**
   * @route POST /api/scenarios
   * @desc Create a new scenario
   * @access Private
   */
  router.post('/', async (req, res) => {
    try {
      const scenarioData: CreateScenarioRequest = req.body;
      
      // Validate required fields
      if (!scenarioData.name || !scenarioData.type || !scenarioData.baseDate) {
        return res.status(400).json({
          error: 'Missing required fields: name, type, baseDate'
        });
      }

      const scenario = await scenarioService.createScenario(scenarioData);
      
      res.status(201).json({
        data: scenario,
        message: 'Scenario created successfully'
      });
    } catch (error) {
      console.error('Error creating scenario:', error);
      res.status(500).json({
        error: 'Failed to create scenario',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @route GET /api/scenarios
   * @desc List scenarios with optional filters
   * @access Private
   */
  router.get('/', async (req, res) => {
    try {
      const {
        type,
        status,
        isTemplate,
        page = '1',
        limit = '20'
      } = req.query;

      const filters = {
        type: type as ScenarioType,
        status: status as ScenarioStatus,
        isTemplate: isTemplate ? isTemplate === 'true' : undefined,
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string)
      };

      const result = await scenarioService.listScenarios(filters);
      
      res.json({
        data: result.scenarios,
        pagination: {
          currentPage: parseInt(page as string),
          totalItems: result.total,
          totalPages: Math.ceil(result.total / parseInt(limit as string)),
          limit: parseInt(limit as string)
        }
      });
    } catch (error) {
      console.error('Error listing scenarios:', error);
      res.status(500).json({
        error: 'Failed to list scenarios',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @route GET /api/scenarios/:id
   * @desc Get scenario by ID
   * @access Private
   */
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const scenario = await scenarioService.getScenario(id);
      
      if (!scenario) {
        return res.status(404).json({
          error: 'Scenario not found'
        });
      }

      res.json({
        data: scenario
      });
    } catch (error) {
      console.error('Error getting scenario:', error);
      res.status(500).json({
        error: 'Failed to get scenario',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @route PUT /api/scenarios/:id
   * @desc Update scenario
   * @access Private
   */
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData: UpdateScenarioRequest = { ...req.body, id };
      
      const scenario = await scenarioService.updateScenario(updateData);
      
      res.json({
        data: scenario,
        message: 'Scenario updated successfully'
      });
    } catch (error) {
      console.error('Error updating scenario:', error);
      res.status(500).json({
        error: 'Failed to update scenario',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @route DELETE /api/scenarios/:id
   * @desc Delete scenario
   * @access Private
   */
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await scenarioService.deleteScenario(id);
      
      if (!deleted) {
        return res.status(404).json({
          error: 'Scenario not found'
        });
      }

      res.json({
        message: 'Scenario deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting scenario:', error);
      res.status(500).json({
        error: 'Failed to delete scenario',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @route POST /api/scenarios/:id/duplicate
   * @desc Duplicate scenario with new name
   * @access Private
   */
  router.post('/:id/duplicate', async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({
          error: 'New scenario name is required'
        });
      }

      const duplicatedScenario = await scenarioService.duplicateScenario(id, name);
      
      res.status(201).json({
        data: duplicatedScenario,
        message: 'Scenario duplicated successfully'
      });
    } catch (error) {
      console.error('Error duplicating scenario:', error);
      res.status(500).json({
        error: 'Failed to duplicate scenario',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Scenario Allocation Operations

  /**
   * @route GET /api/scenarios/:id/allocations
   * @desc Get scenario allocations
   * @access Private
   */
  router.get('/:id/allocations', async (req, res) => {
    try {
      const { id } = req.params;
      const { projectId, employeeId, allocationType } = req.query;

      const filters = {
        projectId: projectId as string,
        employeeId: employeeId as string,
        allocationType: allocationType as AllocationType
      };

      const allocations = await scenarioService.getScenarioAllocations(id, filters);
      
      res.json({
        data: allocations
      });
    } catch (error) {
      console.error('Error getting scenario allocations:', error);
      res.status(500).json({
        error: 'Failed to get scenario allocations',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @route POST /api/scenarios/:id/allocations
   * @desc Create scenario allocation
   * @access Private
   */
  router.post('/:id/allocations', async (req, res) => {
    try {
      const { id } = req.params;
      const allocationData: CreateScenarioAllocationRequest = {
        ...req.body,
        scenarioId: id
      };
      
      // Validate required fields
      if (!allocationData.projectId || !allocationData.employeeId) {
        return res.status(400).json({
          error: 'Missing required fields: projectId, employeeId'
        });
      }

      const allocation = await scenarioService.createScenarioAllocation(allocationData);
      
      res.status(201).json({
        data: allocation,
        message: 'Scenario allocation created successfully'
      });
    } catch (error) {
      console.error('Error creating scenario allocation:', error);
      res.status(500).json({
        error: 'Failed to create scenario allocation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @route PUT /api/scenarios/:scenarioId/allocations/:allocationId
   * @desc Update scenario allocation
   * @access Private
   */
  router.put('/:scenarioId/allocations/:allocationId', async (req, res) => {
    try {
      const { allocationId } = req.params;
      const updateData: UpdateScenarioAllocationRequest = {
        ...req.body,
        id: allocationId
      };
      
      const allocation = await scenarioService.updateScenarioAllocation(updateData);
      
      res.json({
        data: allocation,
        message: 'Scenario allocation updated successfully'
      });
    } catch (error) {
      console.error('Error updating scenario allocation:', error);
      res.status(500).json({
        error: 'Failed to update scenario allocation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @route DELETE /api/scenarios/:scenarioId/allocations/:allocationId
   * @desc Delete scenario allocation
   * @access Private
   */
  router.delete('/:scenarioId/allocations/:allocationId', async (req, res) => {
    try {
      const { allocationId } = req.params;
      const deleted = await scenarioService.deleteScenarioAllocation(allocationId);
      
      if (!deleted) {
        return res.status(404).json({
          error: 'Scenario allocation not found'
        });
      }

      res.json({
        message: 'Scenario allocation deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting scenario allocation:', error);
      res.status(500).json({
        error: 'Failed to delete scenario allocation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Scenario Analysis and Comparison

  /**
   * @route GET /api/scenarios/:id/compare/:compareId
   * @desc Compare two scenarios
   * @access Private
   */
  router.get('/:id/compare/:compareId', async (req, res) => {
    try {
      const { id, compareId } = req.params;
      const comparison = await scenarioService.compareScenarios(id, compareId);
      
      res.json({
        data: comparison
      });
    } catch (error) {
      console.error('Error comparing scenarios:', error);
      res.status(500).json({
        error: 'Failed to compare scenarios',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @route GET /api/scenarios/:id/conflicts
   * @desc Detect resource conflicts in scenario
   * @access Private
   */
  router.get('/:id/conflicts', async (req, res) => {
    try {
      const { id } = req.params;
      const conflicts = await scenarioService.detectResourceConflicts(id);
      
      res.json({
        data: conflicts
      });
    } catch (error) {
      console.error('Error detecting resource conflicts:', error);
      res.status(500).json({
        error: 'Failed to detect resource conflicts',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @route GET /api/scenarios/:id/skill-gaps
   * @desc Analyze skill gaps in scenario
   * @access Private
   */
  router.get('/:id/skill-gaps', async (req, res) => {
    try {
      const { id } = req.params;
      const skillGaps = await scenarioService.analyzeSkillGaps(id);
      
      res.json({
        data: skillGaps
      });
    } catch (error) {
      console.error('Error analyzing skill gaps:', error);
      res.status(500).json({
        error: 'Failed to analyze skill gaps',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Forecasting Operations

  /**
   * @route POST /api/scenarios/:id/forecast
   * @desc Generate demand forecast for scenario
   * @access Private
   */
  router.post('/:id/forecast', async (req, res) => {
    try {
      const { id } = req.params;
      const {
        growthRate = 0.1,
        seasonality = true,
        marketTrends = {},
        budgetConstraints,
        hiringTimeline = 45
      } = req.body;

      const parameters = {
        growthRate,
        seasonality,
        marketTrends,
        budgetConstraints,
        hiringTimeline
      };

      const forecast = await forecastingService.generateDemandForecast(id, parameters);
      
      res.json({
        data: forecast,
        message: 'Demand forecast generated successfully'
      });
    } catch (error) {
      console.error('Error generating demand forecast:', error);
      res.status(500).json({
        error: 'Failed to generate demand forecast',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @route GET /api/scenarios/:id/forecast
   * @desc Get forecast data for scenario
   * @access Private
   */
  router.get('/:id/forecast', async (req, res) => {
    try {
      const { id } = req.params;
      const {
        startDate,
        endDate,
        skillCategories,
        positionLevels
      } = req.query;

      const filters = {
        startDate: startDate as string,
        endDate: endDate as string,
        skillCategories: skillCategories ? 
          (skillCategories as string).split(',') : undefined,
        positionLevels: positionLevels ? 
          (positionLevels as string).split(',') : undefined
      };

      const forecast = await forecastingService.getForecastData(id, filters);
      
      res.json({
        data: forecast
      });
    } catch (error) {
      console.error('Error getting forecast data:', error);
      res.status(500).json({
        error: 'Failed to get forecast data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @route POST /api/scenarios/analytics
   * @desc Generate resource analytics across multiple scenarios
   * @access Private
   */
  router.post('/analytics', async (req, res) => {
    try {
      const {
        scenarioIds,
        timeRange = {
          start: new Date().toISOString().split('T')[0],
          end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      } = req.body;

      if (!scenarioIds || !Array.isArray(scenarioIds)) {
        return res.status(400).json({
          error: 'scenarioIds array is required'
        });
      }

      const analytics = await forecastingService.generateResourceAnalytics(
        scenarioIds,
        timeRange
      );
      
      res.json({
        data: analytics
      });
    } catch (error) {
      console.error('Error generating resource analytics:', error);
      res.status(500).json({
        error: 'Failed to generate resource analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @route GET /api/scenarios/:id/hiring-recommendations
   * @desc Get hiring recommendations for scenario
   * @access Private
   */
  router.get('/:id/hiring-recommendations', async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        timeHorizonMonths = '12',
        budgetConstraint
      } = req.query;

      const recommendations = await forecastingService.predictFutureHiring(
        id,
        parseInt(timeHorizonMonths as string),
        budgetConstraint ? parseFloat(budgetConstraint as string) : undefined
      );
      
      res.json({
        data: recommendations
      });
    } catch (error) {
      console.error('Error getting hiring recommendations:', error);
      res.status(500).json({
        error: 'Failed to get hiring recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @route POST /api/scenarios/capacity-analysis
   * @desc Analyze capacity vs demand across scenarios
   * @access Private
   */
  router.post('/capacity-analysis', async (req, res) => {
    try {
      const {
        scenarioIds,
        startDate,
        endDate,
        skillCategories,
        positionLevels
      } = req.body;

      if (!scenarioIds || !Array.isArray(scenarioIds)) {
        return res.status(400).json({
          error: 'scenarioIds array is required'
        });
      }

      const filters = {
        startDate,
        endDate,
        skillCategories,
        positionLevels
      };

      const analysis = await forecastingService.analyzeCapacityVsDemand(
        scenarioIds,
        filters
      );
      
      res.json({
        data: analysis
      });
    } catch (error) {
      console.error('Error analyzing capacity vs demand:', error);
      res.status(500).json({
        error: 'Failed to analyze capacity vs demand',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}