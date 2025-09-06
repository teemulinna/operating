// Resource Forecasting Service with Demand vs Capacity Analysis
import { Pool } from 'pg';
import {
  ResourceDemandForecast,
  ResourceAnalytics,
  UtilizationTrend,
  CapacityForecast,
  SkillDemandAnalysis,
  HiringRecommendation,
  CostAnalysis,
  RiskAssessment,
  RiskFactor,
  MitigationStrategy
} from '../types/scenario';

interface ForecastingFilters {
  startDate?: string;
  endDate?: string;
  skillCategories?: string[];
  positionLevels?: string[];
  scenarios?: string[];
}

interface PredictionParameters {
  growthRate: number;
  seasonality: boolean;
  marketTrends: Record<string, number>;
  budgetConstraints?: number;
  hiringTimeline?: number; // days
}

export class ResourceForecastingService {
  constructor(private db: Pool) {}

  // Core Forecasting Methods
  async generateDemandForecast(
    scenarioId: string,
    parameters: PredictionParameters
  ): Promise<ResourceDemandForecast[]> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Clear existing forecast data for this scenario
      await client.query('DELETE FROM resource_demand_forecast WHERE scenario_id = $1', [scenarioId]);

      // Get base demand data from scenario allocations
      const baseDemandQuery = `
        WITH allocation_skills AS (
          SELECT 
            sa.scenario_id,
            UNNEST(pr.required_skills) as skill_category,
            pr.minimum_experience_level as position_level,
            sa.start_date,
            sa.end_date,
            sa.allocation_percentage * COALESCE(sa.estimated_hours, 160) / 100 as demand_hours,
            sa.hourly_rate
          FROM scenario_allocations sa
          JOIN project_roles pr ON sa.role_id = pr.id
          WHERE sa.scenario_id = $1
        ),
        monthly_demand AS (
          SELECT 
            skill_category,
            position_level,
            generate_series(
              date_trunc('month', start_date),
              date_trunc('month', COALESCE(end_date, start_date + interval '3 months')),
              interval '1 month'
            )::date as forecast_date,
            SUM(demand_hours) as base_demand_hours
          FROM allocation_skills
          GROUP BY skill_category, position_level, forecast_date
        )
        SELECT * FROM monthly_demand
        ORDER BY skill_category, position_level, forecast_date
      `;

      const baseDemandResult = await client.query(baseDemandQuery, [scenarioId]);

      // Get current supply data
      const supplyQuery = `
        SELECT 
          UNNEST(e.skills) as skill_category,
          e.experience_level as position_level,
          COUNT(*) as available_employees,
          AVG(e.hourly_rate) as avg_hourly_rate,
          SUM(160) as supply_hours -- 160 hours per month per employee
        FROM employees e
        WHERE e.is_active = true
        GROUP BY skill_category, e.experience_level
      `;

      const supplyResult = await client.query(supplyQuery);
      const supplyMap = new Map();
      
      supplyResult.rows.forEach(row => {
        const key = `${row.skill_category}-${row.position_level}`;
        supplyMap.set(key, {
          availableEmployees: parseInt(row.available_employees),
          avgHourlyRate: parseFloat(row.avg_hourly_rate) || 0,
          supplyHours: parseInt(row.supply_hours)
        });
      });

      // Generate forecasts with growth and trend adjustments
      const forecasts: ResourceDemandForecast[] = [];

