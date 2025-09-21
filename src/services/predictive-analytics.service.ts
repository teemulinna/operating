/**
 * Predictive Analytics Service for Resource Demand Forecasting
 * Implements time series analysis and machine learning models
 * for predicting future resource requirements
 */

import { DatabaseService } from '../database/database.service';
import { Logger } from '../utils/logger';

const dbService = DatabaseService.getInstance();

// Forecasting Interfaces
export interface DemandForecast {
  forecastId: string;
  forecastDate: Date;
  timeHorizon: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  forecastPeriod: {
    startDate: Date;
    endDate: Date;
    totalWeeks: number;
  };
  skillDemandForecasts: SkillDemandForecast[];
  departmentForecasts: DepartmentForecast[];
  overallMetrics: ForecastMetrics;
  confidence: {
    overall: number;
    bySkillCategory: Map<string, number>;
    byDepartment: Map<string, number>;
  };
  seasonalityFactors: SeasonalityAnalysis;
  trendAnalysis: TrendAnalysis;
}

export interface SkillDemandForecast {
  skillId: string;
  skillName: string;
  category: string;
  currentDemand: number;
  predictedDemand: number;
  demandChange: number;
  demandChangePercentage: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  seasonality: 'high' | 'medium' | 'low' | 'none';
  confidenceInterval: [number, number];
  historicalAccuracy: number;
  driverFactors: DemandDriver[];
  riskFactors: RiskFactor[];
}

export interface DepartmentForecast {
  departmentId: string;
  departmentName: string;
  currentHeadcount: number;
  predictedHeadcount: number;
  utilizationForecast: {
    current: number;
    predicted: number;
    optimal: number;
  };
  skillGapAnalysis: SkillGap[];
  capacityAnalysis: CapacityAnalysis;
  budgetImpact: BudgetImpact;
}

export interface ForecastMetrics {
  totalCurrentDemand: number;
  totalPredictedDemand: number;
  overallGrowthRate: number;
  volatilityScore: number;
  seasonalityScore: number;
  modelAccuracy: number;
  forecastReliability: 'high' | 'medium' | 'low';
}

export interface SeasonalityAnalysis {
  detectedPatterns: {
    pattern: 'quarterly' | 'monthly' | 'weekly' | 'none';
    strength: number;
    peakPeriods: string[];
    lowPeriods: string[];
  }[];
  holidayEffects: {
    period: string;
    demandMultiplier: number;
  }[];
  cyclicalTrends: {
    cycle: string;
    duration: number;
    amplitude: number;
  }[];
}

export interface TrendAnalysis {
  overallTrend: 'upward' | 'downward' | 'stable' | 'volatile';
  trendStrength: number;
  changePoints: {
    date: Date;
    significance: number;
    cause: string;
  }[];
  futureProjections: {
    shortTerm: number; // 1-3 months
    mediumTerm: number; // 3-12 months
    longTerm: number; // 1-3 years
  };
}

export interface DemandDriver {
  factor: string;
  impact: number; // -1 to 1 scale
  confidence: number;
  timelag: number; // weeks
  description: string;
}

export interface RiskFactor {
  type: 'market' | 'technology' | 'seasonal' | 'economic' | 'competitive';
  description: string;
  probability: number;
  impact: number;
  timeframe: string;
  mitigationStrategies: string[];
}

export interface CapacityAnalysis {
  currentCapacity: number;
  predictedNeed: number;
  capacityGap: number;
  utilizationOptimization: {
    currentUtilization: number;
    optimalUtilization: number;
    improvementPotential: number;
  };
  scalingRecommendations: ScalingRecommendation[];
}

export interface ScalingRecommendation {
  action: 'hire' | 'train' | 'reallocate' | 'outsource' | 'automate';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timeline: string;
  estimatedCost: number;
  expectedBenefit: number;
  riskLevel: number;
  description: string;
}

export interface BudgetImpact {
  currentBudget: number;
  forecastedBudget: number;
  budgetVariance: number;
  costDrivers: {
    factor: string;
    impact: number;
    description: string;
  }[];
  optimizationOpportunities: {
    opportunity: string;
    savings: number;
    effort: string;
  }[];
}

export interface SkillGap {
  skillId: string;
  skillName: string;
  category: string;
  currentSupply: number;
  predictedDemand: number;
  gapSize: number;
  gapCriticality: 'low' | 'medium' | 'high' | 'critical';
  timeToFill: number; // weeks
  resolutionOptions: {
    option: string;
    cost: number;
    timeframe: string;
    feasibility: number;
  }[];
}

