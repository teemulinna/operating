import { DatabaseService } from '../database/database.service';

// Additional type definitions for better type safety
interface ProjectDetails {
  name: string;
  estimatedHours: number;
  requiredSkills: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate?: string;
  endDate?: string;
  teamSize?: number;
  duration?: number;
}

interface ResourceDetails {
  employeeIds?: string[];
  skills?: string[];
  hoursPerWeek?: number;
  department?: string;
  costPerHour?: number;
  count?: number;
}

interface DemandChangeDetails {
  percentage: number;
  affectedDepartments?: string[];
  affectedSkills?: string[];
  reason?: string;
}

interface BottleneckRow {
  id: number;
  bottleneck_type: 'skill' | 'department' | 'resource' | 'time';
  affected_resource: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact_score: string;
  estimated_duration: number;
  affected_projects?: string;
  root_causes?: string;
  resolution_actions?: string;
  status?: 'active' | 'mitigated' | 'resolved';
}

interface UtilizationDataPoint {
  period: string;
  utilization: number;
  capacity: number;
  demand: number;
}

interface SeasonalityAnalysis {
  hasSeasonality: boolean;
  peakMonths: string[];
  lowMonths: string[];
  seasonalityStrength: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonalFactors: Array<{
    period: string;
    factor: number;
  }>;
  cyclical: boolean;
}

interface AnomalyDetection {
  period: string;
  actualValue: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
}

export interface CapacityIntelligence {
  currentUtilization: {
    overall: number;
    byDepartment: Array<{ department: string; utilization: number; available: number; committed: number }>;
    bySkill: Array<{ skill: string; utilization: number; availableResources: number }>;
  };
  capacityTrends: Array<{
    period: string;
    utilization: number;
    capacity: number;
    demand: number;
  }>;
  bottleneckAnalysis: {
    current: CapacityBottleneck[];
    predicted: CapacityBottleneck[];
    historical: CapacityBottleneck[];
  };
  predictions: CapacityPrediction[];
  recommendations: CapacityRecommendation[];
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    impact: string;
    mitigation: string;
  }>;
}

export interface CapacityPrediction {
  period: string;
  predictedCapacity: number;
  demandForecast: number;
  utilizationRate: number;
  confidence: number;
  scenario: 'optimistic' | 'realistic' | 'pessimistic';
  keyFactors: string[];
}

export interface CapacityBottleneck {
  type: 'skill' | 'department' | 'resource' | 'time';
  affectedResource: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: number; // 0-100
  affectedProjects: number[];
  estimatedDuration: number; // days
  rootCauses: string[];
  recommendedActions: string[];
  status: 'active' | 'mitigated' | 'resolved';
}

export interface CapacityRecommendation {
  type: 'hiring' | 'training' | 'reallocation' | 'process_improvement' | 'tool_adoption';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  expectedImpact: number; // percentage improvement
  implementationCost: number;
  implementationTime: number; // weeks
  affectedDepartments: string[];
  affectedSkills: string[];
  successMetrics: string[];
  roi: number; // Return on Investment percentage
}

export interface ScenarioAnalysis {
  scenarioId: string;
  analysis: {
    capacityImpact: {
      totalCapacityChange: number;
      departmentImpacts: Array<{
        department: string;
        capacityChange: number;
        utilizationChange: number;
      }>;
    };
    bottleneckAnalysis: {
      newBottlenecks: CapacityBottleneck[];
      resolvedBottlenecks: CapacityBottleneck[];
      impactSummary: string;
    };
    recommendations: CapacityRecommendation[];
    riskAssessment: {
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      risks: Array<{
        risk: string;
        probability: number;
        impact: string;
        mitigation: string;
      }>;
    };
  };
}

export interface UtilizationPatterns {
  patterns: {
    peakPeriods: Array<{ period: string; utilizationRate: number }>;
    lowUtilizationPeriods: Array<{ period: string; utilizationRate: number }>;
    averageUtilization: number;
  };
  seasonality: {
    hasSeasonality: boolean;
    peakMonths: string[];
    lowMonths: string[];
    seasonalityStrength: number;
  };
  trends: {
    direction: 'increasing' | 'decreasing' | 'stable';
    rate: number; // percentage change per period
    confidence: number;
  };
  anomalies: Array<{
    period: string;
    actualUtilization: number;
    expectedUtilization: number;
    deviation: number;
    possibleCauses: string[];
  }>;
}

