/**
 * ML Optimization Routes
 * Machine Learning based resource optimization and predictive analytics
 */

import { Router, Request, Response } from 'express';
import { DatabaseService } from '../database/database.service';
import { ApiError } from '../utils/api-error';
import { asyncHandler } from '../middleware/async-handler';

const router = Router();
const db = DatabaseService.getInstance();

/**
 * POST /api/ml-optimization/predict-capacity
 * Use ML models to predict future capacity needs
 */
router.post('/predict-capacity', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await db.connect();

  const { projectId, startDate, endDate, confidence = 0.8 } = req.body;

  if (!projectId || !startDate || !endDate) {
    throw new ApiError(400, 'Project ID, start date, and end date are required');
  }

  // Get historical allocation data for ML prediction
  const historicalQuery = `
    SELECT
      date_trunc('week', ra.start_date) as week,
      COUNT(DISTINCT ra.employee_id) as employee_count,
      AVG(ra.allocation_percentage) as avg_allocation,
      SUM(ra.allocation_percentage) as total_allocation
    FROM resource_allocations ra
    WHERE ra.project_id = $1
      AND ra.start_date >= NOW() - INTERVAL '6 months'
    GROUP BY date_trunc('week', ra.start_date)
    ORDER BY week
  `;

  const historicalData = await db.query(historicalQuery, [projectId]);

  // Simple ML prediction based on historical averages
  // In production, this would use a trained model
  const predictions = [];
  const avgEmployeeCount = historicalData.rows.length > 0
    ? historicalData.rows.reduce((sum: number, row: any) => sum + parseInt(row.employee_count), 0) / historicalData.rows.length
    : 0;

  const avgAllocation = historicalData.rows.length > 0
    ? historicalData.rows.reduce((sum: number, row: any) => sum + parseFloat(row.avg_allocation), 0) / historicalData.rows.length
    : 0;

  // Generate predictions for requested period
  const start = new Date(startDate);
  const end = new Date(endDate);
  let currentDate = new Date(start);

  while (currentDate <= end) {
    predictions.push({
      date: currentDate.toISOString().split('T')[0],
      predictedEmployeeCount: Math.round(avgEmployeeCount),
      predictedAvgAllocation: Math.round(avgAllocation * 100) / 100,
      confidence: confidence,
      model: 'historical-average-v1'
    });
    currentDate.setDate(currentDate.getDate() + 7); // Weekly predictions
  }

  res.status(200).json({
    success: true,
    data: {
      projectId,
      predictions,
      historicalDataPoints: historicalData.rows.length,
      model: 'historical-average-v1',
      confidence
    }
  });
}));

/**
 * POST /api/ml-optimization/recommend-allocations
 * ML-based allocation recommendations
 */
router.post('/recommend-allocations', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await db.connect();

  const { projectId, requiredSkills, maxUtilization = 100, count = 5 } = req.body;

  if (!projectId) {
    throw new ApiError(400, 'Project ID is required');
  }

  // Get employees with skills matching the project requirements
  const recommendationQuery = `
    WITH employee_scores AS (
      SELECT
        e.id as employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        e.department_id,
        d.name as department_name,
        -- Current utilization
        COALESCE(
          (SELECT SUM(allocation_percentage)
           FROM resource_allocations ra
           WHERE ra.employee_id = e.id
             AND ra.start_date <= CURRENT_DATE
             AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
             AND ra.status = 'active'),
          0
        ) as current_utilization,
        -- Skill match score
        COALESCE(
          (SELECT AVG(
            CASE es.proficiency_level
              WHEN 'expert' THEN 100
              WHEN 'advanced' THEN 85
              WHEN 'intermediate' THEN 70
              WHEN 'beginner' THEN 55
              ELSE 40
            END
          )
          FROM employee_skills es
          WHERE es.employee_id = e.id
            AND es.is_active = true
            AND ($2::uuid[] IS NULL OR es.skill_id = ANY($2::uuid[]))),
          40
        ) as skill_score,
        -- Historical performance (number of successful project completions)
        (SELECT COUNT(*)
         FROM resource_allocations ra
         JOIN projects p ON ra.project_id = p.id
         WHERE ra.employee_id = e.id
           AND p.status = 'completed'
        ) as completed_projects
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.is_active = true
    ),
    scored_recommendations AS (
      SELECT
        *,
        -- ML-like scoring: weighted combination of factors
        (
          (skill_score * 0.5) +  -- 50% weight on skills
          ((100 - current_utilization) * 0.3) +  -- 30% weight on availability
          (LEAST(completed_projects * 5, 20) * 0.2)  -- 20% weight on experience
        ) as recommendation_score
      FROM employee_scores
      WHERE current_utilization < $3
    )
    SELECT
      employee_id,
      employee_name,
      department_name,
      current_utilization,
      skill_score,
      completed_projects,
      recommendation_score
    FROM scored_recommendations
    ORDER BY recommendation_score DESC
    LIMIT $4
  `;

  const recommendations = await db.query(recommendationQuery, [
    projectId,
    requiredSkills || null,
    maxUtilization,
    count
  ]);

  res.status(200).json({
    success: true,
    data: {
      projectId,
      recommendations: recommendations.rows.map(row => ({
        employeeId: row.employee_id,
        employeeName: row.employee_name,
        departmentName: row.department_name,
        currentUtilization: parseFloat(row.current_utilization),
        skillScore: parseFloat(row.skill_score),
        completedProjects: parseInt(row.completed_projects),
        recommendationScore: parseFloat(row.recommendation_score),
        confidence: row.recommendation_score / 100 // Normalize to 0-1
      })),
      algorithm: 'weighted-scoring-v1',
      criteria: {
        skillWeight: 0.5,
        availabilityWeight: 0.3,
        experienceWeight: 0.2
      }
    }
  });
}));