      for (const demand of baseDemandResult.rows) {
        const key = `${demand.skill_category}-${demand.position_level}`;
        const supply = supplyMap.get(key) || { 
          availableEmployees: 0, 
          avgHourlyRate: 75, 
          supplyHours: 0 
        };

        // Apply growth rate and market trends
        const marketTrend = parameters.marketTrends[demand.skill_category] || 1.0;
        const adjustedDemand = Math.round(
          demand.base_demand_hours * (1 + parameters.growthRate) * marketTrend
        );

        // Apply seasonality if enabled
        const seasonalityFactor = parameters.seasonality ? 
          this.calculateSeasonality(demand.forecast_date) : 1.0;
        
        const finalDemand = Math.round(adjustedDemand * seasonalityFactor);
        const gap = finalDemand - supply.supplyHours;
        const hiringRecommendation = gap > 0 ? Math.ceil(gap / 160) : 0; // 160 hours per month

        const forecast: ResourceDemandForecast = {
          id: '', // Will be set after insertion
          scenarioId,
          skillCategory: demand.skill_category,
          positionLevel: demand.position_level,
          forecastDate: demand.forecast_date,
          demandHours: finalDemand,
          supplyHours: supply.supplyHours,
          gapHours: gap,
          utilizationRate: supply.supplyHours > 0 ? 
            Math.min(100, (finalDemand / supply.supplyHours) * 100) : 0,
          hiringRecommendation,
          staffingStatus: gap > 0 ? 'understaffed' : gap < 0 ? 'overstaffed' : 'balanced',
          createdAt: new Date().toISOString()
        };

        forecasts.push(forecast);

        // Insert into database
        const insertQuery = `
          INSERT INTO resource_demand_forecast (
            scenario_id, skill_category, position_level, forecast_date,
            demand_hours, supply_hours, hiring_recommendation
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `;

        const insertResult = await client.query(insertQuery, [
          scenarioId,
          demand.skill_category,
          demand.position_level,
          demand.forecast_date,
          finalDemand,
          supply.supplyHours,
          hiringRecommendation
        ]);

        forecast.id = insertResult.rows[0].id;
      }

      await client.query('COMMIT');
      return forecasts;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getForecastData(
    scenarioId: string,
    filters: ForecastingFilters = {}
  ): Promise<ResourceDemandForecast[]> {
    let whereConditions = ['scenario_id = $1'];
    let values: any[] = [scenarioId];
    let paramIndex = 2;

    if (filters.startDate) {
      whereConditions.push(`forecast_date >= $${paramIndex++}`);
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      whereConditions.push(`forecast_date <= $${paramIndex++}`);
      values.push(filters.endDate);
    }

    if (filters.skillCategories && filters.skillCategories.length > 0) {
      whereConditions.push(`skill_category = ANY($${paramIndex++})`);
      values.push(filters.skillCategories);
    }

    if (filters.positionLevels && filters.positionLevels.length > 0) {
      whereConditions.push(`position_level = ANY($${paramIndex++})`);
      values.push(filters.positionLevels);
    }

    const query = `
      SELECT * FROM resource_utilization_forecast
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY forecast_date ASC, skill_category ASC, position_level ASC
    `;

    const result = await this.db.query(query, values);
    return result.rows.map(row => this.transformResourceDemandForecast(row));
  }

  async generateResourceAnalytics(
    scenarioIds: string[],
    timeRange: { start: string; end: string }
  ): Promise<ResourceAnalytics> {
    const [
      utilizationTrends,
      capacityForecasts,
      skillDemandAnalysis,
      hiringRecommendations,
      costAnalysis,
      riskAssessment
    ] = await Promise.all([
      this.getUtilizationTrends(scenarioIds, timeRange),
      this.getCapacityForecasts(scenarioIds, timeRange),
      this.getSkillDemandAnalysis(scenarioIds, timeRange),
      this.getHiringRecommendations(scenarioIds, timeRange),
      this.getCostAnalysis(scenarioIds, timeRange),
      this.getRiskAssessment(scenarioIds, timeRange)
    ]);

    return {
      utilizationTrends,
      capacityForecast: capacityForecasts,
      skillDemandAnalysis,
      hiringRecommendations,
      costAnalysis,
      riskAssessment
    };
  }

