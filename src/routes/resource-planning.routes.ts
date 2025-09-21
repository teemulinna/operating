import { Router, Request, Response } from 'express';
import { CapacityEngineService } from '../services/capacity-engine.service';
import { ResourceAnalyticsService } from '../services/resource-analytics.service';
import { ResourceAssignmentService } from '../services/resource-assignment.service';
import { ProjectService } from '../services/project.service';

const router = Router();

// Initialize services
const resourceAssignmentService = new ResourceAssignmentService();
const projectService = new ProjectService();
const capacityEngine = new CapacityEngineService(resourceAssignmentService, projectService);
import { DatabaseService } from '../database/database.service';
const db = DatabaseService.getInstance();
const analyticsService = new ResourceAnalyticsService(db.getPool());

/**
 * @route GET /api/v1/resource-planning/capacity
 * @description Get capacity data for employees within date range
 * @access Protected
 */
router.get('/capacity', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, employeeIds } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Validate date range
    if (start >= end) {
      return res.status(400).json({
        success: false,
        error: 'startDate must be before endDate'
      });
    }

    let targetEmployeeIds: number[] = [];
    if (employeeIds) {
      if (Array.isArray(employeeIds)) {
        targetEmployeeIds = employeeIds.map(id => parseInt(id as string, 10));
      } else {
        targetEmployeeIds = [parseInt(employeeIds as string, 10)];
      }
    }

    // Get capacity data for all employees or specific employees
    const employees = targetEmployeeIds.length > 0
      ? await resourceAssignmentService.getEmployeesByIds(targetEmployeeIds.map(id => String(id)))
      : await resourceAssignmentService.getAllEmployees();

    const capacityData = await Promise.all(
      employees.map(async (employee: any) => {
        const availability = await capacityEngine.calculateEmployeeAvailability(
          employee.id,
          start,
          end
        );

        return {
          employeeId: employee.id,
          employeeName: employee.name,
          totalCapacity: availability.totalHours,
          allocatedHours: availability.allocatedHours,
          utilization: availability.utilizationRate,
          availableHours: availability.availableHours,
          conflicts: availability.conflicts,
          efficiency: employee.efficiency || 1.0
        };
      })
    );

    return res.json({
      success: true,
      data: {
        period: { startDate: start, endDate: end },
        employees: capacityData,
        summary: {
          totalCapacity: capacityData.reduce((sum, emp) => sum + emp.totalCapacity, 0),
          totalAllocated: capacityData.reduce((sum, emp) => sum + emp.allocatedHours, 0),
          avgUtilization: capacityData.reduce((sum, emp) => sum + emp.utilization, 0) / capacityData.length,
          conflictCount: capacityData.reduce((sum, emp) => sum + emp.conflicts.length, 0)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching capacity data:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch capacity data'
    });
  }
});

/**
 * @route POST /api/v1/resource-planning/optimize
 * @description Get optimization recommendations for resource allocation
 * @access Protected
 */
router.post('/optimize', async (req: Request, res: Response) => {
  try {
    const {
      projectRequirements,
      currentAllocations,
      optimizationGoals = ['efficiency', 'utilization']
    } = req.body;

    if (!projectRequirements && !currentAllocations) {
      return res.status(400).json({
        success: false,
        error: 'Either projectRequirements or currentAllocations is required'
      });
    }

    let optimizationResult;

    if (projectRequirements) {
      // Project-based optimization
      optimizationResult = await capacityEngine.optimizeResourceAllocation(projectRequirements);

      return res.json({
        success: true,
        data: {
          type: 'project_optimization',
          projectId: projectRequirements.projectId,
          recommendations: optimizationResult.recommendations,
          totalCost: optimizationResult.totalCost,
          completionTime: optimizationResult.completionTime,
          feasible: optimizationResult.feasible,
          conflicts: optimizationResult.conflicts,
          efficiency: optimizationResult.efficiency,
          metadata: {
            requiredSkills: projectRequirements.requiredSkills,
            duration: projectRequirements.duration,
            effortHours: projectRequirements.effortHours
          }
        }
      });
    } else {
      // Current allocation optimization
      const allocationOptimization = await analyticsService.optimizeAllocation(currentAllocations);

      return res.json({
        success: true,
        data: {
          type: 'allocation_optimization',
          suggestions: allocationOptimization.suggestions,
          expectedImprovement: allocationOptimization.expectedImprovement,
          riskAssessment: allocationOptimization.riskAssessment,
          implementation: allocationOptimization.implementation,
          goals: optimizationGoals
        }
      });
    }

  } catch (error) {
    console.error('Error generating optimization recommendations:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate optimization recommendations'
    });
  }
});