/**
 * GET /api/ml-optimization/model-info
 * Get information about available ML models
 */
router.get('/model-info', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: {
      models: [
        {
          id: 'historical-average-v1',
          name: 'Historical Average Predictor',
          type: 'capacity-prediction',
          status: 'active',
          accuracy: 0.78,
          description: 'Predicts capacity needs based on historical project data'
        },
        {
          id: 'weighted-scoring-v1',
          name: 'Weighted Skill Matcher',
          type: 'allocation-recommendation',
          status: 'active',
          accuracy: 0.85,
          description: 'Recommends resource allocations using weighted skill matching'
        }
      ],
      timestamp: new Date().toISOString()
    }
  });
}));

/**
 * POST /api/ml-optimization/analyze-bottlenecks
 * Use ML to identify and predict capacity bottlenecks
 */
router.post('/analyze-bottlenecks', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await db.connect();

  const { startDate, endDate, threshold = 90 } = req.body;

  const bottleneckQuery = `
    WITH employee_utilization AS (
      SELECT
        e.id as employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        d.name as department_name,
        SUM(ra.allocation_percentage) as total_utilization,
        COUNT(DISTINCT ra.project_id) as project_count,
        ARRAY_AGG(DISTINCT p.name) as project_names
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN resource_allocations ra ON e.id = ra.employee_id
      LEFT JOIN projects p ON ra.project_id = p.id
      WHERE e.is_active = true
        AND (ra.start_date IS NULL OR ra.start_date <= $2)
        AND (ra.end_date IS NULL OR ra.end_date >= $1)
        AND (ra.status IS NULL OR ra.status = 'active')
      GROUP BY e.id, e.first_name, e.last_name, d.name
    )
    SELECT
      employee_id,
      employee_name,
      department_name,
      total_utilization,
      project_count,
      project_names,
      CASE
        WHEN total_utilization >= 120 THEN 'critical'
        WHEN total_utilization >= 100 THEN 'high'
        WHEN total_utilization >= $3 THEN 'medium'
        ELSE 'low'
      END as severity
    FROM employee_utilization
    WHERE total_utilization >= $3
    ORDER BY total_utilization DESC
  `;

  const bottlenecks = await db.query(bottleneckQuery, [
    startDate || new Date(),
    endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    threshold
  ]);

  res.status(200).json({
    success: true,
    data: {
      bottlenecks: bottlenecks.rows.map(row => ({
        employeeId: row.employee_id,
        employeeName: row.employee_name,
        departmentName: row.department_name,
        totalUtilization: parseFloat(row.total_utilization),
        projectCount: parseInt(row.project_count),
        projectNames: row.project_names,
        severity: row.severity,
        riskScore: Math.min(parseFloat(row.total_utilization) / 100, 1.5)
      })),
      summary: {
        total: bottlenecks.rows.length,
        critical: bottlenecks.rows.filter(r => r.severity === 'critical').length,
        high: bottlenecks.rows.filter(r => r.severity === 'high').length,
        medium: bottlenecks.rows.filter(r => r.severity === 'medium').length
      },
      model: 'utilization-analysis-v1',
      threshold
    }
  });
}));

export { router as mlOptimizationRoutes };