  async predictFutureHiring(
    scenarioId: string,
    timeHorizonMonths: number = 12,
    budgetConstraint?: number
  ): Promise<HiringRecommendation[]> {
    const query = `
      WITH hiring_analysis AS (
        SELECT 
          rdf.skill_category,
          rdf.position_level,
          SUM(rdf.gap_hours) as total_gap_hours,
          AVG(rdf.gap_hours) as avg_monthly_gap,
          MAX(rdf.gap_hours) as peak_gap_hours,
          COUNT(*) as months_with_gap,
          AVG(CASE WHEN rdf.gap_hours > 0 THEN rdf.gap_hours END) as avg_gap_when_present
        FROM resource_demand_forecast rdf
        WHERE rdf.scenario_id = $1
          AND rdf.forecast_date <= (CURRENT_DATE + interval '%d months')
          AND rdf.gap_hours > 0
        GROUP BY rdf.skill_category, rdf.position_level
      ),
      market_data AS (
        SELECT 
          skill_category,
          position_level,
          AVG(hourly_rate) as market_rate,
          45 as avg_time_to_fill_days -- Industry average
        FROM employees
        WHERE is_active = true
        GROUP BY skill_category, position_level
      )
      SELECT 
        ha.*,
        md.market_rate,
        md.avg_time_to_fill_days,
        CEIL(ha.total_gap_hours / 160.0) as recommended_hires, -- 160 hours per month
        CASE 
          WHEN ha.avg_monthly_gap > 320 THEN 'immediate'
          WHEN ha.avg_monthly_gap > 160 THEN 'within-month'
          WHEN ha.avg_monthly_gap > 80 THEN 'within-quarter'
          ELSE 'planned'
        END as urgency,
        CEIL(ha.total_gap_hours / 160.0) * md.market_rate * 160 as estimated_monthly_cost
      FROM hiring_analysis ha
      LEFT JOIN market_data md ON (
        ha.skill_category = md.skill_category 
        AND ha.position_level = md.position_level
      )
      ORDER BY ha.total_gap_hours DESC
    `;

    const result = await this.db.query(query.replace('%d', timeHorizonMonths.toString()), [scenarioId]);

    return result.rows.map(row => ({
      skillCategory: row.skill_category,
      positionLevel: row.position_level,
      recommendedHires: parseInt(row.recommended_hires),
      urgency: row.urgency,
      estimatedCost: parseFloat(row.estimated_monthly_cost) || 0,
      timeToFill: parseInt(row.avg_time_to_fill_days) || 45,
      alternatives: this.generateHiringAlternatives(row.skill_category, row.position_level),
      justification: this.generateHiringJustification(row)
    }));
  }