export interface SkillDemandForecast {
  skillDemand: Array<{
    skill: string;
    currentSupply: number;
    forecastedDemand: number;
    gap: number;
    confidence: number;
    trendDirection: 'increasing' | 'decreasing' | 'stable';
  }>;
  skillGaps: Array<{
    skill: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timeToFill: number; // weeks
    businessImpact: string;
  }>;
  hiringRecommendations: Array<{
    skill: string;
    recommendedHires: number;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    justification: string;
  }>;
  trainingRecommendations: Array<{
    skill: string;
    candidateEmployees: number;
    estimatedTime: number; // weeks
    priority: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

export class CapacityIntelligenceService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  async getCapacityIntelligence(filters?: {
    department?: string;
    timeframe?: string;
  }): Promise<CapacityIntelligence> {
    const [
      currentUtilization,
      capacityTrends,
      bottlenecks,
      predictions,
      recommendations
    ] = await Promise.all([
      this.getCurrentUtilization(filters?.department),
      this.getCapacityTrends(filters?.timeframe || 'last_quarter'),
      this.getBottleneckAnalysis(),
      this.getCapacityPredictions(),
      this.getCapacityRecommendations()
    ]);

    const riskFactors = await this.assessRiskFactors();

    return {
      currentUtilization,
      capacityTrends,
      bottleneckAnalysis: bottlenecks,
      predictions,
      recommendations,
      riskFactors
    };
  }

  async getCapacityPredictions(options?: {
    horizon?: string;
    confidence?: number;
    scenarios?: string[];
  }): Promise<CapacityPrediction[]> {
    const horizon = options?.horizon || '6_months';
    const scenarios = options?.scenarios || ['realistic'];
    const predictions: CapacityPrediction[] = [];

    try {
      // First, try to get predictions from database
      const storedPredictionsQuery = `
        SELECT
          prediction_date,
          prediction_horizon,
          predicted_value,
          confidence_level,
          scenario,
          input_factors
        FROM capacity_predictions
        WHERE prediction_date >= CURRENT_DATE - INTERVAL '30 days'
          AND prediction_horizon = $1
          AND expires_at > CURRENT_TIMESTAMP
          AND prediction_type = 'utilization'
        ORDER BY prediction_date DESC, scenario
      `;

      const storedResult = await this.db.query(storedPredictionsQuery, [horizon]);

      if (storedResult.rows.length > 0) {
        // Use stored predictions if available and recent
        return storedResult.rows.map(row => ({
          period: this.formatPredictionPeriod(row.prediction_date, horizon),
          predictedCapacity: parseFloat(row.predicted_value) * 100, // Convert to hours if stored as percentage
          demandForecast: parseFloat(row.predicted_value) * 80, // Estimate demand based on utilization
          utilizationRate: parseFloat(row.predicted_value),
          confidence: parseFloat(row.confidence_level),
          scenario: row.scenario as 'optimistic' | 'realistic' | 'pessimistic',
          keyFactors: row.input_factors ? Object.keys(row.input_factors) : ['Historical data', 'Current trends']
        }));
      }

      // Generate new predictions based on actual data
      const historicalQuery = `
        WITH monthly_capacity AS (
          SELECT
            DATE_TRUNC('month', ra.start_date) as period,
            SUM(e.default_hours * 4) as total_capacity_hours, -- 4 weeks per month
            SUM(ra.allocated_hours / ((ra.end_date - ra.start_date + 1) / 30.0)) as total_demand_hours,
            AVG(ra.allocated_hours / ((ra.end_date - ra.start_date + 1) / 30.0) / (e.default_hours * 4) * 100) as utilization_rate
          FROM resource_allocations ra
          JOIN employees e ON ra.employee_id = e.id
          WHERE ra.is_active = true
            AND ra.start_date >= CURRENT_DATE - INTERVAL '12 months'
            AND e.is_active = true
          GROUP BY DATE_TRUNC('month', ra.start_date)
          ORDER BY period
        ),
        capacity_snapshots AS (
          SELECT
            DATE_TRUNC('month', snapshot_date) as period,
            AVG(overall_utilization) as avg_utilization,
            AVG(available_capacity_hours) as avg_capacity,
            AVG(committed_capacity_hours) as avg_demand
          FROM capacity_metrics_snapshots
          WHERE snapshot_date >= CURRENT_DATE - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', snapshot_date)
        )
        SELECT
          COALESCE(cs.period, mc.period) as period,
          COALESCE(cs.avg_utilization, mc.utilization_rate) as utilization,
          COALESCE(cs.avg_capacity, mc.total_capacity_hours) as capacity,
          COALESCE(cs.avg_demand, mc.total_demand_hours) as demand
        FROM capacity_snapshots cs
        FULL OUTER JOIN monthly_capacity mc ON cs.period = mc.period
        ORDER BY period
      `;

      const historicalData = await this.db.query(historicalQuery);
      const history = historicalData.rows;

      if (history.length === 0) {
        return this.generateDefaultPredictions(scenarios);
      }

      // Calculate trends using linear regression
      const utilizationValues = history.map(h => parseFloat(h.utilization) || 0);
      const capacityValues = history.map(h => parseFloat(h.capacity) || 0);
      const demandValues = history.map(h => parseFloat(h.demand) || 0);

      const utilizationTrend = this.calculateLinearTrend(utilizationValues);
      const capacityTrend = this.calculateLinearTrend(capacityValues);
      const demandTrend = this.calculateLinearTrend(demandValues);

      // Get upcoming project pipeline to adjust demand forecasts
      const pipelineQuery = `
        SELECT
          SUM(p.estimated_hours) as pipeline_hours,
          COUNT(*) as pipeline_projects
        FROM projects p
        WHERE p.status IN ('planning', 'active')
          AND p.start_date >= CURRENT_DATE
          AND p.start_date <= CURRENT_DATE + INTERVAL '$1'
          AND p.is_active = true
      `;

      const pipelineResult = await this.db.query(pipelineQuery.replace('$1', horizon.replace('_', ' ')));
      const pipelineAdjustment = parseFloat(pipelineResult.rows[0]?.pipeline_hours || '0') / 12; // Monthly average

      // Generate predictions for each scenario
      for (const scenario of scenarios) {
        const scenarioMultiplier = this.getScenarioMultiplier(scenario);
        const periodsToPredict = this.getPeriodsCount(horizon);

        for (let i = 1; i <= periodsToPredict; i++) {
          const lastCapacity = capacityValues[capacityValues.length - 1] || 2000;
          const lastDemand = demandValues[demandValues.length - 1] || 1600;
          const lastUtilization = utilizationValues[utilizationValues.length - 1] || 75;

          // Apply trends and scenario multipliers
          const predictedCapacity = Math.max(0, lastCapacity + (capacityTrend * i * scenarioMultiplier));
          const baseDemandForecast = Math.max(0, lastDemand + (demandTrend * i * scenarioMultiplier));
          const demandForecast = baseDemandForecast + (pipelineAdjustment * scenarioMultiplier);
          const utilizationRate = predictedCapacity > 0 ? Math.min(100, (demandForecast / predictedCapacity) * 100) : 0;

          // Calculate confidence based on data quality and prediction distance
          const dataQuality = Math.min(100, (history.length / 12) * 100); // More data = higher confidence
          const distanceDecay = Math.max(30, 95 - (i * 8)); // Confidence decreases over time
          const confidence = Math.min(dataQuality, distanceDecay);

          const keyFactors = [
            'Historical utilization trends',
            'Current project pipeline',
            ...(pipelineAdjustment > 0 ? ['Upcoming project demand'] : []),
            ...(utilizationTrend > 0 ? ['Increasing utilization trend'] : utilizationTrend < 0 ? ['Decreasing utilization trend'] : ['Stable utilization']),
            ...(history.length >= 6 ? ['Seasonal variations'] : [])
          ];

          predictions.push({
            period: this.getPeriodName(i, horizon),
            predictedCapacity: Math.round(predictedCapacity),
            demandForecast: Math.round(demandForecast),
            utilizationRate: Math.round(utilizationRate * 10) / 10, // Round to 1 decimal
            confidence: Math.round(confidence),
            scenario: scenario as any,
            keyFactors
          });
        }
      }

      // Store predictions in database for future use
      await this.storePredictions(predictions, horizon);

      return predictions;
    } catch (error) {
      console.error('Error generating capacity predictions:', error);
      return this.generateDefaultPredictions(scenarios);
    }
  }

  async identifyBottlenecks(severity?: string): Promise<{
    current: CapacityBottleneck[];
    predicted: CapacityBottleneck[];
    historical: CapacityBottleneck[];
  }> {
    try {
      const severityFilter = severity ? `AND severity = $1` : '';
      const params = severity ? [severity] : [];

      // Get stored bottlenecks from database
      const [storedCurrentQuery, storedHistoricalQuery] = await Promise.all([
        // Current bottlenecks from database
        this.db.query(`
          SELECT * FROM capacity_bottlenecks
          WHERE status = 'active' ${severityFilter}
          ORDER BY impact_score DESC
        `, params),

        // Historical bottlenecks (resolved ones for learning)
        this.db.query(`
          SELECT * FROM capacity_bottlenecks
          WHERE status = 'resolved'
          AND resolution_date >= CURRENT_DATE - INTERVAL '6 months' ${severityFilter}
          ORDER BY resolution_date DESC
          LIMIT 10
        `, params)
      ]);

      // Detect current bottlenecks from actual data
      const detectedBottlenecks: CapacityBottleneck[] = await this.detectCurrentBottlenecks();

      // Predict future bottlenecks based on trends
      const predictedBottlenecks: CapacityBottleneck[] = await this.predictFutureBottlenecks();

      // Combine stored and detected current bottlenecks
      const storedCurrent: CapacityBottleneck[] = storedCurrentQuery.rows.map(this.mapBottleneckRow.bind(this));
      const allCurrent = this.mergeBottlenecks(storedCurrent, detectedBottlenecks || []);

      // Apply severity filter to detected bottlenecks if specified
      const filteredCurrent = severity ?
        allCurrent.filter(b => b.severity === severity) : allCurrent;
      const filteredPredicted = severity ?
        predictedBottlenecks.filter(b => b.severity === severity) : predictedBottlenecks;

      return {
        current: filteredCurrent,
        predicted: filteredPredicted,
        historical: storedHistoricalQuery.rows.map(this.mapBottleneckRow.bind(this))
      };
    } catch (error) {
      console.error('Error identifying bottlenecks:', error);
      return {
        current: [],
        predicted: [],
        historical: []
      };
    }
  }

  async runScenarioAnalysis(scenarioData: {
    scenario: {
      name: string;
      description: string;
      changes: Array<{
        type: 'add_project' | 'add_resources' | 'remove_resources' | 'change_demand';
        details: ProjectDetails | ResourceDetails | DemandChangeDetails;
      }>;
    };
    analysisOptions: {
      includeRiskAnalysis: boolean;
      optimizationSuggestions: boolean;
      costImpact: boolean;
    };
  }): Promise<ScenarioAnalysis> {
    const scenarioId = `scenario_${Date.now()}`;

    try {
      // Get current baseline metrics
      const [currentUtilization, currentBottlenecks] = await Promise.all([
        this.getCurrentUtilization(),
        this.identifyBottlenecks()
      ]);

      // Get current capacity metrics for baseline
      const baselineQuery = `
        SELECT
          SUM(COALESCE(e.default_hours, 40)) as total_weekly_capacity,
          COUNT(DISTINCT e.id) as total_employees,
          COUNT(DISTINCT d.id) as departments_count
        FROM employees e
        JOIN departments d ON e.department_id = d.id
        WHERE e.is_active = true
      `;

      const baselineResult = await this.db.query(baselineQuery);
      const baseline = baselineResult.rows[0] || { total_weekly_capacity: 2000, total_employees: 50, departments_count: 5 };

      // Simulate the scenario changes
      let simulatedCapacityChange = 0;
      let simulatedDemandChange = 0;
      const departmentImpacts = new Map<string, { capacityChange: number; utilizationChange: number }>();
      const skillImpacts = new Map<string, number>();

      // Process each change in the scenario
      for (const change of scenarioData.scenario.changes) {
        switch (change.type) {
          case 'add_project': {
            const projectDetails = change.details as ProjectDetails;
            const projectDemand = this.estimateProjectDemand(projectDetails);
            simulatedDemandChange += projectDemand;

            // Track skill demand changes
            if (projectDetails.requiredSkills) {
              projectDetails.requiredSkills.forEach(skill => {
                skillImpacts.set(skill, (skillImpacts.get(skill) || 0) + (projectDetails.teamSize || 1));
              });
            }
            break;
          }
          case 'add_resources': {
            const resourceDetails = change.details as ResourceDetails;
            const resourceCapacity = this.estimateResourceCapacity(resourceDetails);
            simulatedCapacityChange += resourceCapacity;

            // Update department impacts
            if (resourceDetails.department) {
              const deptImpact = departmentImpacts.get(resourceDetails.department) ||
                { capacityChange: 0, utilizationChange: 0 };
              deptImpact.capacityChange += resourceCapacity;
              departmentImpacts.set(resourceDetails.department, deptImpact);
            }
            break;
          }
          case 'remove_resources': {
            const resourceDetails = change.details as ResourceDetails;
            const resourceCapacity = this.estimateResourceCapacity(resourceDetails);
            simulatedCapacityChange -= resourceCapacity;

            if (resourceDetails.department) {
              const deptImpact = departmentImpacts.get(resourceDetails.department) ||
                { capacityChange: 0, utilizationChange: 0 };
              deptImpact.capacityChange -= resourceCapacity;
              departmentImpacts.set(resourceDetails.department, deptImpact);
            }
            break;
          }
          case 'change_demand': {
            const demandDetails = change.details as DemandChangeDetails;
            const currentDemand = parseInt(baseline.total_weekly_capacity) * 0.8; // Assume 80% current utilization
            const demandChange = (currentDemand * demandDetails.percentage) / 100;
            simulatedDemandChange += demandChange;
            break;
          }
        }
      }

      // Calculate utilization impacts by department
      const departmentUtilizationQuery = `
        SELECT
          d.name as department,
          SUM(COALESCE(e.default_hours, 40)) as dept_capacity,
          COALESCE(SUM(ra.allocated_hours), 0) as current_allocated
        FROM departments d
        JOIN employees e ON d.id = e.department_id AND e.is_active = true
        LEFT JOIN resource_allocations ra ON e.id = ra.employee_id
          AND ra.is_active = true
          AND ra.start_date <= CURRENT_DATE
          AND ra.end_date >= CURRENT_DATE
        GROUP BY d.id, d.name
      `;

      const deptUtilizationResult = await this.db.query(departmentUtilizationQuery);

      // Update department impacts with utilization changes
      for (const dept of deptUtilizationResult.rows) {
        const deptName = dept.department;
        let impact = departmentImpacts.get(deptName) || { capacityChange: 0, utilizationChange: 0 };

        const currentCapacity = parseFloat(dept.dept_capacity) || 0;
        const newCapacity = currentCapacity + impact.capacityChange;
        const currentUtilization = currentCapacity > 0 ?
          (parseFloat(dept.current_allocated) / currentCapacity) * 100 : 0;

        // Estimate new utilization (simplified model)
        const demandChangeForDept = simulatedDemandChange * (currentCapacity / parseFloat(baseline.total_weekly_capacity));
        const newDemand = parseFloat(dept.current_allocated) + demandChangeForDept;
        const newUtilization = newCapacity > 0 ? (newDemand / newCapacity) * 100 : 0;

        impact.utilizationChange = newUtilization - currentUtilization;
        departmentImpacts.set(deptName, impact);
      }

      // Calculate new overall utilization
      const currentTotalCapacity = parseFloat(baseline.total_weekly_capacity);
      const newTotalCapacity = currentTotalCapacity + simulatedCapacityChange;
      const currentTotalDemand = currentTotalCapacity * (currentUtilization.overall / 100);
      const newTotalDemand = currentTotalDemand + simulatedDemandChange;
      const newOverallUtilization = newTotalCapacity > 0 ?
        Math.max(0, Math.min(200, (newTotalDemand / newTotalCapacity) * 100)) : 0;

      // Predict new bottlenecks based on scenario
      const newBottlenecks = await this.predictScenarioBottlenecks(
        skillImpacts,
        departmentImpacts,
        newOverallUtilization
      );

      // Identify resolved bottlenecks
      const resolvedBottlenecks = currentBottlenecks.current.filter(currentBottleneck =>
        !newBottlenecks.some(newBottleneck =>
          newBottleneck.type === currentBottleneck.type &&
          newBottleneck.affectedResource === currentBottleneck.affectedResource
        )
      );

      // Generate recommendations
      const recommendations = await this.generateScenarioRecommendations(
        simulatedCapacityChange,
        simulatedDemandChange,
        newOverallUtilization,
        scenarioData.analysisOptions
      );

      // Assess risks if requested
      const riskAssessment = scenarioData.analysisOptions.includeRiskAnalysis ?
        this.assessScenarioRisks(simulatedCapacityChange, simulatedDemandChange, newOverallUtilization) :
        { riskLevel: 'medium' as const, risks: [] };

      // Store scenario analysis for future reference
      await this.storeScenarioAnalysis(scenarioId, scenarioData, {
        capacityChange: simulatedCapacityChange,
        demandChange: simulatedDemandChange,
        utilizationChange: newOverallUtilization - currentUtilization.overall
      });

      return {
        scenarioId,
        analysis: {
          capacityImpact: {
            totalCapacityChange: Math.round(simulatedCapacityChange),
            departmentImpacts: Array.from(departmentImpacts.entries()).map(([dept, impact]) => ({
              department: dept,
              capacityChange: Math.round(impact.capacityChange),
              utilizationChange: Math.round(impact.utilizationChange * 10) / 10
            }))
          },
          bottleneckAnalysis: {
            newBottlenecks,
            resolvedBottlenecks,
            impactSummary: this.generateBottleneckSummary(newBottlenecks, resolvedBottlenecks)
          },
          recommendations,
          riskAssessment
        }
      };
    } catch (error) {
      console.error('Error running scenario analysis:', error);
      throw new Error(`Scenario analysis failed: ${error.message}`);
    }
  }

  async analyzeUtilizationPatterns(options?: {
    period?: string;
    granularity?: string;
  }): Promise<UtilizationPatterns> {
    const period = options?.period || 'last_year';
    const granularity = options?.granularity || 'monthly';

    try {
      // Try to get data from capacity snapshots first
      const snapshotQuery = `
        SELECT
          DATE_TRUNC($1, snapshot_date) as period,
          AVG(overall_utilization) as avg_utilization,
          MAX(overall_utilization) as max_utilization,
          MIN(overall_utilization) as min_utilization,
          AVG(available_capacity_hours) as avg_capacity,
          AVG(committed_capacity_hours) as avg_demand
        FROM capacity_metrics_snapshots
        WHERE snapshot_date >= CURRENT_DATE - INTERVAL '1 year'
        GROUP BY DATE_TRUNC($1, snapshot_date)
        ORDER BY period
      `;

      const periodInterval = period.replace('last_', '');
      let snapshotResult = await this.db.query(snapshotQuery, [granularity]);

      // If no snapshot data, calculate from resource allocations
      if (snapshotResult.rows.length === 0) {
        const calculatedQuery = `
          WITH utilization_data AS (
            SELECT
              DATE_TRUNC($1, ra.start_date) as period,
              SUM(COALESCE(e.default_hours, 40) * CASE
                WHEN $1 = 'weekly' THEN 1
                WHEN $1 = 'monthly' THEN 4
                ELSE 30.0 / 7
              END) as period_capacity,
              SUM(ra.allocated_hours / ((ra.end_date - ra.start_date + 1) / CASE
                WHEN $1 = 'weekly' THEN 7
                WHEN $1 = 'monthly' THEN 30
                ELSE 7
              END)) as period_demand
            FROM resource_allocations ra
            JOIN employees e ON ra.employee_id = e.id
            WHERE ra.is_active = true
              AND ra.start_date >= CURRENT_DATE - INTERVAL '1 year'
              AND e.is_active = true
            GROUP BY DATE_TRUNC($1, ra.start_date)
            ORDER BY period
          )
          SELECT
            period,
            CASE WHEN period_capacity > 0
              THEN ROUND((period_demand / period_capacity * 100)::numeric, 2)
              ELSE 0
            END as avg_utilization,
            ROUND(period_capacity::numeric, 0) as avg_capacity,
            ROUND(period_demand::numeric, 0) as avg_demand
          FROM utilization_data
        `;

        snapshotResult = await this.db.query(calculatedQuery, [granularity]);
      }

      const rawData = snapshotResult.rows;
      const data: UtilizationDataPoint[] = rawData.map(d => ({
        period: this.formatPeriod(d.period),
        utilization: Math.max(0, Math.min(100, parseFloat(d.avg_utilization) || 0)),
        capacity: parseInt(d.avg_capacity) || 0,
        demand: parseInt(d.avg_demand) || 0
      }));

      if (data.length === 0) {
        return this.getDefaultUtilizationPatterns();
      }

      const utilizations = data.map(d => d.utilization).filter(u => !isNaN(u));
      const averageUtilization = utilizations.length > 0 ?
        utilizations.reduce((sum, val) => sum + val, 0) / utilizations.length : 75;

      // Identify peaks and lows (more sophisticated threshold)
      const stdDev = this.calculateStandardDeviation(utilizations);
      const threshold = Math.max(stdDev, averageUtilization * 0.15); // 15% or 1 std dev
      const peakPeriods = data.filter(d => d.utilization > averageUtilization + threshold);
      const lowPeriods = data.filter(d => d.utilization < averageUtilization - threshold);

      // Analyze seasonality
      const seasonality = this.analyzeSeasonality(data);

      // Calculate trends
      const trend = this.calculateUtilizationTrend(utilizations);

      // Identify anomalies
      const anomalies = this.identifyAnomalies(data, averageUtilization, stdDev);

      return {
        patterns: {
          peakPeriods: peakPeriods.map(p => ({
            period: p.period,
            utilizationRate: Math.round(p.utilization * 10) / 10
          })),
          lowUtilizationPeriods: lowPeriods.map(p => ({
            period: p.period,
            utilizationRate: Math.round(p.utilization * 10) / 10
          })),
          averageUtilization: Math.round(averageUtilization * 10) / 10
        },
        seasonality: {
          hasSeasonality: seasonality.hasSeasonality,
          peakMonths: seasonality.peakMonths,
          lowMonths: seasonality.lowMonths,
          seasonalityStrength: Math.round(seasonality.seasonalityStrength * 100) / 100
        },
        trends: trend,
        anomalies
      };
    } catch (error) {
      console.error('Error analyzing utilization patterns:', error);
      return this.getDefaultUtilizationPatterns();
    }
  }

  async forecastSkillDemand(horizon?: string): Promise<SkillDemandForecast> {
    const timeHorizon = horizon || '12_months';

    try {
      // Get current skill supply with proficiency weighting
      const skillSupplyQuery = `
        WITH skill_supply AS (
          SELECT
            s.id as skill_id,
            s.name as skill,
            COUNT(DISTINCT es.employee_id) as current_supply,
            AVG(CASE
              WHEN es.proficiency_level = 'beginner' THEN 1
              WHEN es.proficiency_level = 'intermediate' THEN 2
              WHEN es.proficiency_level = 'advanced' THEN 3
              WHEN es.proficiency_level = 'expert' THEN 4
              ELSE 2
            END) as avg_proficiency_score,
            COUNT(DISTINCT CASE WHEN es.proficiency_level IN ('advanced', 'expert') THEN es.employee_id END) as advanced_supply
          FROM skills s
          LEFT JOIN employee_skills es ON s.id = es.skill_id
          LEFT JOIN employees e ON es.employee_id = e.id AND e.is_active = true
          GROUP BY s.id, s.name
          ORDER BY current_supply DESC, s.name
        )
        SELECT * FROM skill_supply
        WHERE current_supply > 0 OR skill IN (
          SELECT DISTINCT s2.name FROM skills s2
          JOIN skill_requirements sr ON s2.id = sr.skill_id
          JOIN projects p ON sr.project_id = p.id
          WHERE p.status IN ('planning', 'active') AND p.is_active = true
        )
      `;

      const supplyData = await this.db.query(skillSupplyQuery);

      // Analyze current and future project demand
      const demandQuery = `
        WITH skill_demand AS (
          SELECT
            s.id as skill_id,
            s.name as skill_name,
            -- Current active demand
            COUNT(DISTINCT CASE WHEN p.status = 'active' THEN sr.project_id END) as active_projects,
            SUM(CASE WHEN p.status = 'active' THEN sr.required_count ELSE 0 END) as current_demand,
            -- Future planned demand
            COUNT(DISTINCT CASE WHEN p.status = 'planning' THEN sr.project_id END) as planned_projects,
            SUM(CASE WHEN p.status = 'planning' THEN sr.required_count ELSE 0 END) as planned_demand,
            -- Weighted demand based on project priority and timing
            SUM(CASE
              WHEN p.status = 'active' THEN sr.required_count * 1.0
              WHEN p.status = 'planning' AND p.start_date <= CURRENT_DATE + INTERVAL '$1'
                THEN sr.required_count * CASE
                  WHEN p.priority = 'critical' THEN 1.0
                  WHEN p.priority = 'high' THEN 0.8
                  WHEN p.priority = 'medium' THEN 0.6
                  ELSE 0.4
                END
              ELSE 0
            END) as weighted_demand
          FROM skills s
          LEFT JOIN skill_requirements sr ON s.id = sr.skill_id
          LEFT JOIN projects p ON sr.project_id = p.id AND p.is_active = true
          GROUP BY s.id, s.name
        )
        SELECT * FROM skill_demand
        WHERE current_demand > 0 OR planned_demand > 0
        ORDER BY weighted_demand DESC
      `;

      const horizonInterval = timeHorizon.replace('_', ' ');
      const demandData = await this.db.query(demandQuery.replace('$1', horizonInterval));

      // Create skill demand forecast
      const skillDemand = await Promise.all(supplyData.rows.map(async (supply) => {
        const demand = demandData.rows.find(d => d.skill_name === supply.skill) || {
          current_demand: 0,
          planned_demand: 0,
          weighted_demand: 0
        };

        const currentSupply = parseInt(supply.current_supply) || 0;
        const forecastedDemand = Math.round(parseFloat(demand.weighted_demand) || 0);
        const gap = Math.max(0, forecastedDemand - currentSupply);

        // Get trend direction and adjust forecast
        const trendDirection = await this.analyzeDemandTrend(supply.skill);
        const trendMultiplier = trendDirection === 'increasing' ? 1.2 :
          trendDirection === 'decreasing' ? 0.8 : 1.0;

        const adjustedForecast = Math.round(forecastedDemand * trendMultiplier);
        const adjustedGap = Math.max(0, adjustedForecast - currentSupply);

        return {
          skill: supply.skill,
          currentSupply,
          forecastedDemand: adjustedForecast,
          gap: adjustedGap,
          confidence: this.calculateForecastConfidence(supply, demand),
          trendDirection: trendDirection as 'increasing' | 'decreasing' | 'stable'
        };
      }));

      // Generate skill gaps with enhanced analysis
      const skillGaps = skillDemand
        .filter(sd => sd.gap > 0)
        .map(sd => {
          const businessImpact = this.assessBusinessImpact(sd.skill, sd.gap);
          const severity = this.calculateSkillGapSeverity(sd.gap, sd.confidence, businessImpact);

          return {
            skill: sd.skill,
            severity,
            timeToFill: this.estimateTimeToFill(sd.skill, sd.gap),
            businessImpact
          };
        })
        .sort((a, b) => {
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        });

      // Generate hiring recommendations
      const hiringRecommendations = skillGaps
        .filter(sg => sg.severity === 'high' || sg.severity === 'critical')
        .map(sg => {
          const skillData = skillDemand.find(sd => sd.skill === sg.skill);
          const recommendedHires = Math.ceil((skillData?.gap || 0) * 0.8); // Account for training potential

          return {
            skill: sg.skill,
            recommendedHires,
            urgency: sg.severity as 'critical' | 'high',
            justification: `${sg.skill} shortage (gap: ${skillData?.gap}) will impact: ${sg.businessImpact}`
          };
        });

      // Generate training recommendations
      const trainingRecommendations = await Promise.all(skillGaps
        .filter(sg => sg.severity !== 'low') // Only recommend training for medium+ severity
        .map(async (sg) => {
          const candidateCount = await this.findTrainingCandidates(sg.skill);
          const estimatedTime = this.estimateTrainingTime(sg.skill);

          return {
            skill: sg.skill,
            candidateEmployees: candidateCount,
            estimatedTime,
            priority: sg.severity as 'critical' | 'high' | 'medium' | 'low'
          };
        }));

      return {
        skillDemand: skillDemand.sort((a, b) => b.gap - a.gap),
        skillGaps,
        hiringRecommendations,
        trainingRecommendations
      };
    } catch (error) {
      console.error('Error forecasting skill demand:', error);
      return {
        skillDemand: [],
        skillGaps: [],
        hiringRecommendations: [],
        trainingRecommendations: []
      };
    }
  }

  // Private helper methods
  private async getCurrentUtilization(department?: string): Promise<CapacityIntelligence['currentUtilization']> {
    try {
      const deptFilter = department ? `AND d.name = $1` : '';
      const deptParams = department ? [department] : [];

      // Get overall utilization from recent snapshots or calculate from allocations
      const overallQuery = `
        SELECT
          COALESCE(AVG(overall_utilization), 0) as overall_utilization
        FROM capacity_metrics_snapshots
        WHERE snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
      `;

      // Calculate department utilization from actual resource allocations
      const deptQuery = `
        WITH dept_capacity AS (
          SELECT
            d.name as department,
            COUNT(DISTINCT e.id) as employee_count,
            SUM(COALESCE(e.default_hours, 40)) as total_capacity_hours,
            COALESCE(SUM(ra.allocated_hours), 0) as allocated_hours,
            COALESCE(SUM(ra.allocated_hours)::numeric / NULLIF(SUM(COALESCE(e.default_hours, 40)), 0), 0) * 100 as utilization
          FROM departments d
          LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
          LEFT JOIN resource_allocations ra ON e.id = ra.employee_id
            AND ra.is_active = true
            AND ra.start_date <= CURRENT_DATE
            AND ra.end_date >= CURRENT_DATE
          WHERE d.id IS NOT NULL ${deptFilter}
          GROUP BY d.id, d.name
          ORDER BY d.name
        )
        SELECT
          department,
          ROUND(utilization::numeric, 1) as utilization,
          total_capacity_hours as available,
          allocated_hours as committed
        FROM dept_capacity
      `;

      // Calculate skill utilization from resource allocations and skill requirements
      const skillQuery = `
        WITH skill_utilization AS (
          SELECT
            s.name as skill,
            COUNT(DISTINCT es.employee_id) as available_resources,
            COUNT(DISTINCT CASE WHEN ra.is_active = true
              AND ra.start_date <= CURRENT_DATE
              AND ra.end_date >= CURRENT_DATE THEN es.employee_id END) as utilized_resources,
            CASE WHEN COUNT(DISTINCT es.employee_id) > 0
              THEN (COUNT(DISTINCT CASE WHEN ra.is_active = true
                AND ra.start_date <= CURRENT_DATE
                AND ra.end_date >= CURRENT_DATE THEN es.employee_id END) * 100.0) /
                COUNT(DISTINCT es.employee_id)
              ELSE 0
            END as utilization
          FROM skills s
          LEFT JOIN employee_skills es ON s.id = es.skill_id
          LEFT JOIN employees e ON es.employee_id = e.id AND e.is_active = true
          LEFT JOIN resource_allocations ra ON e.id = ra.employee_id
          WHERE s.id IS NOT NULL
          GROUP BY s.id, s.name
          HAVING COUNT(DISTINCT es.employee_id) > 0
          ORDER BY utilization DESC
          LIMIT 10
        )
        SELECT
          skill,
          ROUND(utilization::numeric, 1) as utilization,
          available_resources
        FROM skill_utilization
      `;

      const [overallResult, deptResult, skillResult] = await Promise.all([
        this.db.query(overallQuery),
        this.db.query(deptQuery, deptParams),
        this.db.query(skillQuery)
      ]);

      // If no snapshot data, calculate overall from current allocations
      let overallUtilization = parseFloat(overallResult.rows[0]?.overall_utilization || '0');
      if (overallUtilization === 0 && deptResult.rows.length > 0) {
        const totalCapacity = deptResult.rows.reduce((sum, row) => sum + (parseFloat(row.available) || 0), 0);
        const totalAllocated = deptResult.rows.reduce((sum, row) => sum + (parseFloat(row.committed) || 0), 0);
        overallUtilization = totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0;
      }

      return {
        overall: Math.max(0, Math.min(100, overallUtilization)),
        byDepartment: deptResult.rows.map(row => ({
          department: row.department,
          utilization: Math.max(0, Math.min(100, parseFloat(row.utilization) || 0)),
          available: parseInt(row.available) || 0,
          committed: parseInt(row.committed) || 0
        })),
        bySkill: skillResult.rows.map(row => ({
          skill: row.skill,
          utilization: Math.max(0, Math.min(100, parseFloat(row.utilization) || 0)),
          availableResources: parseInt(row.available_resources) || 0
        }))
      };
    } catch (error) {
      console.error('Error getting current utilization:', error);
      // Return fallback data
      return {
        overall: 75,
        byDepartment: [],
        bySkill: []
      };
    }
  }

  private async getCapacityTrends(timeframe: string): Promise<CapacityIntelligence['capacityTrends']> {
    const periods = this.generateTimeframePeriods(timeframe);

    try {
      // First try to get trends from capacity snapshots
      const snapshotQuery = `
        SELECT
          TO_CHAR(snapshot_date, 'YYYY-MM') as period,
          AVG(overall_utilization) as utilization,
          AVG(available_capacity_hours) as capacity,
          AVG(committed_capacity_hours) as demand
        FROM capacity_metrics_snapshots
        WHERE snapshot_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', snapshot_date)
        ORDER BY period
      `;

      const snapshotResult = await this.db.query(snapshotQuery);

      // If we have snapshot data, use it
      if (snapshotResult.rows.length > 0) {
        const dbTrends = snapshotResult.rows;

        return periods.map((period) => {
          const dbTrend = dbTrends.find(t => t.period === period);
          if (dbTrend) {
            return {
              period,
              utilization: Math.max(0, Math.min(100, parseFloat(dbTrend.utilization) || 0)),
              capacity: parseInt(dbTrend.capacity) || 0,
              demand: parseInt(dbTrend.demand) || 0
            };
          }

          // Interpolate missing periods
          const avgUtil = dbTrends.reduce((sum, t) => sum + parseFloat(t.utilization), 0) / dbTrends.length;
          const avgCapacity = dbTrends.reduce((sum, t) => sum + parseInt(t.capacity), 0) / dbTrends.length;
          const avgDemand = dbTrends.reduce((sum, t) => sum + parseInt(t.demand), 0) / dbTrends.length;

          return {
            period,
            utilization: Math.max(0, Math.min(100, avgUtil)),
            capacity: Math.max(0, avgCapacity),
            demand: Math.max(0, avgDemand)
          };
        });
      }

      // Fallback: calculate from resource allocations
      const calculatedQuery = `
        WITH monthly_metrics AS (
          SELECT
            TO_CHAR(DATE_TRUNC('month', allocation_month), 'YYYY-MM') as period,
            SUM(COALESCE(e.default_hours, 40) * 4) as monthly_capacity, -- 4 weeks per month
            SUM(CASE
              WHEN ra.start_date <= allocation_month AND ra.end_date >= allocation_month
              THEN ra.allocated_hours / ((ra.end_date - ra.start_date + 1) / 30.0) -- Monthly allocation
              ELSE 0
            END) as monthly_demand
          FROM (
            SELECT generate_series(
              DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months'),
              DATE_TRUNC('month', CURRENT_DATE),
              '1 month'::interval
            )::date as allocation_month
          ) months
          CROSS JOIN employees e
          LEFT JOIN resource_allocations ra ON e.id = ra.employee_id
            AND ra.is_active = true
            AND ra.start_date <= (months.allocation_month + INTERVAL '1 month' - INTERVAL '1 day')::date
            AND ra.end_date >= months.allocation_month
          WHERE e.is_active = true
          GROUP BY DATE_TRUNC('month', allocation_month)
          ORDER BY period
        )
        SELECT
          period,
          CASE WHEN monthly_capacity > 0
            THEN ROUND((monthly_demand / monthly_capacity * 100)::numeric, 1)
            ELSE 0
          END as utilization,
          ROUND(monthly_capacity::numeric, 0) as capacity,
          ROUND(monthly_demand::numeric, 0) as demand
        FROM monthly_metrics
      `;

      const result = await this.db.query(calculatedQuery);
      const dbTrends = result.rows;

      return periods.map((period) => {
        const dbTrend = dbTrends.find(t => t.period === period);
        if (dbTrend) {
          return {
            period,
            utilization: Math.max(0, Math.min(100, parseFloat(dbTrend.utilization) || 0)),
            capacity: parseInt(dbTrend.capacity) || 0,
            demand: parseInt(dbTrend.demand) || 0
          };
        }

        // Use average if no specific data
        const avgUtil = dbTrends.length > 0 ?
          dbTrends.reduce((sum, t) => sum + parseFloat(t.utilization), 0) / dbTrends.length : 75;
        const avgCapacity = dbTrends.length > 0 ?
          dbTrends.reduce((sum, t) => sum + parseInt(t.capacity), 0) / dbTrends.length : 2000;

        return {
          period,
          utilization: Math.max(0, Math.min(100, avgUtil)),
          capacity: Math.max(0, avgCapacity),
          demand: Math.max(0, avgCapacity * 0.8)
        };
      });
    } catch (error) {
      console.error('Error getting capacity trends:', error);
      // Fallback to estimated values
      return periods.map((period, index) => ({
        period,
        utilization: 75 + (Math.random() - 0.5) * 20, // Some variance around 75%
        capacity: 2000 + index * 50,
        demand: 1500 + index * 40
      }));
    }
  }

  private async getBottleneckAnalysis(): Promise<CapacityIntelligence['bottleneckAnalysis']> {
    return this.identifyBottlenecks();
  }

  private async getCapacityRecommendations(): Promise<CapacityRecommendation[]> {
    // Placeholder implementation
    return [
      {
        type: 'hiring',
        priority: 'high',
        description: 'Hire 2 senior React developers to address frontend capacity shortage',
        expectedImpact: 15,
        implementationCost: 200000,
        implementationTime: 12,
        affectedDepartments: ['Engineering'],
        affectedSkills: ['React', 'JavaScript'],
        successMetrics: ['Reduced React bottlenecks', 'Improved delivery velocity'],
        roi: 25
      }
    ];
  }

  private async assessRiskFactors(): Promise<CapacityIntelligence['riskFactors']> {
    return [
      {
        factor: 'Key person dependency',
        severity: 'high',
        impact: 'Senior developers leaving could create critical gaps',
        mitigation: 'Cross-train junior developers and document key processes'
      }
    ];
  }

  private mapBottleneckRow(row: BottleneckRow): CapacityBottleneck {
    return {
      type: row.bottleneck_type,
      affectedResource: row.affected_resource,
      severity: row.severity,
      impact: parseFloat(row.impact_score),
      affectedProjects: row.affected_projects ? this.safeJsonParse(row.affected_projects, []) : [],
      estimatedDuration: row.estimated_duration,
      rootCauses: row.root_causes ? this.safeJsonParse(row.root_causes, []) : [],
      recommendedActions: row.resolution_actions ? this.safeJsonParse(row.resolution_actions, []) : [],
      status: row.status || 'active'
    };
  }

  private safeJsonParse(jsonString: string | any, defaultValue: any = null): any {
    if (typeof jsonString !== 'string') {
      return jsonString || defaultValue;
    }
    try {
      return JSON.parse(jsonString);
    } catch {
      return defaultValue;
    }
  }

  private async detectCurrentBottlenecks(): Promise<CapacityBottleneck[]> {
    const bottlenecks: CapacityBottleneck[] = [];

    try {
      // Detect skill bottlenecks
      const skillBottlenecksQuery = `
        WITH skill_demand AS (
          SELECT
            s.name as skill_name,
            COUNT(DISTINCT sr.project_id) as demanding_projects,
            SUM(sr.required_count) as total_demand,
            COUNT(DISTINCT es.employee_id) as available_resources,
            CASE
              WHEN COUNT(DISTINCT es.employee_id) = 0 THEN 100
              ELSE GREATEST(0, 100 - (COUNT(DISTINCT es.employee_id) * 100.0 / NULLIF(SUM(sr.required_count), 0)))
            END as shortage_severity
          FROM skills s
          LEFT JOIN skill_requirements sr ON s.id = sr.skill_id
          LEFT JOIN projects p ON sr.project_id = p.id AND p.status IN ('active', 'planning') AND p.is_active = true
          LEFT JOIN employee_skills es ON s.id = es.skill_id
          LEFT JOIN employees e ON es.employee_id = e.id AND e.is_active = true
          WHERE sr.skill_id IS NOT NULL
          GROUP BY s.id, s.name
          HAVING SUM(sr.required_count) > COUNT(DISTINCT es.employee_id)
          ORDER BY shortage_severity DESC
        )
        SELECT * FROM skill_demand WHERE shortage_severity > 20
      `;

      const skillResult = await this.db.query(skillBottlenecksQuery);

      for (const row of skillResult.rows) {
        const severity = this.calculateSeverity(parseFloat(row.shortage_severity));
        bottlenecks.push({
          type: 'skill',
          affectedResource: row.skill_name,
          severity,
          impact: Math.round(parseFloat(row.shortage_severity)),
          affectedProjects: [], // Could be populated from demanding_projects
          estimatedDuration: this.estimateBottleneckDuration(severity, 'skill'),
          rootCauses: [
            `Demand: ${row.total_demand} resources needed`,
            `Supply: ${row.available_resources} resources available`,
            `Shortage: ${Math.round(parseFloat(row.shortage_severity))}%`
          ],
          recommendedActions: this.generateSkillBottleneckActions(row.skill_name, severity),
          status: 'active'
        });
      }

      // Detect department bottlenecks (over-utilization)
      const departmentBottlenecksQuery = `
        WITH dept_utilization AS (
          SELECT
            d.name as department_name,
            COUNT(DISTINCT e.id) as employee_count,
            SUM(e.default_hours) as total_capacity_hours,
            COALESCE(SUM(ra.allocated_hours), 0) as allocated_hours,
            CASE
              WHEN SUM(e.default_hours) > 0
              THEN (COALESCE(SUM(ra.allocated_hours), 0) / SUM(e.default_hours)) * 100
              ELSE 0
            END as utilization_rate
          FROM departments d
          JOIN employees e ON d.id = e.department_id AND e.is_active = true
          LEFT JOIN resource_allocations ra ON e.id = ra.employee_id
            AND ra.is_active = true
            AND ra.start_date <= CURRENT_DATE
            AND ra.end_date >= CURRENT_DATE
          GROUP BY d.id, d.name
          HAVING COUNT(DISTINCT e.id) > 0
        )
        SELECT * FROM dept_utilization WHERE utilization_rate > 85
      `;

      const deptResult = await this.db.query(departmentBottlenecksQuery);

      for (const row of deptResult.rows) {
        const utilizationRate = parseFloat(row.utilization_rate);
        const severity = this.calculateUtilizationSeverity(utilizationRate);

        bottlenecks.push({
          type: 'department',
          affectedResource: row.department_name,
          severity,
          impact: Math.round(Math.min(100, utilizationRate)),
          affectedProjects: [],
          estimatedDuration: this.estimateBottleneckDuration(severity, 'department'),
          rootCauses: [
            `Utilization rate: ${Math.round(utilizationRate)}%`,
            `${row.employee_count} employees in department`,
            `${Math.round(parseFloat(row.allocated_hours))} hours allocated`
          ],
          recommendedActions: this.generateDepartmentBottleneckActions(row.department_name, severity),
          status: 'active'
        });
      }

      return bottlenecks;
    } catch (error) {
      console.error('Error detecting current bottlenecks:', error);
      return [];
    }
  }

  private async predictFutureBottlenecks(): Promise<CapacityBottleneck[]> {
    const bottlenecks: CapacityBottleneck[] = [];

    try {
      // Predict bottlenecks from upcoming project pipeline
      const pipelineBottlenecksQuery = `
        WITH upcoming_demand AS (
          SELECT
            s.name as skill_name,
            SUM(sr.required_count) as upcoming_demand,
            COUNT(DISTINCT es.employee_id) as current_supply,
            COUNT(DISTINCT p.id) as demanding_projects
          FROM projects p
          JOIN skill_requirements sr ON p.id = sr.project_id
          JOIN skills s ON sr.skill_id = s.id
          LEFT JOIN employee_skills es ON s.id = es.skill_id
          LEFT JOIN employees e ON es.employee_id = e.id AND e.is_active = true
          WHERE p.status = 'planning'
            AND p.start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 months'
            AND p.is_active = true
          GROUP BY s.id, s.name
          HAVING SUM(sr.required_count) > COUNT(DISTINCT es.employee_id) * 0.8 -- Predict 80% utilization threshold
        )
        SELECT * FROM upcoming_demand
      `;

      const pipelineResult = await this.db.query(pipelineBottlenecksQuery);

      for (const row of pipelineResult.rows) {
        const gap = parseInt(row.upcoming_demand) - parseInt(row.current_supply);
        const severity = gap > 5 ? 'critical' : gap > 3 ? 'high' : gap > 1 ? 'medium' : 'low';

        bottlenecks.push({
          type: 'skill',
          affectedResource: row.skill_name,
          severity: severity as any,
          impact: Math.min(100, (gap / parseInt(row.current_supply)) * 100),
          affectedProjects: [],
          estimatedDuration: 90, // 3 months ahead prediction
          rootCauses: [
            `Upcoming demand: ${row.upcoming_demand} resources`,
            `Current supply: ${row.current_supply} resources`,
            `Gap: ${gap} resources`,
            `${row.demanding_projects} projects starting soon`
          ],
          recommendedActions: [
            'Plan hiring for this skill',
            'Identify training candidates',
            'Consider external contractors',
            'Review project timelines'
          ],
          status: 'active'
        });
      }

      return bottlenecks;
    } catch (error) {
      console.error('Error predicting future bottlenecks:', error);
      return [];
    }
  }

  private mergeBottlenecks(stored: CapacityBottleneck[], detected: CapacityBottleneck[]): CapacityBottleneck[] {
    const merged = [...stored];

    for (const detected_bottleneck of detected) {
      const existing = merged.find(b =>
        b.type === detected_bottleneck.type &&
        b.affectedResource === detected_bottleneck.affectedResource
      );

      if (!existing) {
        merged.push(detected_bottleneck);
      } else {
        // Update existing with latest detected data
        existing.impact = Math.max(existing.impact, detected_bottleneck.impact);
        existing.severity = this.getHigherSeverity(existing.severity, detected_bottleneck.severity);
        existing.rootCauses = [...new Set([...existing.rootCauses, ...detected_bottleneck.rootCauses])];
      }
    }

    return merged.sort((a, b) => b.impact - a.impact);
  }

  private calculateSeverity(shortage: number): 'low' | 'medium' | 'high' | 'critical' {
    if (shortage >= 80) return 'critical';
    if (shortage >= 60) return 'high';
    if (shortage >= 30) return 'medium';
    return 'low';
  }

  private calculateUtilizationSeverity(utilization: number): 'low' | 'medium' | 'high' | 'critical' {
    if (utilization >= 100) return 'critical';
    if (utilization >= 95) return 'high';
    if (utilization >= 85) return 'medium';
    return 'low';
  }

  private estimateBottleneckDuration(severity: string, type: string): number {
    const baseDays = type === 'skill' ? 60 : 30;
    const multiplier = severity === 'critical' ? 2 : severity === 'high' ? 1.5 : 1;
    return Math.round(baseDays * multiplier);
  }

  private generateSkillBottleneckActions(skill: string, severity: string): string[] {
    const actions = [
      `Hire experienced ${skill} professionals`,
      `Train existing employees in ${skill}`,
      `Consider external contractors for ${skill}`
    ];

    if (severity === 'critical') {
      actions.unshift(`URGENT: Find immediate ${skill} resources`);
    }

    return actions;
  }

  private generateDepartmentBottleneckActions(department: string, severity: string): string[] {
    const actions = [
      `Review workload distribution in ${department}`,
      `Consider temporary resource reallocation`,
      `Evaluate project priorities and timelines`
    ];

    if (severity === 'critical') {
      actions.unshift(`URGENT: Reduce ${department} workload immediately`);
    }

    return actions;
  }

  private getHigherSeverity(a: string, b: string): 'low' | 'medium' | 'high' | 'critical' {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 };
    const aLevel = levels[a as keyof typeof levels] || 1;
    const bLevel = levels[b as keyof typeof levels] || 1;
    const maxLevel = Math.max(aLevel, bLevel);

    return Object.keys(levels).find(key => levels[key as keyof typeof levels] === maxLevel) as any || 'low';
  }