/**
 * @route GET /api/v1/resource-planning/conflicts
 * @description Get resource allocation conflicts
 * @access Protected
 */
router.get('/conflicts', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, severity } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Get all assignments in the period
    const assignments = await resourceAssignmentService.getAssignmentsInPeriod(startDate as string, endDate as string);

    // Detect conflicts
    const conflicts = await capacityEngine.detectConflicts(assignments);

    // Filter by severity if specified
    let filteredConflicts = conflicts;
    if (severity && ['low', 'medium', 'high'].includes(severity as string)) {
      filteredConflicts = conflicts.filter(conflict => conflict.severity === severity);
    }

    // Group conflicts by employee and add employee details
    const conflictsByEmployee = new Map();
    for (const conflict of filteredConflicts) {
      const affectedAssignments = assignments.filter(a =>
        conflict.assignmentIds.includes(a.id)
      );

      for (const assignment of affectedAssignments) {
        const employeeId = assignment.employeeId;
        if (!conflictsByEmployee.has(employeeId)) {
          const employee = await resourceAssignmentService.getEmployeeById(employeeId);
          conflictsByEmployee.set(employeeId, {
            employee: {
              id: employeeId,
              name: employee.name,
              department: employee.department
            },
            conflicts: [],
            totalOverAllocation: 0
          });
        }

        const employeeConflicts = conflictsByEmployee.get(employeeId);
        employeeConflicts.conflicts.push({
          ...conflict,
          affectedProjects: affectedAssignments.map(a => ({
            projectId: a.projectId,
            projectName: a.projectName,
            allocatedHours: a.allocatedHours,
            period: { startDate: a.startDate, endDate: a.endDate }
          }))
        });
        employeeConflicts.totalOverAllocation += conflict.overAllocationHours;
      }
    }

    return res.json({
      success: true,
      data: {
        period: { startDate: start, endDate: end },
        summary: {
          totalConflicts: filteredConflicts.length,
          affectedEmployees: conflictsByEmployee.size,
          severityBreakdown: {
            high: filteredConflicts.filter(c => c.severity === 'high').length,
            medium: filteredConflicts.filter(c => c.severity === 'medium').length,
            low: filteredConflicts.filter(c => c.severity === 'low').length
          }
        },
        conflictsByEmployee: Array.from(conflictsByEmployee.values()),
        allConflicts: filteredConflicts
      }
    });

  } catch (error) {
    console.error('Error fetching conflicts:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch resource conflicts'
    });
  }
});

/**
 * @route GET /api/v1/resource-planning/forecasts
 * @description Get resource demand forecasts
 * @access Protected
 */