  async analyzeCapacityVsDemand(
    scenarioIds: string[],
    filters: ForecastingFilters = {}
  ): Promise<{
    summary: {
      totalDemandHours: number;
      totalSupplyHours: number;
      overallUtilization: number;
      criticalGaps: number;
      surplusCapacity: number;
    };
    bySkill: Array<{
      skillCategory: string;
      positionLevel: string;
      demandHours: number;
      supplyHours: number;
      utilizationRate: number;
      status: 'critical' | 'high' | 'medium' | 'balanced' | 'surplus';
      trend: 'increasing' | 'stable' | 'decreasing';
    }>;
    timeline: Array<{
      date: string;
      totalDemand: number;
      totalSupply: number;
      utilizationRate: number;
      criticalSkills: string[];
    }>;
  }> {
    let whereConditions = ['rdf.scenario_id = ANY($1)'];
    let values: any[] = [scenarioIds];
    let paramIndex = 2;

    if (filters.startDate) {
      whereConditions.push(`rdf.forecast_date >= $${paramIndex++}`);
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      whereConditions.push(`rdf.forecast_date <= $${paramIndex++}`);
      values.push(filters.endDate);
    }

    // Summary query
    const summaryQuery = `
      SELECT 
        SUM(rdf.demand_hours) as total_demand_hours,
        SUM(rdf.supply_hours) as total_supply_hours,
        AVG(rdf.utilization_rate) as overall_utilization,
        COUNT(CASE WHEN rdf.gap_hours > 320 THEN 1 END) as critical_gaps,
        SUM(CASE WHEN rdf.gap_hours < -160 THEN ABS(rdf.gap_hours) ELSE 0 END) as surplus_capacity
      FROM resource_demand_forecast rdf
      WHERE ${whereConditions.join(' AND ')}
    `;

    // By skill query
    const bySkillQuery = `
      WITH skill_analysis AS (
        SELECT 
          rdf.skill_category,
          rdf.position_level,
          SUM(rdf.demand_hours) as demand_hours,
          SUM(rdf.supply_hours) as supply_hours,
          AVG(rdf.utilization_rate) as utilization_rate,
          AVG(rdf.gap_hours) as avg_gap,
          COUNT(*) as data_points,
          -- Simple trend calculation (could be more sophisticated)
          CASE 
            WHEN (
              SUM(CASE WHEN rdf.forecast_date > CURRENT_DATE + interval '3 months' THEN rdf.gap_hours END) /
              GREATEST(COUNT(CASE WHEN rdf.forecast_date > CURRENT_DATE + interval '3 months' THEN 1 END), 1)
            ) > (
              SUM(CASE WHEN rdf.forecast_date <= CURRENT_DATE + interval '3 months' THEN rdf.gap_hours END) /
              GREATEST(COUNT(CASE WHEN rdf.forecast_date <= CURRENT_DATE + interval '3 months' THEN 1 END), 1)
            ) THEN 'increasing'
            WHEN (
              SUM(CASE WHEN rdf.forecast_date > CURRENT_DATE + interval '3 months' THEN rdf.gap_hours END) /
              GREATEST(COUNT(CASE WHEN rdf.forecast_date > CURRENT_DATE + interval '3 months' THEN 1 END), 1)
            ) < (
              SUM(CASE WHEN rdf.forecast_date <= CURRENT_DATE + interval '3 months' THEN rdf.gap_hours END) /
              GREATEST(COUNT(CASE WHEN rdf.forecast_date <= CURRENT_DATE + interval '3 months' THEN 1 END), 1)
            ) THEN 'decreasing'
            ELSE 'stable'
          END as trend
        FROM resource_demand_forecast rdf
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY rdf.skill_category, rdf.position_level
      )
      SELECT 
        *,
        CASE 
          WHEN avg_gap > 320 THEN 'critical'
          WHEN avg_gap > 160 THEN 'high'
          WHEN avg_gap > 80 THEN 'medium'
          WHEN avg_gap > -80 THEN 'balanced'
          ELSE 'surplus'
        END as status
      FROM skill_analysis
      ORDER BY avg_gap DESC
    `;

    // Timeline query
    const timelineQuery = `
      SELECT 
        rdf.forecast_date::text as date,
        SUM(rdf.demand_hours) as total_demand,
        SUM(rdf.supply_hours) as total_supply,
        AVG(rdf.utilization_rate) as utilization_rate,
        array_agg(
          CASE WHEN rdf.gap_hours > 160 
          THEN rdf.skill_category || ' (' || rdf.position_level || ')' 
          END
        ) FILTER (WHERE rdf.gap_hours > 160) as critical_skills
      FROM resource_demand_forecast rdf
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY rdf.forecast_date
      ORDER BY rdf.forecast_date ASC
    `;

    const [summaryResult, bySkillResult, timelineResult] = await Promise.all([
      this.db.query(summaryQuery, values),
      this.db.query(bySkillQuery, values),
      this.db.query(timelineQuery, values)
    ]);

    return {
      summary: {
        totalDemandHours: parseInt(summaryResult.rows[0].total_demand_hours) || 0,
        totalSupplyHours: parseInt(summaryResult.rows[0].total_supply_hours) || 0,
        overallUtilization: parseFloat(summaryResult.rows[0].overall_utilization) || 0,
        criticalGaps: parseInt(summaryResult.rows[0].critical_gaps) || 0,
        surplusCapacity: parseInt(summaryResult.rows[0].surplus_capacity) || 0
      },
      bySkill: bySkillResult.rows.map(row => ({
        skillCategory: row.skill_category,
        positionLevel: row.position_level,
        demandHours: parseInt(row.demand_hours),
        supplyHours: parseInt(row.supply_hours),
        utilizationRate: parseFloat(row.utilization_rate),
        status: row.status,
        trend: row.trend
      })),
      timeline: timelineResult.rows.map(row => ({
        date: row.date,
        totalDemand: parseInt(row.total_demand),
        totalSupply: parseInt(row.total_supply),
        utilizationRate: parseFloat(row.utilization_rate),
        criticalSkills: row.critical_skills || []
      }))
    };
  }