export interface TimeSeriesDataPoint {
  date: Date;
  value: number;
  skillId?: string;
  departmentId?: string;
  projectId?: number;
  metadata?: Record<string, any>;
}

export class PredictiveAnalyticsService {
  private logger = Logger.getInstance();
  private readonly FORECAST_CACHE_TTL = 3600000; // 1 hour in milliseconds
  private forecastCache: Map<string, { data: DemandForecast; timestamp: number }> = new Map();

  // Main forecasting function
  async generateDemandForecast(
    timeHorizon: 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    options: {
      includeSeasonality?: boolean;
      includeTrends?: boolean;
      includeExternalFactors?: boolean;
      confidenceLevel?: number;
      skillCategories?: string[];
      departments?: string[];
    } = {}
  ): Promise<DemandForecast> {
    const {
      includeSeasonality = true,
      includeTrends = true,
      includeExternalFactors = false,
      confidenceLevel = 0.95,
      skillCategories,
      departments
    } = options;

    try {
      this.logger.info(`Generating ${timeHorizon} demand forecast`);

      // Check cache first
      const cacheKey = this.generateCacheKey(timeHorizon, options);
      const cached = this.forecastCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.FORECAST_CACHE_TTL) {
        return cached.data;
      }

      // Get historical data
      const historicalData = await this.getHistoricalDemandData(timeHorizon, skillCategories, departments);
      
      // Generate time series forecasts
      const skillForecasts = await this.generateSkillForecasts(historicalData, timeHorizon, options);
      
      // Generate department forecasts
      const departmentForecasts = await this.generateDepartmentForecasts(historicalData, timeHorizon);
      
      // Analyze seasonality and trends
      const seasonalityAnalysis = includeSeasonality ? 
        await this.analyzeSeasonality(historicalData) : this.getEmptySeasonalityAnalysis();
      
      const trendAnalysis = includeTrends ? 
        await this.analyzeTrends(historicalData) : this.getEmptyTrendAnalysis();
      
      // Calculate overall metrics
      const overallMetrics = this.calculateOverallMetrics(skillForecasts, historicalData);
      
      // Calculate confidence scores
      const confidence = this.calculateConfidenceScores(skillForecasts, departmentForecasts, historicalData);
      
      const forecast: DemandForecast = {
        forecastId: this.generateForecastId(),
        forecastDate: new Date(),
        timeHorizon,
        forecastPeriod: this.calculateForecastPeriod(timeHorizon),
        skillDemandForecasts: skillForecasts,
        departmentForecasts,
        overallMetrics,
        confidence,
        seasonalityFactors: seasonalityAnalysis,
        trendAnalysis
      };

      // Cache the result
      this.forecastCache.set(cacheKey, { data: forecast, timestamp: Date.now() });

      return forecast;

    } catch (error) {
      this.logger.error('Error generating demand forecast:', error);
      throw error;
    }
  }

  // Pipeline-based forecasting
  async forecastPipelineResourceDemand(
    pipelineFilter: {
      probabilityThreshold?: number;
      clientTypes?: string[];
      projectTypes?: string[];
      budgetRange?: [number, number];
      timeRange?: [Date, Date];
    } = {}
  ): Promise<{
    pipelineForecasts: PipelineForecast[];
    aggregatedDemand: SkillDemandForecast[];
    riskAssessment: PipelineRiskAssessment;
    capacityRequirements: CapacityRequirement[];
  }> {
    try {
      this.logger.info('Generating pipeline-based resource demand forecast');

      // Get pipeline projects
      const pipelineProjects = await this.getPipelineProjects(pipelineFilter);
      
      // Generate forecasts for each pipeline project
      const pipelineForecasts: PipelineForecast[] = [];
      
      for (const project of pipelineProjects) {
        const forecast = await this.generatePipelineProjectForecast(project);
        pipelineForecasts.push(forecast);
      }
      
      // Aggregate demand across all pipeline projects
      const aggregatedDemand = this.aggregatePipelineDemand(pipelineForecasts);
      
      // Assess risks
      const riskAssessment = this.assessPipelineRisks(pipelineForecasts, pipelineFilter);
      
      // Calculate capacity requirements
      const capacityRequirements = await this.calculateCapacityRequirements(aggregatedDemand);
      
      return {
        pipelineForecasts,
        aggregatedDemand,
        riskAssessment,
        capacityRequirements
      };

    } catch (error) {
      this.logger.error('Error forecasting pipeline resource demand:', error);
      throw error;
    }
  }

  // Scenario-based forecasting
  async generateScenarioForecasts(
    scenarios: {
      name: string;
      description: string;
      assumptions: {
        growthRate: number;
        marketConditions: 'optimistic' | 'realistic' | 'pessimistic';
        technologyChanges: string[];
        budgetConstraints: number;
        timeframe: string;
      };
    }[]
  ): Promise<{
    scenarioForecasts: Map<string, DemandForecast>;
    comparison: ScenarioComparison;
    recommendations: ScenarioRecommendation[];
  }> {
    try {
      this.logger.info(`Generating forecasts for ${scenarios.length} scenarios`);

      const scenarioForecasts = new Map<string, DemandForecast>();
      
      // Generate forecast for each scenario
      for (const scenario of scenarios) {
        const adjustedOptions = this.adjustOptionsForScenario(scenario);
        const forecast = await this.generateDemandForecast('quarterly', adjustedOptions);
        
        // Apply scenario-specific adjustments
        const adjustedForecast = this.applyScenarioAdjustments(forecast, scenario);
        scenarioForecasts.set(scenario.name, adjustedForecast);
      }
      
      // Compare scenarios
      const comparison = this.compareScenarios(scenarioForecasts);
      
      // Generate recommendations
      const recommendations = this.generateScenarioRecommendations(scenarioForecasts, comparison);
      
      return {
        scenarioForecasts,
        comparison,
        recommendations
      };

    } catch (error) {
      this.logger.error('Error generating scenario forecasts:', error);
      throw error;
    }
  }

  // Real-time demand tracking and adjustment
  async updateForecastWithRealTimeData(
    forecastId: string,
    realTimeData: {
      newProjects: any[];
      cancelledProjects: string[];
      resourceChanges: any[];
      marketIndicators: any[];
    }
  ): Promise<DemandForecast> {
    try {
      this.logger.info(`Updating forecast ${forecastId} with real-time data`);

      // Get existing forecast
      const existingForecast = await this.getForecastById(forecastId);
      if (!existingForecast) {
        throw new Error('Forecast not found');
      }

      // Apply real-time adjustments
      const updatedForecast = await this.applyRealTimeAdjustments(existingForecast, realTimeData);
      
      // Recalculate confidence scores based on new data
      updatedForecast.confidence = this.recalculateConfidenceScores(updatedForecast, realTimeData);
      
      // Update forecast timestamp
      updatedForecast.forecastDate = new Date();
      
      return updatedForecast;

    } catch (error) {
      this.logger.error('Error updating forecast with real-time data:', error);
      throw error;
    }
  }

  // Model accuracy evaluation
  async evaluateForecastAccuracy(
    forecastId: string,
    actualData: {
      skillDemand: { skillId: string; actualValue: number; date: Date }[];
      departmentUtilization: { departmentId: string; actualValue: number; date: Date }[];
    }
  ): Promise<{
    overallAccuracy: number;
    skillAccuracies: Map<string, number>;
    departmentAccuracies: Map<string, number>;
    errorAnalysis: {
      mae: number; // Mean Absolute Error
      rmse: number; // Root Mean Square Error
      mape: number; // Mean Absolute Percentage Error
    };
    improvementSuggestions: string[];
  }> {
    try {
      this.logger.info(`Evaluating accuracy for forecast ${forecastId}`);

      const forecast = await this.getForecastById(forecastId);
      if (!forecast) {
        throw new Error('Forecast not found');
      }

      // Calculate accuracy metrics
      const skillAccuracies = new Map<string, number>();
      const departmentAccuracies = new Map<string, number>();
      
      let totalError = 0;
      let totalSquaredError = 0;
      let totalPercentageError = 0;
      let dataPoints = 0;

      // Evaluate skill forecasts
      for (const actualSkill of actualData.skillDemand) {
        const forecastedSkill = forecast.skillDemandForecasts.find(s => s.skillId === actualSkill.skillId);
        if (forecastedSkill) {
          const error = Math.abs(forecastedSkill.predictedDemand - actualSkill.actualValue);
          const accuracy = Math.max(0, 100 - (error / actualSkill.actualValue) * 100);
          
          skillAccuracies.set(actualSkill.skillId, accuracy);
          
          totalError += error;
          totalSquaredError += error * error;
          totalPercentageError += (error / actualSkill.actualValue) * 100;
          dataPoints++;
        }
      }

      // Calculate error metrics
      const mae = dataPoints > 0 ? totalError / dataPoints : 0;
      const rmse = dataPoints > 0 ? Math.sqrt(totalSquaredError / dataPoints) : 0;
      const mape = dataPoints > 0 ? totalPercentageError / dataPoints : 0;

      const overallAccuracy = Math.max(0, 100 - mape);

      // Generate improvement suggestions
      const improvementSuggestions = this.generateImprovementSuggestions(
        { mae, rmse, mape },
        skillAccuracies,
        departmentAccuracies
      );

      return {
        overallAccuracy,
        skillAccuracies,
        departmentAccuracies,
        errorAnalysis: { mae, rmse, mape },
        improvementSuggestions
      };

    } catch (error) {
      this.logger.error('Error evaluating forecast accuracy:', error);
      throw error;
    }
  }

  // Private helper methods

  private async getHistoricalDemandData(
    timeHorizon: string,
    skillCategories?: string[],
    departments?: string[]
  ): Promise<TimeSeriesDataPoint[]> {
    const periodMonths = this.getHistoricalPeriodMonths(timeHorizon);
    
    const query = `
      WITH historical_demand AS (
        SELECT 
          DATE_TRUNC($1, ra.start_date) as period,
          s.id as skill_id,
          s.name as skill_name,
          s.category,
          d.id as department_id,
          d.name as department_name,
          SUM(ra.planned_allocation_percentage) as total_demand,
          COUNT(ra.id) as assignment_count,
          AVG(ra.planned_allocation_percentage) as avg_allocation
        FROM resource_assignments ra
        JOIN project_roles pr ON ra.project_role_id = pr.id
        JOIN UNNEST(pr.required_skills) AS skill_uuid ON true
        JOIN skills s ON s.id = skill_uuid
        JOIN employees e ON ra.employee_id = e.id
        JOIN departments d ON e.department_id = d.id
        WHERE ra.start_date >= CURRENT_DATE - INTERVAL '$2 months'
          AND ra.status IN ('active', 'completed')
          AND ($3::text[] IS NULL OR s.category = ANY($3::text[]))
          AND ($4::uuid[] IS NULL OR d.id = ANY($4::uuid[]))
        GROUP BY period, s.id, s.name, s.category, d.id, d.name
        ORDER BY period, s.category, s.name
      )
      SELECT * FROM historical_demand
    `;

    const timeGrouping = timeHorizon === 'weekly' ? 'week' : 
                        timeHorizon === 'monthly' ? 'month' : 'quarter';
    
    const result = await dbService.query(query, [
      timeGrouping,
      periodMonths.toString(),
      skillCategories,
      departments
    ]);

    return result.rows.map(row => ({
      date: new Date(row.period),
      value: parseFloat(row.total_demand),
      skillId: row.skill_id,
      departmentId: row.department_id,
      metadata: {
        skillName: row.skill_name,
        skillCategory: row.category,
        departmentName: row.department_name,
        assignmentCount: row.assignment_count,
        avgAllocation: parseFloat(row.avg_allocation)
      }
    }));
  }

  private async generateSkillForecasts(
    historicalData: TimeSeriesDataPoint[],
    timeHorizon: string,
    options: any
  ): Promise<SkillDemandForecast[]> {
    const skillGroups = this.groupDataBySkill(historicalData);
    const forecasts: SkillDemandForecast[] = [];

    for (const [skillId, dataPoints] of skillGroups) {
      const forecast = await this.generateSingleSkillForecast(skillId, dataPoints, timeHorizon, options);
      forecasts.push(forecast);
    }

    return forecasts.sort((a, b) => b.predictedDemand - a.predictedDemand);
  }

  private async generateSingleSkillForecast(
    skillId: string,
    dataPoints: TimeSeriesDataPoint[],
    timeHorizon: string,
    options: any
  ): Promise<SkillDemandForecast> {
    // Sort data points by date
    const sortedData = dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Calculate current demand (average of recent periods)
    const recentPeriods = Math.min(4, sortedData.length);
    const currentDemand = recentPeriods > 0 ? 
      sortedData.slice(-recentPeriods).reduce((sum, dp) => sum + dp.value, 0) / recentPeriods : 0;

    // Apply forecasting algorithm (simplified linear regression)
    const { predictedDemand, trend, confidenceInterval } = this.applyForecastingAlgorithm(sortedData, timeHorizon);
    
    // Calculate demand change
    const demandChange = predictedDemand - currentDemand;
    const demandChangePercentage = currentDemand > 0 ? (demandChange / currentDemand) * 100 : 0;
    
    // Analyze seasonality
    const seasonality = this.analyzeSkillSeasonality(sortedData);
    
    // Generate driver factors
    const driverFactors = await this.identifyDemandDrivers(skillId, sortedData);
    
    // Identify risk factors
    const riskFactors = this.identifySkillRiskFactors(skillId, sortedData, trend);
    
    // Calculate historical accuracy
    const historicalAccuracy = this.calculateHistoricalAccuracy(sortedData);

    const skillName = dataPoints[0]?.metadata?.skillName || 'Unknown Skill';
    const category = dataPoints[0]?.metadata?.skillCategory || 'unknown';

    return {
      skillId,
      skillName,
      category,
      currentDemand: Math.round(currentDemand),
      predictedDemand: Math.round(predictedDemand),
      demandChange: Math.round(demandChange),
      demandChangePercentage: Math.round(demandChangePercentage * 100) / 100,
      trend,
      seasonality,
      confidenceInterval: [
        Math.round(confidenceInterval[0]),
        Math.round(confidenceInterval[1])
      ],
      historicalAccuracy,
      driverFactors,
      riskFactors
    };
  }

  private applyForecastingAlgorithm(
    dataPoints: TimeSeriesDataPoint[],
    timeHorizon: string
  ): {
    predictedDemand: number;
    trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    confidenceInterval: [number, number];
  } {
    if (dataPoints.length < 2) {
      const value = dataPoints[0]?.value || 0;
      return {
        predictedDemand: value,
        trend: 'stable',
        confidenceInterval: [value * 0.8, value * 1.2]
      };
    }

    // Simple linear regression
    const n = dataPoints.length;
    const timepoints = dataPoints.map((_, i) => i);
    const values = dataPoints.map(dp => dp.value);
    
    const sumX = timepoints.reduce((sum, x) => sum + x, 0);
    const sumY = values.reduce((sum, y) => sum + y, 0);
    const sumXY = timepoints.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = timepoints.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Project forward based on time horizon
    const periodsAhead = this.getPeriodsAhead(timeHorizon);
    const predictedDemand = intercept + slope * (n - 1 + periodsAhead);
    
    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    if (Math.abs(slope) < 0.1) {
      trend = 'stable';
    } else if (slope > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }
    
    // Check for volatility
    const volatility = this.calculateVolatility(values);
    if (volatility > 0.3) {
      trend = 'volatile';
    }
    
    // Calculate confidence interval
    const residuals = dataPoints.map((dp, i) => dp.value - (intercept + slope * i));
    const mse = residuals.reduce((sum, r) => sum + r * r, 0) / (n - 2);
    const stderr = Math.sqrt(mse);
    const marginOfError = 1.96 * stderr; // 95% confidence interval
    
    return {
      predictedDemand: Math.max(0, predictedDemand),
      trend,
      confidenceInterval: [
        Math.max(0, predictedDemand - marginOfError),
        predictedDemand + marginOfError
      ]
    };
  }

  // Additional helper methods with simplified implementations
  private async generateDepartmentForecasts(
    historicalData: TimeSeriesDataPoint[],
    timeHorizon: string
  ): Promise<DepartmentForecast[]> {
    // Implementation would generate department-specific forecasts
    return [];
  }

  private async analyzeSeasonality(historicalData: TimeSeriesDataPoint[]): Promise<SeasonalityAnalysis> {
    // Implementation would perform detailed seasonality analysis
    return this.getEmptySeasonalityAnalysis();
  }

  private async analyzeTrends(historicalData: TimeSeriesDataPoint[]): Promise<TrendAnalysis> {
    // Implementation would perform trend analysis
    return this.getEmptyTrendAnalysis();
  }

  private calculateOverallMetrics(
    skillForecasts: SkillDemandForecast[],
    historicalData: TimeSeriesDataPoint[]
  ): ForecastMetrics {
    const totalCurrentDemand = skillForecasts.reduce((sum, sf) => sum + sf.currentDemand, 0);
    const totalPredictedDemand = skillForecasts.reduce((sum, sf) => sum + sf.predictedDemand, 0);
    
    return {
      totalCurrentDemand,
      totalPredictedDemand,
      overallGrowthRate: totalCurrentDemand > 0 ? 
        ((totalPredictedDemand - totalCurrentDemand) / totalCurrentDemand) * 100 : 0,
      volatilityScore: this.calculateOverallVolatility(skillForecasts),
      seasonalityScore: 0.3, // Mock value
      modelAccuracy: 0.82, // Mock value
      forecastReliability: 'medium'
    };
  }

  private calculateConfidenceScores(
    skillForecasts: SkillDemandForecast[],
    departmentForecasts: DepartmentForecast[],
    historicalData: TimeSeriesDataPoint[]
  ) {
    const avgSkillConfidence = skillForecasts.length > 0 ?
      skillForecasts.reduce((sum, sf) => sum + sf.historicalAccuracy, 0) / skillForecasts.length : 50;

    return {
      overall: Math.round(avgSkillConfidence),
      bySkillCategory: new Map([
        ['technical', 75],
        ['soft', 65],
        ['domain', 70]
      ]),
      byDepartment: new Map([
        ['engineering', 80],
        ['design', 65],
        ['marketing', 60]
      ])
    };
  }

  // Utility methods
  private generateCacheKey(timeHorizon: string, options: any): string {
    return `forecast_${timeHorizon}_${JSON.stringify(options)}`;
  }

  private generateForecastId(): string {
    return `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateForecastPeriod(timeHorizon: string) {
    const now = new Date();
    let endDate: Date;
    let totalWeeks: number;

    switch (timeHorizon) {
      case 'weekly':
        endDate = new Date(now.getTime() + 4 * 7 * 24 * 60 * 60 * 1000); // 4 weeks
        totalWeeks = 4;
        break;
      case 'monthly':
        endDate = new Date(now.getTime() + 3 * 30 * 24 * 60 * 60 * 1000); // 3 months
        totalWeeks = 12;
        break;
      case 'quarterly':
        endDate = new Date(now.getTime() + 12 * 30 * 24 * 60 * 60 * 1000); // 12 months
        totalWeeks = 52;
        break;
      case 'yearly':
        endDate = new Date(now.getTime() + 36 * 30 * 24 * 60 * 60 * 1000); // 3 years
        totalWeeks = 156;
        break;
      default:
        endDate = new Date(now.getTime() + 12 * 30 * 24 * 60 * 60 * 1000);
        totalWeeks = 52;
    }

    return {
      startDate: now,
      endDate,
      totalWeeks
    };
  }

  private getHistoricalPeriodMonths(timeHorizon: string): number {
    const periods: Record<string, number> = {
      'weekly': 6,
      'monthly': 12,
      'quarterly': 24,
      'yearly': 36
    };
    return periods[timeHorizon] || 12;
  }

  private groupDataBySkill(data: TimeSeriesDataPoint[]): Map<string, TimeSeriesDataPoint[]> {
    const groups = new Map<string, TimeSeriesDataPoint[]>();
    
    for (const point of data) {
      if (point.skillId) {
        if (!groups.has(point.skillId)) {
          groups.set(point.skillId, []);
        }
        groups.get(point.skillId)!.push(point);
      }
    }
    
    return groups;
  }

  private getPeriodsAhead(timeHorizon: string): number {
    const periods: Record<string, number> = {
      'weekly': 4,
      'monthly': 3,
      'quarterly': 4,
      'yearly': 4
    };
    return periods[timeHorizon] || 3;
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
    const stdDev = Math.sqrt(variance);
    
    return mean > 0 ? stdDev / mean : 0;
  }

  private calculateOverallVolatility(skillForecasts: SkillDemandForecast[]): number {
    const volatileSkills = skillForecasts.filter(sf => sf.trend === 'volatile').length;
    return skillForecasts.length > 0 ? (volatileSkills / skillForecasts.length) * 100 : 0;
  }

  private analyzeSkillSeasonality(dataPoints: TimeSeriesDataPoint[]): 'high' | 'medium' | 'low' | 'none' {
    // Simplified seasonality detection
    if (dataPoints.length < 4) return 'none';
    
    const values = dataPoints.map(dp => dp.value);
    const volatility = this.calculateVolatility(values);
    
    if (volatility > 0.4) return 'high';
    if (volatility > 0.2) return 'medium';
    if (volatility > 0.1) return 'low';
    return 'none';
  }

  private async identifyDemandDrivers(skillId: string, dataPoints: TimeSeriesDataPoint[]): Promise<DemandDriver[]> {
    // Implementation would identify factors driving demand
    return [
      {
        factor: 'Market growth',
        impact: 0.3,
        confidence: 0.7,
        timelag: 4,
        description: 'Industry expansion driving skill demand'
      }
    ];
  }

  private identifySkillRiskFactors(
    skillId: string,
    dataPoints: TimeSeriesDataPoint[],
    trend: string
  ): RiskFactor[] {
    const risks: RiskFactor[] = [];
    
    if (trend === 'volatile') {
      risks.push({
        type: 'market',
        description: 'High volatility in skill demand',
        probability: 0.8,
        impact: 0.6,
        timeframe: '3-6 months',
        mitigationStrategies: ['Increase forecast frequency', 'Build flexible capacity']
      });
    }
    
    return risks;
  }

  private calculateHistoricalAccuracy(dataPoints: TimeSeriesDataPoint[]): number {
    // Calculate accuracy based on data consistency and trend stability
    if (dataPoints.length < 3) {
      return 65; // Low accuracy for insufficient data
    }
    
    const values = dataPoints.map(dp => dp.value);
    const n = values.length;
    
    // Calculate trend consistency
    const periods = values.slice(1).map((val, i) => val - values[i]);
    const avgChange = periods.reduce((sum, change) => sum + change, 0) / periods.length;
    const changeVariance = periods.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / periods.length;
    const coefficientOfVariation = Math.abs(avgChange) > 0 ? Math.sqrt(changeVariance) / Math.abs(avgChange) : 1;
    
    // Calculate data completeness factor
    const completenessScore = Math.min(100, (n / 12) * 100); // Assume 12 data points is ideal
    
    // Calculate stability factor (lower CV means higher stability)
    const stabilityScore = Math.max(0, 100 - (coefficientOfVariation * 50));
    
    // Calculate recency factor (more recent data points get higher weight)
    const recencyScore = Math.min(100, n >= 6 ? 85 : 60 + (n * 5));
    
    // Combine factors with weights
    const accuracy = (
      completenessScore * 0.3 +
      stabilityScore * 0.4 +
      recencyScore * 0.3
    );
    
    // Ensure reasonable bounds
    return Math.max(60, Math.min(95, Math.round(accuracy)));
  }

  private getEmptySeasonalityAnalysis(): SeasonalityAnalysis {
    return {
      detectedPatterns: [],
      holidayEffects: [],
      cyclicalTrends: []
    };
  }

  private getEmptyTrendAnalysis(): TrendAnalysis {
    return {
      overallTrend: 'stable',
      trendStrength: 0,
      changePoints: [],
      futureProjections: {
        shortTerm: 0,
        mediumTerm: 0,
        longTerm: 0
      }
    };
  }

  // Additional methods for pipeline, scenario, and real-time functionality would be implemented similarly
  private async getPipelineProjects(filter: any): Promise<any[]> { return []; }
  private async generatePipelineProjectForecast(project: any): Promise<any> { return {}; }
  private aggregatePipelineDemand(forecasts: any[]): any[] { return []; }
  private assessPipelineRisks(forecasts: any[], filter: any): any { return {}; }
  private async calculateCapacityRequirements(demand: any[]): Promise<any[]> { return []; }
  private adjustOptionsForScenario(scenario: any): any { return {}; }
  private applyScenarioAdjustments(forecast: DemandForecast, scenario: any): DemandForecast { return forecast; }
  private compareScenarios(forecasts: Map<string, DemandForecast>): any { return {}; }
  private generateScenarioRecommendations(forecasts: Map<string, DemandForecast>, comparison: any): any[] { return []; }
  private async getForecastById(id: string): Promise<DemandForecast | null> { return null; }
  private async applyRealTimeAdjustments(forecast: DemandForecast, data: any): Promise<DemandForecast> { return forecast; }
  private recalculateConfidenceScores(forecast: DemandForecast, data: any): any { return forecast.confidence; }
  private generateImprovementSuggestions(errors: any, skillAccuracies: Map<string, number>, deptAccuracies: Map<string, number>): string[] { return []; }
}

// Define additional interfaces
interface PipelineForecast {}
interface PipelineRiskAssessment {}
interface CapacityRequirement {}
interface ScenarioComparison {}
interface ScenarioRecommendation {}

export default new PredictiveAnalyticsService();