router.get('/forecasts', async (req: Request, res: Response) => {
  try {
    const { 
      periods = 6, 
      includeSeasonality = true, 
      historicalMonths = 12 
    } = req.query;

    const forecastPeriods = parseInt(periods as string, 10);
    const historicalRange = parseInt(historicalMonths as string, 10);

    // Get historical data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - historicalRange);

    const historicalData = await resourceAssignmentService.getHistoricalResourceData(
      startDate.toISOString().split('T')[0], 
      endDate.toISOString().split('T')[0]
    );

    // Generate forecast
    const forecast = await analyticsService.generateForecast(
      historicalData, 
      forecastPeriods
    );

    // Get current utilization for comparison
    const currentUtilizationReport = await analyticsService.generateUtilizationReport(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      new Date()
    );

    res.json({
      success: true,
      data: {
        forecast: {
          predictions: forecast.predictions,
          confidence: forecast.confidence,
          trend: forecast.trend,
          ...(includeSeasonality && forecast.seasonalPattern && {
            seasonalPattern: forecast.seasonalPattern
          })
        },
        historicalContext: {
          dataPoints: historicalData.length,
          periodCovered: { startDate, endDate },
          currentUtilization: currentUtilizationReport.overallUtilization
        },
        recommendations: [
          ...(forecast.trend === 'increasing' ? [{
            type: 'capacity_planning',
            message: 'Resource demand is trending upward. Consider hiring or upskilling.',
            priority: 'medium'
          }] : []),
          ...(forecast.confidence < 0.7 ? [{
            type: 'data_quality',
            message: 'Low forecast confidence. Consider gathering more historical data.',
            priority: 'low'
          }] : []),
          ...(forecast.seasonalPattern ? [{
            type: 'seasonal_planning',
            message: `Seasonal pattern detected. Plan for peak periods: ${forecast.seasonalPattern.peakPeriods.join(', ')}`,
            priority: 'medium'
          }] : [])
        ]
      }
    });

  } catch (error) {
    console.error('Error generating forecasts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate resource forecasts'
    });
  }
});

/**
 * @route GET /api/v1/resource-planning/analytics/utilization
 * @description Get detailed utilization analytics
 * @access Protected
 */
router.get('/analytics/utilization', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, groupBy = 'employee' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const utilizationReport = await analyticsService.generateUtilizationReport(start, end);

    return res.json({
      success: true,
      data: {
        period: { startDate: start, endDate: end },
        summary: {
          overallUtilization: utilizationReport.overallUtilization,
          totalEmployees: utilizationReport.employeeUtilization.length,
          totalProjects: utilizationReport.projectUtilization.length,
          underUtilized: utilizationReport.underUtilized.length,
          overUtilized: utilizationReport.overUtilized.length,
          optimal: utilizationReport.employeeUtilization.length -
                   utilizationReport.underUtilized.length -
                   utilizationReport.overUtilized.length
        },
        ...(groupBy === 'employee' && {
          employeeUtilization: utilizationReport.employeeUtilization,
          underUtilized: utilizationReport.underUtilized,
          overUtilized: utilizationReport.overUtilized
        }),
        ...(groupBy === 'project' && {
          projectUtilization: utilizationReport.projectUtilization
        }),
        trends: utilizationReport.trends
      }
    });

  } catch (error) {
    console.error('Error generating utilization analytics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate utilization analytics'
    });
  }
});

/**
 * @route GET /api/v1/resource-planning/analytics/skills
 * @description Get skill gap analysis
 * @access Protected
 */
router.get('/analytics/skills', async (req: Request, res: Response) => {
  try {
    const { includeTrainingRecommendations = true } = req.query;

    // Get all projects and employees
    const projects = await projectService.getAllProjects();
    const employees = await resourceAssignmentService.getAllEmployees();

    const skillAnalysis = await analyticsService.analyzeSkillGaps(projects, employees);

    res.json({
      success: true,
      data: {
        skillGaps: skillAnalysis.skillGaps,
        criticalMissingSkills: skillAnalysis.criticalMissingSkills,
        recommendations: skillAnalysis.recommendations,
        ...(includeTrainingRecommendations && {
          trainingNeeds: skillAnalysis.trainingNeeds
        }),
        summary: {
          totalSkillsAnalyzed: skillAnalysis.skillGaps.length,
          criticalGaps: skillAnalysis.skillGaps.filter(gap => gap.criticalityScore >= 0.8).length,
          employeesNeedingTraining: skillAnalysis.trainingNeeds.length,
          estimatedTrainingCost: skillAnalysis.trainingNeeds.reduce((sum, need) => sum + need.cost, 0)
        }
      }
    });

  } catch (error) {
    console.error('Error generating skill gap analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate skill gap analysis'
    });
  }
});

export default router;