  // Private helper methods
  private calculateSeasonality(date: string): number {
    const month = new Date(date).getMonth();
    // Simple seasonality model - can be made more sophisticated
    const seasonalityFactors = [
      0.9,  // January
      0.95, // February
      1.0,  // March
      1.05, // April
      1.1,  // May
      1.0,  // June
      0.9,  // July (vacation time)
      0.85, // August (vacation time)
      1.1,  // September
      1.15, // October
      1.1,  // November
      0.8   // December (holidays)
    ];
    return seasonalityFactors[month];
  }

  private generateHiringAlternatives(skillCategory: string, positionLevel: string): string[] {
    const alternatives = [
      'Contract/freelance resources',
      'Upskill existing team members',
      'Partner with external agencies',
      'Offshore development teams',
      'Cross-training from adjacent skills'
    ];

    // Add specific alternatives based on skill category
    if (skillCategory.toLowerCase().includes('dev') || skillCategory.toLowerCase().includes('engineer')) {
      alternatives.push('Junior developers with mentorship program');
      alternatives.push('Bootcamp graduates with training period');
    }

    return alternatives.slice(0, 3); // Return top 3 alternatives
  }

  private generateHiringJustification(row: any): string {
    const gapHours = row.total_gap_hours;
    const monthsWithGap = row.months_with_gap;
    const avgGap = row.avg_monthly_gap;

    if (gapHours > 1000) {
      return `Critical staffing gap of ${Math.round(gapHours)} hours over ${monthsWithGap} months. This represents ${Math.ceil(gapHours/160)} full-time positions needed to meet project demands.`;
    } else if (gapHours > 500) {
      return `Significant staffing shortfall of ${Math.round(avgGap)} hours per month on average. Consider hiring ${Math.ceil(gapHours/160)} additional team members.`;
    } else {
      return `Moderate staffing gap that could be addressed through contract resources or overtime allocation.`;
    }
  }

  private async getUtilizationTrends(
    scenarioIds: string[],
    timeRange: { start: string; end: string }
  ): Promise<UtilizationTrend[]> {
    const query = `
      SELECT 
        rdf.forecast_date::text as date,
        AVG(rdf.utilization_rate) as average_utilization,
        MAX(rdf.utilization_rate) as max_utilization,
        MIN(rdf.utilization_rate) as min_utilization,
        COUNT(DISTINCT rdf.skill_category || rdf.position_level) as employee_count,
        SUM(rdf.supply_hours) as total_capacity_hours,
        SUM(rdf.demand_hours) as total_demand_hours
      FROM resource_demand_forecast rdf
      WHERE rdf.scenario_id = ANY($1)
        AND rdf.forecast_date BETWEEN $2 AND $3
      GROUP BY rdf.forecast_date
      ORDER BY rdf.forecast_date ASC
    `;

    const result = await this.db.query(query, [scenarioIds, timeRange.start, timeRange.end]);
    return result.rows.map(row => ({
      date: row.date,
      averageUtilization: parseFloat(row.average_utilization) || 0,
      maxUtilization: parseFloat(row.max_utilization) || 0,
      minUtilization: parseFloat(row.min_utilization) || 0,
      employeeCount: parseInt(row.employee_count) || 0,
      totalCapacityHours: parseInt(row.total_capacity_hours) || 0,
      totalDemandHours: parseInt(row.total_demand_hours) || 0
    }));
  }