  // Additional helper methods would be implemented here
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    const first = values[0];
    const last = values[values.length - 1];
    return (last - first) / values.length;
  }

  private calculateLinearTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    const yValues = values;

    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return isNaN(slope) ? 0 : slope;
  }

  private formatPredictionPeriod(date: Date, horizon: string): string {
    const d = new Date(date);
    return d.toISOString().slice(0, 7); // YYYY-MM format
  }

  private async storePredictions(predictions: CapacityPrediction[], horizon: string): Promise<void> {
    try {
      const insertQuery = `
        INSERT INTO capacity_predictions (
          prediction_date, prediction_horizon, prediction_type,
          predicted_value, confidence_level, scenario,
          input_factors, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      for (const prediction of predictions) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // Predictions expire in 30 days

        await this.db.query(insertQuery, [
          new Date(),
          horizon,
          'utilization',
          prediction.utilizationRate,
          prediction.confidence,
          prediction.scenario,
          JSON.stringify({ keyFactors: prediction.keyFactors }),
          expiresAt
        ]);
      }
    } catch (error) {
      console.error('Error storing predictions:', error);
      // Non-critical error, continue execution
    }
  }

  private getScenarioMultiplier(scenario: string): number {
    switch (scenario) {
      case 'optimistic': return 0.8;
      case 'pessimistic': return 1.2;
      default: return 1.0;
    }
  }

  private getPeriodsCount(horizon: string): number {
    switch (horizon) {
      case 'next_month': return 1;
      case 'next_quarter': return 3;
      case '6_months': return 6;
      case 'next_year': return 12;
      default: return 6;
    }
  }

  private getPeriodName(index: number, horizon: string): string {
    const now = new Date();
    const future = new Date(now.getFullYear(), now.getMonth() + index, 1);
    return future.toISOString().slice(0, 7); // YYYY-MM format
  }

  private generateDefaultPredictions(scenarios: string[]): CapacityPrediction[] {
    const now = new Date();
    const predictions: CapacityPrediction[] = [];

    for (const scenario of scenarios) {
      const scenarioMultiplier = this.getScenarioMultiplier(scenario);
      const periodsCount = 6; // Default 6 months

      for (let i = 1; i <= periodsCount; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const baseCapacity = 2000;
        const baseDemand = 1600;

        predictions.push({
          period: date.toISOString().slice(0, 7), // YYYY-MM format
          predictedCapacity: Math.round(baseCapacity * scenarioMultiplier),
          demandForecast: Math.round(baseDemand * scenarioMultiplier),
          utilizationRate: Math.round((baseDemand / baseCapacity) * 100 * scenarioMultiplier),
          confidence: Math.max(30, 70 - (i * 5)), // Lower confidence for defaults
          scenario: scenario as any,
          keyFactors: ['Limited historical data', 'Industry trends', 'Estimated baseline']
        });
      }
    }

    return predictions;
  }

  private generateTimeframePeriods(timeframe: string): string[] {
    // Generate period labels based on timeframe
    const periods = [];
    const now = new Date();
    const monthsBack = timeframe === 'last_quarter' ? 3 : 6;
    
    for (let i = monthsBack; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periods.push(date.toISOString().slice(0, 7));
    }
    
    return periods;
  }

  private estimateProjectDemand(projectDetails: ProjectDetails): number {
    return (projectDetails.teamSize || 1) * (projectDetails.duration || 1) * 160; // Default estimate
  }

  private estimateResourceCapacity(resourceDetails: ResourceDetails): number {
    return (resourceDetails.count || 1) * 160 * 4; // Default monthly capacity
  }

  private async predictScenarioBottlenecks(
    skillImpacts: Map<string, number>,
    departmentImpacts: Map<string, { capacityChange: number; utilizationChange: number }>,
    newOverallUtilization: number
  ): Promise<CapacityBottleneck[]> {
    const bottlenecks: CapacityBottleneck[] = [];

    try {
      // Check for skill bottlenecks
      for (const [skill, additionalDemand] of skillImpacts.entries()) {
        const skillSupplyQuery = `
          SELECT COUNT(DISTINCT es.employee_id) as current_supply
          FROM employee_skills es
          JOIN employees e ON es.employee_id = e.id
          JOIN skills s ON es.skill_id = s.id
          WHERE s.name = $1 AND e.is_active = true
            AND es.proficiency_level IN ('intermediate', 'advanced', 'expert')
        `;

        const supplyResult = await this.db.query(skillSupplyQuery, [skill]);
        const currentSupply = parseInt(supplyResult.rows[0]?.current_supply) || 0;

        if (additionalDemand > currentSupply * 0.8) { // If demand > 80% of supply
          const severity = additionalDemand > currentSupply ? 'critical' :
            additionalDemand > currentSupply * 0.9 ? 'high' : 'medium';

          bottlenecks.push({
            type: 'skill',
            affectedResource: skill,
            severity: severity as any,
            impact: Math.min(100, (additionalDemand / Math.max(1, currentSupply)) * 100),
            affectedProjects: [],
            estimatedDuration: severity === 'critical' ? 90 : 60,
            rootCauses: [
              `Additional demand: ${additionalDemand} resources`,
              `Current supply: ${currentSupply} resources`,
              'Scenario increases skill demand beyond available capacity'
            ],
            recommendedActions: [
              `Hire ${skill} specialists`,
              `Train existing staff in ${skill}`,
              'Consider external contractors',
              'Adjust project timelines'
            ],
            status: 'active'
          });
        }
      }

      // Check for department bottlenecks
      for (const [department, impact] of departmentImpacts.entries()) {
        const newUtilization = 85 + impact.utilizationChange; // Assume base 85% utilization

        if (newUtilization > 95) {
          const severity = newUtilization > 110 ? 'critical' :
            newUtilization > 100 ? 'high' : 'medium';

          bottlenecks.push({
            type: 'department',
            affectedResource: department,
            severity: severity as any,
            impact: Math.min(100, newUtilization),
            affectedProjects: [],
            estimatedDuration: 45,
            rootCauses: [
              `Projected utilization: ${Math.round(newUtilization)}%`,
              `Capacity change: ${Math.round(impact.capacityChange)} hours`,
              'Scenario creates unsustainable workload'
            ],
            recommendedActions: [
              `Add resources to ${department}`,
              'Redistribute workload',
              'Review project priorities',
              'Consider temporary assistance'
            ],
            status: 'active'
          });
        }
      }

      // Check overall capacity bottleneck
      if (newOverallUtilization > 95) {
        const severity = newOverallUtilization > 110 ? 'critical' :
          newOverallUtilization > 100 ? 'high' : 'medium';

        bottlenecks.push({
          type: 'resource',
          affectedResource: 'Overall organizational capacity',
          severity: severity as any,
          impact: Math.min(100, newOverallUtilization),
          affectedProjects: [],
          estimatedDuration: severity === 'critical' ? 120 : 90,
          rootCauses: [
            `Projected overall utilization: ${Math.round(newOverallUtilization)}%`,
            'Scenario exceeds organizational capacity limits',
            'Risk of widespread burnout and quality issues'
          ],
          recommendedActions: [
            'Expand organizational capacity',
            'Prioritize and postpone lower-priority projects',
            'Implement efficiency improvements',
            'Consider strategic partnerships'
          ],
          status: 'active'
        });
      }

      return bottlenecks.sort((a, b) => b.impact - a.impact);
    } catch (error) {
      console.error('Error predicting scenario bottlenecks:', error);
      return [];
    }
  }

  private async generateScenarioRecommendations(
    capacityChange: number,
    demandChange: number,
    newUtilization: number,
    options: { includeRiskAnalysis: boolean; optimizationSuggestions: boolean; costImpact: boolean }
  ): Promise<CapacityRecommendation[]> {
    const recommendations: CapacityRecommendation[] = [];

    // High utilization recommendations
    if (newUtilization > 95) {
      recommendations.push({
        type: 'hiring',
        priority: 'critical',
        description: 'Urgent capacity expansion required to prevent organizational overload',
        expectedImpact: 25,
        implementationCost: options.costImpact ? 200000 : 0,
        implementationTime: 8,
        affectedDepartments: ['All departments'],
        affectedSkills: ['Critical skills in high demand'],
        successMetrics: ['Utilization reduced below 90%', 'Eliminated critical bottlenecks'],
        roi: options.costImpact ? 35 : 0
      });
    } else if (newUtilization > 85) {
      recommendations.push({
        type: 'hiring',
        priority: 'high',
        description: 'Increase capacity to handle elevated demand sustainably',
        expectedImpact: 15,
        implementationCost: options.costImpact ? 150000 : 0,
        implementationTime: 12,
        affectedDepartments: ['High-impact departments'],
        affectedSkills: ['In-demand technical skills'],
        successMetrics: ['Improved delivery predictability', 'Reduced overtime'],
        roi: options.costImpact ? 25 : 0
      });
    }

    // Process optimization recommendations
    if (options.optimizationSuggestions && demandChange > 0) {
      recommendations.push({
        type: 'process_improvement',
        priority: 'medium',
        description: 'Implement automation and process improvements to increase effective capacity',
        expectedImpact: 12,
        implementationCost: options.costImpact ? 50000 : 0,
        implementationTime: 16,
        affectedDepartments: ['Operations', 'Engineering'],
        affectedSkills: ['Process optimization', 'Automation'],
        successMetrics: ['20% reduction in manual tasks', 'Improved throughput'],
        roi: options.costImpact ? 40 : 0
      });
    }

    // Training recommendations for capacity building
    if (capacityChange < demandChange * 0.8) {
      recommendations.push({
        type: 'training',
        priority: 'medium',
        description: 'Cross-train existing employees to increase flexibility and reduce skill bottlenecks',
        expectedImpact: 18,
        implementationCost: options.costImpact ? 30000 : 0,
        implementationTime: 20,
        affectedDepartments: ['All departments'],
        affectedSkills: ['Cross-functional skills', 'Emerging technologies'],
        successMetrics: ['Increased skill versatility', 'Reduced single points of failure'],
        roi: options.costImpact ? 60 : 0
      });
    }

    // Reallocation recommendations for immediate relief
    if (newUtilization > 90) {
      recommendations.push({
        type: 'reallocation',
        priority: 'high',
        description: 'Temporarily reallocate resources from lower-priority projects',
        expectedImpact: 10,
        implementationCost: options.costImpact ? 5000 : 0,
        implementationTime: 2,
        affectedDepartments: ['Project management', 'Resource planning'],
        affectedSkills: ['Resource management', 'Project prioritization'],
        successMetrics: ['Immediate capacity relief', 'Maintained critical project timelines'],
        roi: options.costImpact ? 200 : 0
      });
    }

    // Tool adoption for efficiency gains
    if (options.optimizationSuggestions) {
      recommendations.push({
        type: 'tool_adoption',
        priority: 'low',
        description: 'Adopt productivity tools and technologies to enhance individual and team efficiency',
        expectedImpact: 8,
        implementationCost: options.costImpact ? 25000 : 0,
        implementationTime: 12,
        affectedDepartments: ['Engineering', 'Design', 'Marketing'],
        affectedSkills: ['Tool proficiency', 'Digital workflows'],
        successMetrics: ['Reduced task completion time', 'Improved collaboration'],
        roi: options.costImpact ? 45 : 0
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private assessScenarioRisks(capacityChange: number, demandChange: number, utilization: number) {
    const riskLevel = utilization > 95 ? 'critical' : utilization > 85 ? 'high' : 'medium';
    
    return {
      riskLevel: riskLevel as 'critical' | 'high' | 'medium',
      risks: [
        {
          risk: 'Resource overutilization',
          probability: utilization / 100,
          impact: 'Decreased quality and employee burnout',
          mitigation: 'Hire additional staff or reduce scope'
        }
      ]
    };
  }

  private generateBottleneckSummary(newBottlenecks: CapacityBottleneck[], resolvedBottlenecks: CapacityBottleneck[] = []): string {
    if (newBottlenecks.length === 0 && resolvedBottlenecks.length === 0) {
      return 'No significant bottlenecks identified. Scenario maintains healthy capacity levels.';
    }

    const newCritical = newBottlenecks.filter(b => b.severity === 'critical').length;
    const newHigh = newBottlenecks.filter(b => b.severity === 'high').length;
    const newMedium = newBottlenecks.filter(b => b.severity === 'medium').length;

    let summary = '';

    if (newBottlenecks.length > 0) {
      summary += `${newBottlenecks.length} new bottleneck(s) identified`;
      if (newCritical > 0 || newHigh > 0) {
        summary += ` (${newCritical} critical, ${newHigh} high severity)`;
      }
    }

    if (resolvedBottlenecks.length > 0) {
      if (summary) summary += '. ';
      summary += `${resolvedBottlenecks.length} existing bottleneck(s) would be resolved`;
    }

    // Add severity-based recommendations
    if (newCritical > 0) {
      summary += '. URGENT ACTION REQUIRED for critical bottlenecks';
    } else if (newHigh > 0) {
      summary += '. Immediate attention needed for high-severity issues';
    } else if (newMedium > 0) {
      summary += '. Monitor and plan mitigation for moderate issues';
    }

    return summary;
  }

  private async storeScenarioAnalysis(scenarioId: string, scenarioData: any, results: any): Promise<void> {
    try {
      const insertQuery = `
        INSERT INTO capacity_scenario_analyses (
          scenario_id, scenario_name, scenario_description,
          base_assumptions, scenario_changes, predicted_outcomes
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await this.db.query(insertQuery, [
        scenarioId,
        scenarioData.scenario.name,
        scenarioData.scenario.description,
        JSON.stringify({ analysisOptions: scenarioData.analysisOptions }),
        JSON.stringify(scenarioData.scenario.changes),
        JSON.stringify(results)
      ]);
    } catch (error) {
      console.error('Error storing scenario analysis:', error);
      // Non-critical error, continue execution
    }
  }

  private analyzeSeasonality(data: UtilizationDataPoint[]): SeasonalityAnalysis {
    if (data.length < 12) {
      return {
        hasSeasonality: false,
        peakMonths: [],
        lowMonths: [],
        seasonalityStrength: 0,
        trend: 'stable',
        seasonalFactors: [],
        cyclical: false
      };
    }

    // Group data by month to detect seasonal patterns
    const monthlyData = new Map<number, number[]>();
    data.forEach(point => {
      const date = new Date(point.period);
      const month = date.getMonth();
      if (!monthlyData.has(month)) {
        monthlyData.set(month, []);
      }
      monthlyData.get(month)!.push(point.utilization);
    });

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const monthlyAverages = new Map<number, number>();
    monthlyData.forEach((values, month) => {
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      monthlyAverages.set(month, avg);
    });

    if (monthlyAverages.size < 6) {
      return {
        hasSeasonality: false,
        peakMonths: [],
        lowMonths: [],
        seasonalityStrength: 0,
        trend: 'stable',
        seasonalFactors: [],
        cyclical: false
      };
    }

    const overallAverage = Array.from(monthlyAverages.values())
      .reduce((sum, val) => sum + val, 0) / monthlyAverages.size;

    // Calculate seasonal strength
    const deviations = Array.from(monthlyAverages.values())
      .map(avg => Math.abs(avg - overallAverage));
    const maxDeviation = Math.max(...deviations);
    const seasonalityStrength = overallAverage > 0 ? maxDeviation / overallAverage : 0;

    // Identify peak and low months
    const sortedMonths = Array.from(monthlyAverages.entries())
      .sort((a, b) => b[1] - a[1]);

    const peakThreshold = overallAverage + (maxDeviation * 0.5);
    const lowThreshold = overallAverage - (maxDeviation * 0.5);

    const peakMonths = sortedMonths
      .filter(([_, avg]) => avg >= peakThreshold)
      .map(([month, _]) => monthNames[month]);

    const lowMonths = sortedMonths
      .filter(([_, avg]) => avg <= lowThreshold)
      .map(([month, _]) => monthNames[month]);

    // Calculate seasonal factors
    const seasonalFactors = Array.from(monthlyAverages.entries())
      .map(([month, avg]) => ({
        period: monthNames[month],
        factor: overallAverage > 0 ? avg / overallAverage : 1
      }));

    // Determine trend
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.utilization, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.utilization, 0) / secondHalf.length;
    const trendDirection = secondAvg > firstAvg + 2 ? 'increasing' :
      secondAvg < firstAvg - 2 ? 'decreasing' : 'stable';

    return {
      hasSeasonality: seasonalityStrength > 0.1, // 10% threshold
      peakMonths,
      lowMonths,
      seasonalityStrength,
      trend: trendDirection,
      seasonalFactors,
      cyclical: seasonalityStrength > 0.15 && data.length >= 24 // 2+ years of data
    };
  }

  private calculateUtilizationTrend(utilizations: number[]) {
    if (utilizations.length < 3) {
      return {
        direction: 'stable' as const,
        rate: 0,
        confidence: 0.3
      };
    }

    const trend = this.calculateLinearTrend(utilizations);
    const correlation = this.calculateTrendCorrelation(utilizations);

    // Consider trend significant if it's > 0.5 per period and correlation > 0.5
    const isSignificantTrend = Math.abs(trend) > 0.5 && Math.abs(correlation) > 0.5;

    return {
      direction: (!isSignificantTrend ? 'stable' :
        trend > 0 ? 'increasing' : 'decreasing') as 'increasing' | 'stable' | 'decreasing',
      rate: Math.round(Math.abs(trend) * 100) / 100,
      confidence: Math.round(Math.abs(correlation) * 100) / 100
    };
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private calculateTrendCorrelation(values: number[]): number {
    if (values.length < 2) return 0;

    const xValues = Array.from({ length: values.length }, (_, i) => i);
    const n = values.length;

    const meanX = xValues.reduce((sum, x) => sum + x, 0) / n;
    const meanY = values.reduce((sum, y) => sum + y, 0) / n;

    const numerator = xValues.reduce((sum, x, i) => sum + (x - meanX) * (values[i] - meanY), 0);
    const denomX = Math.sqrt(xValues.reduce((sum, x) => sum + Math.pow(x - meanX, 2), 0));
    const denomY = Math.sqrt(values.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0));

    const correlation = denomX * denomY > 0 ? numerator / (denomX * denomY) : 0;
    return correlation;
  }

  private formatPeriod(period: Date | string): string {
    const date = new Date(period);
    return date.toISOString().slice(0, 7); // YYYY-MM format
  }

  private getDefaultUtilizationPatterns(): UtilizationPatterns {
    return {
      patterns: {
        peakPeriods: [],
        lowUtilizationPeriods: [],
        averageUtilization: 75
      },
      seasonality: {
        hasSeasonality: false,
        peakMonths: [],
        lowMonths: [],
        seasonalityStrength: 0
      },
      trends: {
        direction: 'stable',
        rate: 0,
        confidence: 0.5
      },
      anomalies: []
    };
  }

  private identifyAnomalies(data: UtilizationDataPoint[], average: number, stdDev: number): Array<{
    period: string;
    actualUtilization: number;
    expectedUtilization: number;
    deviation: number;
    possibleCauses: string[];
  }> {
    const threshold = Math.max(stdDev * 2, average * 0.25); // 2 std dev or 25% of average

    return data
      .filter(d => Math.abs(d.utilization - average) > threshold)
      .map(d => {
        const deviation = Math.abs(d.utilization - average);
        const isHigh = d.utilization > average;
        const severityLevel = deviation > stdDev * 3 ? 'extreme' : 'moderate';

        const possibleCauses = isHigh ?
          ['Project deadlines and crunch time', 'Unexpected workload increase', 'Staff shortage', 'Emergency projects'] :
          ['Project cancellations', 'Staff additions', 'Reduced client demand', 'Seasonal downturn'];

        if (severityLevel === 'extreme') {
          possibleCauses.push(isHigh ? 'Crisis management situation' : 'Major business change');
        }

        return {
          period: d.period,
          actualUtilization: Math.round(d.utilization * 10) / 10,
          expectedUtilization: Math.round(average * 10) / 10,
          deviation: Math.round(deviation * 10) / 10,
          possibleCauses
        };
      })
      .sort((a, b) => b.deviation - a.deviation); // Sort by deviation magnitude
  }

  private async analyzeDemandTrend(skill: string): Promise<string> {
    try {
      // Analyze actual skill demand trend from resource allocations
      const trendQuery = `
        WITH skill_monthly_demand AS (
          SELECT 
            DATE_TRUNC('month', ra.start_date) as month,
            COUNT(DISTINCT ra.id) as allocations,
            SUM(ra.allocated_hours) as total_hours
          FROM resource_allocations ra
          JOIN employees e ON ra.employee_id = e.id
          JOIN employee_skills es ON e.id = es.employee_id
          JOIN skills s ON es.skill_id = s.id
          WHERE s.name = $1
            AND ra.is_active = true
            AND ra.start_date >= CURRENT_DATE - INTERVAL '6 months'
          GROUP BY DATE_TRUNC('month', ra.start_date)
          ORDER BY month
        ),
        trend_analysis AS (
          SELECT 
            COUNT(*) as data_points,
            -- Linear regression slope to determine trend
            (COUNT(*) * SUM(EXTRACT(epoch FROM month) * allocations) - SUM(EXTRACT(epoch FROM month)) * SUM(allocations)) /
            NULLIF(COUNT(*) * SUM(POWER(EXTRACT(epoch FROM month), 2)) - POWER(SUM(EXTRACT(epoch FROM month)), 2), 0) as slope
          FROM skill_monthly_demand
        )
        SELECT 
          slope,
          data_points,
          CASE 
            WHEN slope > 0.1 THEN 'increasing'
            WHEN slope < -0.1 THEN 'decreasing'
            ELSE 'stable'
          END as trend
        FROM trend_analysis
      `;
      
      const result = await this.db.query(trendQuery, [skill]);
      
      if (result.rows.length > 0 && result.rows[0].data_points >= 3) {
        return result.rows[0].trend;
      }
      
      // Fallback analysis based on skill category
      const categoryQuery = `
        SELECT category FROM skills WHERE name = $1 LIMIT 1
      `;
      const categoryResult = await this.db.query(categoryQuery, [skill]);
      
      if (categoryResult.rows.length > 0) {
        const category = categoryResult.rows[0].category;
        // Technical skills generally increasing, soft skills stable, domain-specific varies
        switch (category.toLowerCase()) {
          case 'technical': return 'increasing';
          case 'soft': return 'stable';
          case 'domain': return 'increasing';
          default: return 'stable';
        }
      }
      
      return 'stable';
    } catch (error) {
      console.error('Error analyzing demand trend for skill:', skill, error);
      return 'stable';
    }
  }

  private estimateTimeToFill(skill: string, gap: number): number {
    // Estimate weeks to fill gap
    return Math.max(4, gap * 6);
  }

  private assessBusinessImpact(skill: string, gap: number): string {
    const criticalSkills = ['React', 'Node.js', 'Python', 'Java', 'DevOps', 'Machine Learning'];
    const isCritical = criticalSkills.some(cs => skill.toLowerCase().includes(cs.toLowerCase()));

    if (gap > 5 || (isCritical && gap > 3)) {
      return 'Critical project delays and potential revenue loss expected';
    }
    if (gap > 3 || (isCritical && gap > 1)) {
      return 'Moderate impact on delivery timeline and project quality';
    }
    if (gap > 1) {
      return 'Minor impact on capacity and potential bottlenecks';
    }
    return 'Minimal business impact';
  }

  private calculateForecastConfidence(supply: any, demand: any): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on data availability
    if (parseInt(supply.current_supply) > 0) confidence += 0.2;
    if (parseFloat(demand.current_demand) > 0) confidence += 0.2;
    if (parseFloat(demand.planned_demand) > 0) confidence += 0.1;

    // Decrease confidence for very small or very large numbers
    const totalSupply = parseInt(supply.current_supply) || 0;
    const totalDemand = parseFloat(demand.weighted_demand) || 0;

    if (totalSupply < 2 && totalDemand > 5) confidence -= 0.1;
    if (totalDemand > totalSupply * 3) confidence -= 0.1;

    return Math.max(0.3, Math.min(0.95, confidence));
  }

  private calculateSkillGapSeverity(gap: number, confidence: number, businessImpact: string): 'low' | 'medium' | 'high' | 'critical' {
    let severity = 0;

    // Base severity from gap size
    if (gap >= 5) severity += 3;
    else if (gap >= 3) severity += 2;
    else if (gap >= 2) severity += 1;

    // Adjust for confidence
    if (confidence > 0.8) severity += 1;
    else if (confidence < 0.5) severity -= 1;

    // Adjust for business impact
    if (businessImpact.includes('Critical')) severity += 2;
    else if (businessImpact.includes('Moderate')) severity += 1;

    if (severity >= 5) return 'critical';
    if (severity >= 3) return 'high';
    if (severity >= 1) return 'medium';
    return 'low';
  }

  private async findTrainingCandidates(skill: string): Promise<number> {
    try {
      // Find employees who could be trained in this skill
      const candidatesQuery = `
        WITH skill_analysis AS (
          SELECT 
            s.id as skill_id,
            s.category,
            s.difficulty_level
          FROM skills s 
          WHERE s.name = $1
        ),
        employee_candidates AS (
          SELECT DISTINCT e.id
          FROM employees e
          JOIN departments d ON e.department_id = d.id
          JOIN skill_analysis sa ON true
          WHERE e.is_active = true
            -- Employee doesn't already have this skill at advanced level
            AND NOT EXISTS (
              SELECT 1 FROM employee_skills es 
              WHERE es.employee_id = e.id 
                AND es.skill_id = sa.skill_id 
                AND es.proficiency_level IN ('expert', 'advanced')
            )
            -- Employee has related skills in same category
            AND EXISTS (
              SELECT 1 FROM employee_skills es2
              JOIN skills s2 ON es2.skill_id = s2.id
              WHERE es2.employee_id = e.id
                AND s2.category = sa.category
                AND es2.proficiency_level IN ('intermediate', 'advanced', 'expert')
            )
            -- Employee isn't over-utilized
            AND COALESCE((
              SELECT SUM(ra.allocated_hours) 
              FROM resource_allocations ra 
              WHERE ra.employee_id = e.id 
                AND ra.is_active = true
                AND ra.start_date <= CURRENT_DATE 
                AND ra.end_date >= CURRENT_DATE
            ), 0) < e.default_hours * 0.9
        )
        SELECT COUNT(*) as candidate_count
        FROM employee_candidates
      `;
      
      const result = await this.db.query(candidatesQuery, [skill]);
      const candidateCount = parseInt(result.rows[0]?.candidate_count) || 0;
      
      // Return reasonable number (2-7 candidates typically)
      return Math.min(7, Math.max(2, candidateCount));
    } catch (error) {
      console.error('Error finding training candidates for skill:', skill, error);
      // Fallback to reasonable estimate based on org size
      return 3;
    }
  }

  private estimateTrainingTime(skill: string): number {
    // Estimate weeks for training
    const complexSkills = ['Machine Learning', 'DevOps', 'Architecture'];
    return complexSkills.includes(skill) ? 12 : 8;
  }
}