  private async getCapacityForecasts(
    scenarioIds: string[],
    timeRange: { start: string; end: string }
  ): Promise<CapacityForecast[]> {
    const query = `
      SELECT 
        rdf.forecast_date::text as date,
        rdf.skill_category,
        rdf.position_level,
        rdf.supply_hours as current_capacity,
        rdf.demand_hours as projected_demand,
        rdf.gap_hours as gap,
        CASE 
          WHEN rdf.supply_hours > 0 THEN 
            1.0 - (ABS(rdf.gap_hours)::float / rdf.supply_hours)
          ELSE 0.0
        END as confidence,
        ARRAY['Historical trends', 'Market analysis', 'Project pipeline'] as assumptions
      FROM resource_demand_forecast rdf
      WHERE rdf.scenario_id = ANY($1)
        AND rdf.forecast_date BETWEEN $2 AND $3
      ORDER BY rdf.forecast_date ASC, rdf.skill_category ASC
    `;

    const result = await this.db.query(query, [scenarioIds, timeRange.start, timeRange.end]);
    return result.rows.map(row => ({
      date: row.date,
      skillCategory: row.skill_category,
      positionLevel: row.position_level,
      currentCapacity: parseInt(row.current_capacity) || 0,
      projectedDemand: parseInt(row.projected_demand) || 0,
      gap: parseInt(row.gap) || 0,
      confidence: Math.max(0, Math.min(1, parseFloat(row.confidence) || 0)),
      assumptions: row.assumptions || []
    }));
  }

  private async getSkillDemandAnalysis(
    scenarioIds: string[],
    timeRange: { start: string; end: string }
  ): Promise<SkillDemandAnalysis[]> {
    // Simplified implementation
    return [];
  }

  private async getHiringRecommendations(
    scenarioIds: string[],
    timeRange: { start: string; end: string }
  ): Promise<HiringRecommendation[]> {
    const recommendations: HiringRecommendation[] = [];
    
    for (const scenarioId of scenarioIds) {
      const scenarioRecommendations = await this.predictFutureHiring(scenarioId, 12);
      recommendations.push(...scenarioRecommendations);
    }

    return recommendations;
  }

  private async getCostAnalysis(
    scenarioIds: string[],
    timeRange: { start: string; end: string }
  ): Promise<CostAnalysis> {
    // Simplified implementation
    return {
      totalProjectedCost: 0,
      costByCategory: [],
      costTrends: [],
      savings: {
        potential: 0,
        realized: 0,
        opportunities: []
      }
    };
  }

  private async getRiskAssessment(
    scenarioIds: string[],
    timeRange: { start: string; end: string }
  ): Promise<RiskAssessment> {
    // Simplified implementation
    return {
      overallRiskScore: 0,
      riskFactors: [],
      mitigationStrategies: []
    };
  }

  private transformResourceDemandForecast(row: any): ResourceDemandForecast {
    return {
      id: row.id,
      scenarioId: row.scenario_id,
      skillCategory: row.skill_category,
      positionLevel: row.position_level,
      forecastDate: row.forecast_date,
      demandHours: parseInt(row.demand_hours),
      supplyHours: parseInt(row.supply_hours),
      gapHours: parseInt(row.gap_hours),
      utilizationRate: parseFloat(row.utilization_rate),
      hiringRecommendation: parseInt(row.hiring_recommendation),
      staffingStatus: row.staffing_status,
      createdAt: row.created_at
    };
  }
}